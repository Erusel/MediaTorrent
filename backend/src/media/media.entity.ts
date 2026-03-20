import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum MediaType {
  MOVIE = 'movie',
  TV_SERIES = 'tv_series',
}

export enum UploadType {
  TORRENT = 'torrent',
  DIRECT = 'direct',
}

export enum MediaStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

@Entity('media_items')
export class MediaItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  originalFilename: string;

  @Column({ type: 'enum', enum: MediaType })
  mediaType: MediaType;

  @Column({ type: 'enum', enum: UploadType })
  uploadType: UploadType;

  @Column({ type: 'enum', enum: MediaStatus, default: MediaStatus.PENDING })
  status: MediaStatus;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true })
  season: number;

  @Column({ nullable: true })
  episode: number;

  @Column({ nullable: true })
  tmdbId: number;

  @Column({ nullable: true })
  posterUrl: string;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ nullable: true })
  torrentHash: string;

  @Column({ type: 'float', default: 0 })
  downloadProgress: number;

  @ManyToOne(() => User, (user) => user.mediaItems, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column({ nullable: true })
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
