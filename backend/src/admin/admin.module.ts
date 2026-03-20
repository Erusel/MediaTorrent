import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { MediaModule } from '../media/media.module';
import { ActivityModule } from '../activity/activity.module';
import { TorrentsModule } from '../torrents/torrents.module';

@Module({
  imports: [UsersModule, MediaModule, ActivityModule, TorrentsModule],
  controllers: [AdminController],
})
export class AdminModule {}
