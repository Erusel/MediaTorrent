import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TorrentsService } from './torrents.service';
import { TmdbService } from './tmdb.service';
import { MediaType } from '../media/media.entity';

class AddMagnetDto {
  @IsString()
  magnetLink: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @IsOptional()
  @IsNumber()
  tmdbId?: number;
}

@ApiTags('Torrents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('torrents')
export class TorrentsController {
  constructor(
    private torrentsService: TorrentsService,
    private tmdbService: TmdbService,
  ) {}

  @Post('magnet')
  addMagnet(@Body() dto: AddMagnetDto, @Request() req: any) {
    if (!req.user) throw new ForbiddenException();
    return this.torrentsService.addMagnet(dto.magnetLink, req.user.id, {
      title: dto.title,
      mediaType: dto.mediaType,
      tmdbId: dto.tmdbId,
    });
  }

  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        mediaType: { type: 'string', enum: ['movie', 'tv_series'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  addTorrentFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('mediaType') mediaType: MediaType,
    @Body('tmdbId') tmdbId: string,
    @Request() req: any,
  ) {
    if (!req.user) throw new ForbiddenException();
    return this.torrentsService.addTorrentFile(
      file.buffer,
      file.originalname,
      req.user.id,
      { title, mediaType, tmdbId: tmdbId ? parseInt(tmdbId) : undefined },
    );
  }

  @Get()
  getTorrents() {
    return this.torrentsService.getTorrents();
  }

  @Delete(':hash')
  @Roles('admin')
  deleteTorrent(
    @Param('hash') hash: string,
    @Query('deleteFiles') deleteFiles?: string,
  ) {
    return this.torrentsService.deleteTorrent(hash, deleteFiles === 'true');
  }

  @Post(':hash/pause')
  @Roles('admin')
  pauseTorrent(@Param('hash') hash: string) {
    return this.torrentsService.pauseTorrent(hash);
  }

  @Post(':hash/resume')
  @Roles('admin')
  resumeTorrent(@Param('hash') hash: string) {
    return this.torrentsService.resumeTorrent(hash);
  }

  @Get('tmdb/search')
  searchTmdb(@Query('q') query: string) {
    return this.tmdbService.search(query);
  }
}
