import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaItem } from './media.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { UsersModule } from '../users/users.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaItem]),
    UsersModule,
    ActivityModule,
  ],
  providers: [MediaService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
