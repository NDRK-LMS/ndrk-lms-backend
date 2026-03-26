import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type DateRange = '7d' | '30d' | '90d' | 'all';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  // ── Stats (BR-001: Super Admin sees all) ──────────────────────────────

  async getStats(userRole: string, userId: string) {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalProgrammes,
      activeProgrammes,
      totalBatches,
      totalEnrollments,
      pendingGrading,
      upcomingClasses,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.user.count({ where: { deleted_at: null, status: 'ACTIVE' } }),
      this.prisma.programmes.count(),
      this.prisma.programmes.count({ where: { status: 'ACTIVE' } }),
      this.prisma.batches.count(),
      this.prisma.enrollments.count(),
      this.prisma.submissions.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.live_classes.count({
        where: {
          status: 'SCHEDULED',
          scheduled_start: { gte: now, lte: sevenDaysFromNow },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalProgrammes,
      activeProgrammes,
      totalBatches,
      totalEnrollments,
      pendingGrading,
      upcomingClasses,
      systemHealth: {
        database: 'Operational',
        storage: 'Available',
        api: 'Operational',
      },
    };
  }

  // ── Charts (BR-006: default 30d, BR-007: granularity, BR-008: enrollment trend) ──

  async getCharts(range: DateRange = '30d') {
    const now = new Date();
    const startDate = this.getStartDate(range, now);

    const [enrollmentTrend, gradeDistribution] = await Promise.all([
      this.getEnrollmentTrend(startDate),
      this.getGradeDistribution(),
    ]);

    return {
      enrollmentTrend,
      gradeDistribution,
    };
  }

  private getStartDate(range: DateRange, now: Date): Date {
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all':
        return new Date('2020-01-01');
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private async getEnrollmentTrend(
    startDate: Date,
  ): Promise<{ date: string; count: number }[]> {
    const enrollments = await this.prisma.enrollments.findMany({
      where: { enrolled_at: { gte: startDate } },
      select: { enrolled_at: true },
      orderBy: { enrolled_at: 'asc' },
    });

    const grouped = new Map<string, number>();
    for (const e of enrollments) {
      const day = e.enrolled_at.toISOString().slice(0, 10);
      grouped.set(day, (grouped.get(day) ?? 0) + 1);
    }

    return Array.from(grouped.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  private async getGradeDistribution(): Promise<
    { range: string; count: number }[]
  > {
    const submissions = await this.prisma.submissions.findMany({
      where: { status: 'GRADED', percentage: { not: null } },
      select: { percentage: true },
    });

    const ranges = [
      { range: '0-49', min: 0, max: 49 },
      { range: '50-69', min: 50, max: 69 },
      { range: '70-79', min: 70, max: 79 },
      { range: '80-89', min: 80, max: 89 },
      { range: '90-100', min: 90, max: 100 },
    ];

    return ranges.map(({ range, min, max }) => ({
      range,
      count: submissions.filter((s) => {
        const pct = Number(s.percentage);
        return pct >= min && pct <= max;
      }).length,
    }));
  }

  // ── Activity Feed (BR-010: last 20, BR-012: action types) ────────────

  async getActivity(limit = 20) {
    const logs = await this.prisma.audit_logs.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: { id: true, full_name: true },
        },
      },
    });

    return {
      activities: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        actor: log.users?.full_name ?? 'System',
        actorId: log.actor_id,
        details: log.details,
        time: log.created_at,
      })),
    };
  }
}
