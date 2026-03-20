import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { MediaService } from '../media/media.service';
import { MediaType, UploadType, MediaStatus } from '../media/media.entity';
import { UsersService } from '../users/users.service';
import { ActivityService } from '../activity/activity.service';
import { EventsGateway } from '../websocket/events.gateway';
import { TmdbService } from './tmdb.service';

@Injectable()
export class TorrentsService {
  private qbtCookie: string | null = null;
  private readonly qbtHost: string;
  private readonly qbtPort: string;

  constructor(
    private mediaService: MediaService,
    private usersService: UsersService,
    private activityService: ActivityService,
    private eventsGateway: EventsGateway,
    private tmdbService: TmdbService,
  ) {
    this.qbtHost = process.env.QBITTORRENT_HOST || 'qbittorrent';
    this.qbtPort = process.env.QBITTORRENT_PORT || '8080';
  }

  private get baseUrl(): string {
    return `http://${this.qbtHost}:${this.qbtPort}/api/v2`;
  }

  private async authenticate(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(process.env.QBITTORRENT_USERNAME || 'admin')}&password=${encodeURIComponent(process.env.QBITTORRENT_PASSWORD || 'adminpassword')}`,
    });

    const cookie = res.headers.get('set-cookie');
    if (cookie) {
      this.qbtCookie = cookie.split(';')[0];
    }
  }

  private async qbtFetch(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    if (!this.qbtCookie) await this.authenticate();

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        Cookie: this.qbtCookie || '',
      },
    });

    if (res.status === 403) {
      await this.authenticate();
      return fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...((options.headers as Record<string, string>) || {}),
          Cookie: this.qbtCookie || '',
        },
      });
    }

    return res;
  }

  async addMagnet(
    magnetLink: string,
    userId: string,
    metadata?: { title?: string; mediaType?: MediaType; tmdbId?: number },
  ): Promise<any> {
    const body = new URLSearchParams();
    body.append('urls', magnetLink);
    body.append('savepath', process.env.DOWNLOADS_PATH || '/downloads');

    const res = await this.qbtFetch('/torrents/add', {
      method: 'POST',
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) throw new Error('Failed to add magnet to qBittorrent');

    // Extract hash from magnet
    const hashMatch = magnetLink.match(/btih:([a-fA-F0-9]{40})/i) ||
      magnetLink.match(/btih:([a-fA-F0-9]{32})/i);
    const hash = hashMatch ? hashMatch[1].toLowerCase() : null;

    const mediaItem = await this.mediaService.create({
      title: metadata?.title || 'Unknown',
      mediaType: metadata?.mediaType || MediaType.MOVIE,
      uploadType: UploadType.TORRENT,
      status: MediaStatus.DOWNLOADING,
      torrentHash: hash,
      uploadedById: userId,
      tmdbId: metadata?.tmdbId,
    });

    await this.activityService.log(userId, 'torrent_added', {
      mediaId: mediaItem.id,
      title: mediaItem.title,
      type: 'magnet',
    });

    return mediaItem;
  }

  async addTorrentFile(
    fileBuffer: Buffer,
    filename: string,
    userId: string,
    metadata?: { title?: string; mediaType?: MediaType; tmdbId?: number },
  ): Promise<any> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append('torrents', blob, filename);
    formData.append('savepath', process.env.DOWNLOADS_PATH || '/downloads');

    const res = await this.qbtFetch('/torrents/add', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Failed to add torrent file to qBittorrent');

    const parsed = this.tmdbService.parseFilename(filename);

    const mediaItem = await this.mediaService.create({
      title: metadata?.title || parsed.title || 'Unknown',
      originalFilename: filename,
      mediaType: metadata?.mediaType || (parsed.season ? MediaType.TV_SERIES : MediaType.MOVIE),
      uploadType: UploadType.TORRENT,
      status: MediaStatus.DOWNLOADING,
      uploadedById: userId,
      tmdbId: metadata?.tmdbId,
      year: parsed.year,
      season: parsed.season,
      episode: parsed.episode,
    });

    await this.activityService.log(userId, 'torrent_added', {
      mediaId: mediaItem.id,
      title: mediaItem.title,
      type: 'file',
    });

    return mediaItem;
  }

  async getTorrents(): Promise<any[]> {
    const res = await this.qbtFetch('/torrents/info');
    if (!res.ok) return [];
    return res.json();
  }

  async deleteTorrent(hash: string, deleteFiles = false): Promise<void> {
    await this.qbtFetch(
      `/torrents/delete?hashes=${hash}&deleteFiles=${deleteFiles}`,
      { method: 'POST' },
    );
  }

  async pauseTorrent(hash: string): Promise<void> {
    await this.qbtFetch(`/torrents/pause?hashes=${hash}`, { method: 'POST' });
  }

  async resumeTorrent(hash: string): Promise<void> {
    await this.qbtFetch(`/torrents/resume?hashes=${hash}`, { method: 'POST' });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollTorrents() {
    try {
      const torrents = await this.getTorrents();

      for (const torrent of torrents) {
        const hash = torrent.hash?.toLowerCase();
        if (!hash) continue;

        const mediaItem = await this.mediaService.findByTorrentHash(hash);
        if (!mediaItem) continue;

        const progress = Math.round(torrent.progress * 100);

        // Broadcast progress via WebSocket
        this.eventsGateway.broadcastTorrentProgress(mediaItem.id, {
          progress,
          downloadSpeed: torrent.dlspeed,
          uploadSpeed: torrent.upspeed,
          eta: torrent.eta,
          state: torrent.state,
        });

        if (mediaItem.status === MediaStatus.DOWNLOADING) {
          await this.mediaService.update(mediaItem.id, {
            downloadProgress: progress,
          });
        }

        // Completed
        if (torrent.progress >= 1 && mediaItem.status === MediaStatus.DOWNLOADING) {
          await this.processCompletedTorrent(mediaItem, torrent);
        }
      }
    } catch (err) {
      // qBittorrent may not be ready yet
    }
  }

  private async processCompletedTorrent(mediaItem: any, torrent: any) {
    try {
      await this.mediaService.update(mediaItem.id, {
        status: MediaStatus.PROCESSING,
      });

      const downloadPath = torrent.content_path || torrent.save_path;
      const videoExtensions = (process.env.ALLOWED_VIDEO_EXTENSIONS || '.mp4,.mkv,.avi').split(',');

      let videoFile: string | null = null;
      let fileSize = 0;

      const stat = fs.statSync(downloadPath);
      if (stat.isDirectory()) {
        const files = this.findVideoFiles(downloadPath, videoExtensions);
        if (files.length > 0) {
          videoFile = files[0];
          fileSize = fs.statSync(videoFile).size;
        }
      } else {
        videoFile = downloadPath;
        fileSize = stat.size;
      }

      if (!videoFile) {
        await this.mediaService.update(mediaItem.id, {
          status: MediaStatus.ERROR,
        });
        return;
      }

      // Try to fetch TMDB metadata
      let tmdbData = null;
      if (mediaItem.tmdbId) {
        const type = mediaItem.mediaType === MediaType.TV_SERIES ? 'tv' : 'movie';
        tmdbData = await this.tmdbService.getDetails(mediaItem.tmdbId, type);
      } else {
        const results = await this.tmdbService.search(mediaItem.title);
        if (results.length > 0) {
          tmdbData = results[0];
        }
      }

      const title = tmdbData?.title || mediaItem.title;
      const year = tmdbData?.year || mediaItem.year;

      const destPath = this.mediaService.organizeFile(
        videoFile,
        title,
        mediaItem.mediaType,
        year,
        mediaItem.season,
        mediaItem.episode,
      );

      await this.mediaService.update(mediaItem.id, {
        status: MediaStatus.READY,
        filePath: destPath,
        fileSize,
        title,
        year,
        posterUrl: tmdbData?.posterPath || undefined,
        overview: tmdbData?.overview || undefined,
        tmdbId: tmdbData?.id || undefined,
        downloadProgress: 100,
      });

      if (mediaItem.uploadedById) {
        await this.usersService.incrementStats(mediaItem.uploadedById, fileSize);
      }

      await this.activityService.log(
        mediaItem.uploadedById,
        'torrent_completed',
        { mediaId: mediaItem.id, title, destPath },
      );

      this.eventsGateway.broadcastNotification(
        mediaItem.uploadedById,
        `Download complete: ${title}`,
      );

      await this.mediaService.refreshJellyfin();
    } catch (err) {
      console.error('Error processing completed torrent:', err);
      await this.mediaService.update(mediaItem.id, {
        status: MediaStatus.ERROR,
      });
    }
  }

  private findVideoFiles(dir: string, extensions: string[]): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.findVideoFiles(fullPath, extensions));
        } else if (extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
    return results.sort((a, b) => {
      try {
        return fs.statSync(b).size - fs.statSync(a).size;
      } catch {
        return 0;
      }
    });
  }
}
