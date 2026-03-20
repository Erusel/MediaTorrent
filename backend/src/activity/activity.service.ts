import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog) private logRepo: Repository<ActivityLog>,
  ) {}

  async log(
    userId: string,
    action: string,
    metadata: Record<string, any> = {},
  ): Promise<ActivityLog> {
    const entry = this.logRepo.create({ userId, action, metadata });
    return this.logRepo.save(entry);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
  }): Promise<{ items: ActivityLog[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;

    const [items, total] = await this.logRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items, total };
  }
}
