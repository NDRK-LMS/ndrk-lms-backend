import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const userCount = await this.prisma.user.count();

    return {
      summary: {
        users: userCount,
        programmes: 0,
        batches: 0,
      },
    };
  }
}


