import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiQuery({ name: 'sortBy', required: false, enum: ['totalUploads', 'totalUploadSize'] })
  @ApiQuery({ name: 'limit', required: false })
  async getLeaderboard(
    @Query('sortBy') sortBy?: 'totalUploads' | 'totalUploadSize',
    @Query('limit') limit?: number,
  ) {
    const users = await this.usersService.getLeaderboard(
      sortBy || 'totalUploads',
      limit || 50,
    );
    return users.map((u, index) => ({
      rank: index + 1,
      id: u.id,
      username: u.username,
      totalUploads: u.totalUploads,
      totalUploadSize: u.totalUploadSize,
      memberSince: u.createdAt,
    }));
  }
}
