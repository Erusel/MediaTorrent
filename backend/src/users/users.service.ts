import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    const adminExists = await this.usersRepo.findOne({
      where: { role: UserRole.ADMIN },
    });
    if (!adminExists) {
      const hash = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123',
        parseInt(process.env.BCRYPT_ROUNDS || '12'),
      );
      await this.usersRepo.save({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@mediatorrent.local',
        password: hash,
        role: UserRole.ADMIN,
      });
      console.log('Admin user seeded');
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    const hash = await bcrypt.hash(
      data.password,
      parseInt(process.env.BCRYPT_ROUNDS || '12'),
    );
    const user = this.usersRepo.create({ ...data, password: hash });
    return this.usersRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepo.update(id, data);
    return this.usersRepo.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.delete(id);
  }

  async incrementStats(userId: string, fileSize: number): Promise<void> {
    await this.usersRepo
      .createQueryBuilder()
      .update(User)
      .set({
        totalUploads: () => '"totalUploads" + 1',
        totalUploadSize: () => `"totalUploadSize" + ${fileSize}`,
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  async getLeaderboard(
    sortBy: 'totalUploads' | 'totalUploadSize' = 'totalUploads',
    limit = 50,
  ): Promise<User[]> {
    return this.usersRepo.find({
      where: { isBanned: false },
      order: { [sortBy]: 'DESC' },
      take: limit,
    });
  }
}
