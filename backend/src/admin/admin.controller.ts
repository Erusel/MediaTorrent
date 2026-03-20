import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { MediaService } from '../media/media.service';
import { ActivityService } from '../activity/activity.service';
import { TorrentsService } from '../torrents/torrents.service';
import { UserRole } from '../users/user.entity';

class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  canUpload?: boolean;

  @IsOptional()
  @IsBoolean()
  canDownload?: boolean;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private usersService: UsersService,
    private mediaService: MediaService,
    private activityService: ActivityService,
    private torrentsService: TorrentsService,
  ) {}

  // ===== User Management =====

  @Get('users')
  getUsers() {
    return this.usersService.findAll();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Post('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.usersService.update(id, { isBanned: true });
  }

  @Post('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.usersService.update(id, { isBanned: false });
  }

  // ===== Media Management =====

  @Get('media')
  getMedia(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.mediaService.findAll({ page, limit, search });
  }

  @Delete('media/:id')
  deleteMedia(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }

  // ===== Torrent Management =====

  @Get('torrents')
  getTorrents() {
    return this.torrentsService.getTorrents();
  }

  @Delete('torrents/:hash')
  deleteTorrent(
    @Param('hash') hash: string,
    @Query('deleteFiles') deleteFiles?: string,
  ) {
    return this.torrentsService.deleteTorrent(hash, deleteFiles === 'true');
  }

  @Post('torrents/:hash/pause')
  pauseTorrent(@Param('hash') hash: string) {
    return this.torrentsService.pauseTorrent(hash);
  }

  @Post('torrents/:hash/resume')
  resumeTorrent(@Param('hash') hash: string) {
    return this.torrentsService.resumeTorrent(hash);
  }

  // ===== Activity Logs =====

  @Get('activity')
  getActivity(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
  ) {
    return this.activityService.findAll({ page, limit, userId, action });
  }
}
