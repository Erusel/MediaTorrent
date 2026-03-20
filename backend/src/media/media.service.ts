import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { MediaItem, MediaStatus, MediaType } from './media.entity';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaItem) private mediaRepo: Repository<MediaItem>,
  ) {}

  async create(data: Partial<MediaItem>): Promise<MediaItem> {
    const item = this.mediaRepo.create(data);
    return this.mediaRepo.save(item);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    mediaType?: MediaType;
    status?: MediaStatus;
  }): Promise<{ items: MediaItem[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.search) where.title = Like(`%${query.search}%`);
    if (query.mediaType) where.mediaType = query.mediaType;
    if (query.status) where.status = query.status;

    const [items, total] = await this.mediaRepo.findAndCount({
      where,
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { items, total };
  }

  async findById(id: string): Promise<MediaItem | null> {
    return this.mediaRepo.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });
  }

  async update(id: string, data: Partial<MediaItem>): Promise<MediaItem> {
    await this.mediaRepo.update(id, data);
    return this.mediaRepo.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    const item = await this.mediaRepo.findOne({ where: { id } });
    if (item?.filePath) {
      try {
        const stat = fs.statSync(item.filePath);
        if (stat.isDirectory()) {
          fs.rmSync(item.filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(item.filePath);
        }
      } catch {
        // File may already be removed
      }
    }
    await this.mediaRepo.delete(id);
  }

  async findByTorrentHash(hash: string): Promise<MediaItem | null> {
    return this.mediaRepo.findOne({ where: { torrentHash: hash } });
  }

  organizeFile(
    sourcePath: string,
    title: string,
    mediaType: MediaType,
    year?: number,
    season?: number,
    episode?: number,
  ): string {
    const ext = path.extname(sourcePath);
    let destDir: string;
    let destFile: string;

    if (mediaType === MediaType.MOVIE) {
      const folderName = year ? `${title} (${year})` : title;
      destDir = path.join(process.env.MOVIES_PATH || '/media/movies', folderName);
      destFile = `${folderName}${ext}`;
    } else {
      const seasonStr = `Season ${String(season || 1).padStart(2, '0')}`;
      const epStr = episode
        ? `S${String(season || 1).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : '';
      destDir = path.join(
        process.env.TV_PATH || '/media/tv',
        title,
        seasonStr,
      );
      destFile = `${title} - ${epStr}${ext}`;
    }

    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, destFile);
    fs.copyFileSync(sourcePath, destPath);

    try {
      fs.unlinkSync(sourcePath);
    } catch {
      // Source cleanup is best-effort
    }

    return destPath;
  }

  async refreshJellyfin(): Promise<void> {
    const jellyfinUrl = process.env.JELLYFIN_URL || 'http://host.docker.internal:8096';
    const apiKey = process.env.JELLYFIN_API_KEY;
    if (!apiKey) return;

    try {
      const response = await fetch(
        `${jellyfinUrl}/Library/Refresh?api_key=${apiKey}`,
        { method: 'POST' },
      );
      if (!response.ok) {
        console.error('Failed to refresh Jellyfin library:', response.statusText);
      }
    } catch (err) {
      console.error('Jellyfin refresh error:', err);
    }
  }
}
