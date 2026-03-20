import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) return null;
    const { password, ...result } = user;
    return result;
  }

  @Get(':id/stats')
  async getUserStats(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      totalUploads: user.totalUploads,
      totalUploadSize: user.totalUploadSize,
      memberSince: user.createdAt,
    };
  }
}
