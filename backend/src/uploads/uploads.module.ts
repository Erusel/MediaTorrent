import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { ActivityModule } from '../activity/activity.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { TorrentsModule } from '../torrents/torrents.module';

@Module({
  imports: [MediaModule, UsersModule, ActivityModule, WebsocketModule, TorrentsModule],
  providers: [UploadsService],
  controllers: [UploadsController],
  exports: [UploadsService],
})
export class UploadsModule {}
