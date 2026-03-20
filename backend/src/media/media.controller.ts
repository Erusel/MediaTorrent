import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MediaService } from './media.service';
import { MediaType, MediaStatus } from './media.entity';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'mediaType', required: false, enum: MediaType })
  @ApiQuery({ name: 'status', required: false, enum: MediaStatus })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('mediaType') mediaType?: MediaType,
    @Query('status') status?: MediaStatus,
  ) {
    return this.mediaService.findAll({ page, limit, search, mediaType, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaService.findById(id);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
