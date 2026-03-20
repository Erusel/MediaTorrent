import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { MediaType } from '../media/media.entity';

class InitUploadDto {
  @IsString()
  filename: string;

  @IsNumber()
  totalChunks: number;

  @IsNumber()
  totalSize: number;

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

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('init')
  initUpload(@Body() dto: InitUploadDto, @Request() req: any) {
    if (!req.user) throw new ForbiddenException();
    return this.uploadsService.initChunkedUpload(
      req.user.id,
      dto.filename,
      dto.totalChunks,
      dto.totalSize,
      { title: dto.title, mediaType: dto.mediaType, tmdbId: dto.tmdbId },
    );
  }

  @Post('chunk')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        uploadId: { type: 'string' },
        chunkIndex: { type: 'number' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body('uploadId') uploadId: string,
    @Body('chunkIndex') chunkIndex: string,
  ) {
    return this.uploadsService.uploadChunk(
      uploadId,
      parseInt(chunkIndex),
      file.buffer,
    );
  }

  @Get('active')
  getActiveUploads() {
    return this.uploadsService.getActiveUploads();
  }
}
