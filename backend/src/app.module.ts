import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { TorrentsModule } from './torrents/torrents.module';
import { UploadsModule } from './uploads/uploads.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AdminModule } from './admin/admin.module';
import { ActivityModule } from './activity/activity.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      autoLoadEntities: true,
      synchronize: true,
      logging: process.env.NODE_ENV !== 'production',
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    MediaModule,
    TorrentsModule,
    UploadsModule,
    LeaderboardModule,
    AdminModule,
    ActivityModule,
    WebsocketModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
