import { Module } from '@nestjs/common';
import { TorrentsService } from './torrents.service';
import { TorrentsController } from './torrents.controller';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { ActivityModule } from '../activity/activity.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { TmdbService } from './tmdb.service';

@Module({
  imports: [MediaModule, UsersModule, ActivityModule, WebsocketModule],
  providers: [TorrentsService, TmdbService],
  controllers: [TorrentsController],
  exports: [TorrentsService, TmdbService],
})
export class TorrentsModule {}
