import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { MediaItem } from '../media/media.entity';
import { ActivityLog } from '../activity/activity.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ default: true })
  canUpload: boolean;

  @Column({ default: true })
  canDownload: boolean;

  @Column({ type: 'bigint', default: 0 })
  totalUploadSize: number;

  @Column({ default: 0 })
  totalUploads: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => MediaItem, (media) => media.uploadedBy)
  mediaItems: MediaItem[];

  @OneToMany(() => ActivityLog, (log) => log.user)
  activityLogs: ActivityLog[];
}
