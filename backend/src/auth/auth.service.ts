import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private activityService: ActivityService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) throw new UnauthorizedException('Account is banned');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.activityService.log(user.id, 'user_login', {});

    const { password: _, ...result } = user;
    return {
      user: result,
      accessToken: this.jwtService.sign({ sub: user.id, role: user.role }),
    };
  }
}
