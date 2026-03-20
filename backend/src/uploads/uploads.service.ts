import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { MediaService } from '../media/media.service';
import { MediaType, UploadType, MediaStatus } from '../media/media.entity';
import { UsersService } from '../users/users.service';
import { ActivityService } from '../activity/activity.service';
import { EventsGateway } from '../websocket/events.gateway';
import { TmdbService } from '../torrents/tmdb.service';

interface ChunkedUpload {
  uploadId: string;
  userId: string;
  filename: string;
  totalChunks: number;
  receivedChunks: Set<number>;
  tempDir: string;
  totalSize: number;
  title?: string;
  mediaType?: MediaType;
  tmdbId?: number;
}

@Injectable()
export class UploadsService {
  private activeUploads = new Map<string, ChunkedUpload>();

  private readonly allowedVideoExt: string[];
  private readonly allowedSubtitleExt: string[];
  private readonly maxFileSizeBytes: number;

  constructor(
    private mediaService: MediaService,
    private usersService: UsersService,
    private activityService: ActivityService,
    private eventsGateway: EventsGateway,
    private tmdbService: TmdbService,
  ) {
    this.allowedVideoExt = (
      process.env.ALLOWED_VIDEO_EXTENSIONS ||
      '.mp4,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts'
    ).split(',');
    this.allowedSubtitleExt = (
      process.env.ALLOWED_SUBTITLE_EXTENSIONS || '.srt,.sub,.ass,.ssa,.vtt'
    ).split(',');
    this.maxFileSizeBytes =
      parseInt(process.env.MAX_FILE_SIZE_MB || '50000') * 1024 * 1024;
  }

  validateFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return (
      this.allowedVideoExt.includes(ext) ||
      this.allowedSubtitleExt.includes(ext)
    );
  }

  initChunkedUpload(
    userId: string,
    filename: string,
    totalChunks: number,
    totalSize: number,
    metadata?: { title?: string; mediaType?: MediaType; tmdbId?: number },
  ): { uploadId: string } {
    if (!this.validateFileType(filename)) {
      throw new BadRequestException(
        `File type not allowed. Allowed: ${[...this.allowedVideoExt, ...this.allowedSubtitleExt].join(', ')}`,
      );
    }

    if (totalSize > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File too large. Max: ${process.env.MAX_FILE_SIZE_MB || 50000}MB`,
      );
    }

    const uploadId = uuid();
    const tempDir = path.join(
      process.env.UPLOADS_TEMP_PATH || '/uploads/temp',
      uploadId,
    );
    fs.mkdirSync(tempDir, { recursive: true });

    this.activeUploads.set(uploadId, {
      uploadId,
      userId,
      filename,
      totalChunks,
      receivedChunks: new Set(),
      tempDir,
      totalSize,
      title: metadata?.title,
      mediaType: metadata?.mediaType,
      tmdbId: metadata?.tmdbId,
    });

    return { uploadId };
  }

  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    buffer: Buffer,
  ): Promise<{ received: number; total: number; complete: boolean }> {
    const upload = this.activeUploads.get(uploadId);
    if (!upload) throw new BadRequestException('Upload session not found');

    const chunkPath = path.join(upload.tempDir, `chunk_${chunkIndex}`);
    fs.writeFileSync(chunkPath, buffer);
    upload.receivedChunks.add(chunkIndex);

    const progress = Math.round(
      (upload.receivedChunks.size / upload.totalChunks) * 100,
    );
    this.eventsGateway.broadcastUploadProgress(uploadId, progress);

    const complete = upload.receivedChunks.size === upload.totalChunks;

    if (complete) {
      await this.finalizeUpload(upload);
    }

    return {
      received: upload.receivedChunks.size,
      total: upload.totalChunks,
      complete,
    };
  }

  private async finalizeUpload(upload: ChunkedUpload): Promise<void> {
    try {
      // Reassemble chunks
      const finalPath = path.join(upload.tempDir, upload.filename);
      const writeStream = fs.createWriteStream(finalPath);

      for (let i = 0; i < upload.totalChunks; i++) {
        const chunkPath = path.join(upload.tempDir, `chunk_${i}`);
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
        fs.unlinkSync(chunkPath);
      }
      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const fileSize = fs.statSync(finalPath).size;

      // Parse filename for metadata
      const parsed = this.tmdbService.parseFilename(upload.filename);
      const mediaType =
        upload.mediaType ||
        (parsed.season ? MediaType.TV_SERIES : MediaType.MOVIE);
      const title = upload.title || parsed.title;

      // TMDB lookup
      let tmdbData = null;
      if (upload.tmdbId) {
        const type = mediaType === MediaType.TV_SERIES ? 'tv' : 'movie';
        tmdbData = await this.tmdbService.getDetails(upload.tmdbId, type);
      } else {
        const results = await this.tmdbService.search(title);
        if (results.length > 0) tmdbData = results[0];
      }

      const finalTitle = tmdbData?.title || title;
      const year = tmdbData?.year || parsed.year;

      // Organize file
      const destPath = this.mediaService.organizeFile(
        finalPath,
        finalTitle,
        mediaType,
        year,
        parsed.season,
        parsed.episode,
      );

      // Create media record
      const mediaItem = await this.mediaService.create({
        title: finalTitle,
        originalFilename: upload.filename,
        mediaType,
        uploadType: UploadType.DIRECT,
        status: MediaStatus.READY,
        filePath: destPath,
        fileSize,
        uploadedById: upload.userId,
        year,
        season: parsed.season,
        episode: parsed.episode,
        posterUrl: tmdbData?.posterPath || undefined,
        overview: tmdbData?.overview || undefined,
        tmdbId: tmdbData?.id || undefined,
        downloadProgress: 100,
      });

      await this.usersService.incrementStats(upload.userId, fileSize);

      await this.activityService.log(upload.userId, 'direct_upload', {
        mediaId: mediaItem.id,
        title: finalTitle,
        fileSize,
      });

      this.eventsGateway.broadcastNotification(
        upload.userId,
        `Upload complete: ${finalTitle}`,
      );

      await this.mediaService.refreshJellyfin();

      // Cleanup
      try {
        fs.rmSync(upload.tempDir, { recursive: true, force: true });
      } catch {
        // Best effort cleanup
      }
      this.activeUploads.delete(upload.uploadId);
    } catch (err) {
      console.error('Error finalizing upload:', err);
      this.activeUploads.delete(upload.uploadId);
      throw err;
    }
  }

  getActiveUploads(): Array<{
    uploadId: string;
    filename: string;
    progress: number;
  }> {
    const result: Array<{
      uploadId: string;
      filename: string;
      progress: number;
    }> = [];
    for (const [, upload] of this.activeUploads) {
      result.push({
        uploadId: upload.uploadId,
        filename: upload.filename,
        progress: Math.round(
          (upload.receivedChunks.size / upload.totalChunks) * 100,
        ),
      });
    }
    return result;
  }
}
