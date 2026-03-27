import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LearnerService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
      },
    });

    return {
      user,
      // placeholders for now
      upcomingSessions: [],
      pendingAssessments: [],
      progressSummary: null,
    };
  }
}
