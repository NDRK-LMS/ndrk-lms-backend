import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [totalUsers, activeUsers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, status: 'ACTIVE' },
      }),
    ]);

    return {
      totalUsers,
      totalProgrammes: 0,
      totalBatches: 0,
      totalCertificates: 0,
      activeUsers,
      systemHealth: {
        database: 'Operational',
        storage: 'Available',
        api: 'Operational',
      },
      recentActivity: [
        {
          action: 'Dashboard loaded',
          time: 'Just now',
          user: 'System',
        },
      ],
    };
  }
}

