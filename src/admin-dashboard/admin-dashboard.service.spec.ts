import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  user: { count: jest.fn() },
  programmes: { count: jest.fn() },
  batches: { count: jest.fn() },
  enrollments: { count: jest.fn(), findMany: jest.fn() },
  submissions: { count: jest.fn(), findMany: jest.fn() },
  live_classes: { count: jest.fn() },
  audit_logs: { findMany: jest.fn() },
};

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
    jest.clearAllMocks();
  });

  // ── Stats ───────────────────────────────────────────────────────────

  describe('getStats', () => {
    beforeEach(() => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(150) // totalUsers
        .mockResolvedValueOnce(120); // activeUsers
      mockPrismaService.programmes.count
        .mockResolvedValueOnce(8) // totalProgrammes
        .mockResolvedValueOnce(5); // activeProgrammes
      mockPrismaService.batches.count.mockResolvedValue(12);
      mockPrismaService.enrollments.count.mockResolvedValue(450);
      mockPrismaService.submissions.count.mockResolvedValue(23);
      mockPrismaService.live_classes.count.mockResolvedValue(4);
    });

    it('should return all stats for SUPER_ADMIN (BR-001)', async () => {
      const result = await service.getStats('SUPER_ADMIN', 'admin-uuid');

      expect(result).toEqual({
        totalUsers: 150,
        activeUsers: 120,
        totalProgrammes: 8,
        activeProgrammes: 5,
        totalBatches: 12,
        totalEnrollments: 450,
        pendingGrading: 23,
        upcomingClasses: 4,
        systemHealth: {
          database: 'Operational',
          storage: 'Available',
          api: 'Operational',
        },
      });
    });

    it('should count only non-deleted users', async () => {
      await service.getStats('SUPER_ADMIN', 'admin-uuid');

      // First user.count call (totalUsers)
      expect(mockPrismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted_at: null },
        }),
      );
    });

    it('should count active programmes', async () => {
      await service.getStats('SUPER_ADMIN', 'admin-uuid');

      // Second programmes.count call (activeProgrammes)
      expect(mockPrismaService.programmes.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        }),
      );
    });

    it('should count pending grading (SUBMITTED submissions)', async () => {
      await service.getStats('SUPER_ADMIN', 'admin-uuid');

      expect(mockPrismaService.submissions.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'SUBMITTED' },
        }),
      );
    });

    it('should count upcoming classes within 7 days', async () => {
      await service.getStats('SUPER_ADMIN', 'admin-uuid');

      expect(mockPrismaService.live_classes.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SCHEDULED',
            scheduled_start: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should include systemHealth object', async () => {
      const result = await service.getStats('PROGRAMME_ADMIN', 'pa-uuid');

      expect(result.systemHealth).toEqual({
        database: 'Operational',
        storage: 'Available',
        api: 'Operational',
      });
    });
  });

  // ── Charts ──────────────────────────────────────────────────────────

  describe('getCharts', () => {
    it('should return enrollment trend and grade distribution (BR-006)', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([
        { enrolled_at: new Date('2026-03-20') },
        { enrolled_at: new Date('2026-03-20') },
        { enrolled_at: new Date('2026-03-21') },
      ]);
      mockPrismaService.submissions.findMany.mockResolvedValue([]);

      const result = await service.getCharts('30d');

      expect(result).toHaveProperty('enrollmentTrend');
      expect(result).toHaveProperty('gradeDistribution');
    });

    it('should aggregate enrollment by date (BR-008)', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([
        { enrolled_at: new Date('2026-03-20T10:00:00Z') },
        { enrolled_at: new Date('2026-03-20T14:00:00Z') },
        { enrolled_at: new Date('2026-03-21T09:00:00Z') },
      ]);
      mockPrismaService.submissions.findMany.mockResolvedValue([]);

      const result = await service.getCharts('30d');

      expect(result.enrollmentTrend).toEqual([
        { date: '2026-03-20', count: 2 },
        { date: '2026-03-21', count: 1 },
      ]);
    });

    it('should return empty arrays when no data', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([]);
      mockPrismaService.submissions.findMany.mockResolvedValue([]);

      const result = await service.getCharts('7d');

      expect(result.enrollmentTrend).toEqual([]);
      expect(result.gradeDistribution).toEqual([
        { range: '0-49', count: 0 },
        { range: '50-69', count: 0 },
        { range: '70-79', count: 0 },
        { range: '80-89', count: 0 },
        { range: '90-100', count: 0 },
      ]);
    });

    it('should distribute grades into correct ranges', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([]);
      mockPrismaService.submissions.findMany.mockResolvedValue([
        { percentage: 95 },
        { percentage: 85 },
        { percentage: 72 },
        { percentage: 55 },
        { percentage: 30 },
        { percentage: 91 },
      ]);

      const result = await service.getCharts('30d');

      const dist = result.gradeDistribution;
      expect(dist.find((d: any) => d.range === '90-100')!.count).toBe(2);
      expect(dist.find((d: any) => d.range === '80-89')!.count).toBe(1);
      expect(dist.find((d: any) => d.range === '70-79')!.count).toBe(1);
      expect(dist.find((d: any) => d.range === '50-69')!.count).toBe(1);
      expect(dist.find((d: any) => d.range === '0-49')!.count).toBe(1);
    });

    it('should filter enrollments by date range for 7d', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([]);
      mockPrismaService.submissions.findMany.mockResolvedValue([]);

      await service.getCharts('7d');

      const where = mockPrismaService.enrollments.findMany.mock.calls[0][0].where;
      const gte = where.enrolled_at.gte as Date;
      const now = new Date();
      const diffDays = (now.getTime() - gte.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('should default to 30d range (BR-006)', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([]);
      mockPrismaService.submissions.findMany.mockResolvedValue([]);

      await service.getCharts();

      const where = mockPrismaService.enrollments.findMany.mock.calls[0][0].where;
      const gte = where.enrolled_at.gte as Date;
      const now = new Date();
      const diffDays = (now.getTime() - gte.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });
  });

  // ── Activity ────────────────────────────────────────────────────────

  describe('getActivity', () => {
    it('should return last 20 activities by default (BR-010)', async () => {
      mockPrismaService.audit_logs.findMany.mockResolvedValue([]);

      await service.getActivity();

      expect(mockPrismaService.audit_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          orderBy: { created_at: 'desc' },
        }),
      );
    });

    it('should accept custom limit', async () => {
      mockPrismaService.audit_logs.findMany.mockResolvedValue([]);

      await service.getActivity(10);

      expect(mockPrismaService.audit_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should map audit logs to activity shape (BR-012)', async () => {
      mockPrismaService.audit_logs.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'user.created',
          resource_type: 'User',
          resource_id: 'user-uuid',
          actor_id: 'admin-uuid',
          details: { name: 'John' },
          created_at: new Date('2026-03-25T10:00:00Z'),
          users: { id: 'admin-uuid', full_name: 'Admin User' },
        },
      ]);

      const result = await service.getActivity();

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0]).toEqual({
        id: 'log-1',
        action: 'user.created',
        resourceType: 'User',
        resourceId: 'user-uuid',
        actor: 'Admin User',
        actorId: 'admin-uuid',
        details: { name: 'John' },
        time: new Date('2026-03-25T10:00:00Z'),
      });
    });

    it('should default actor to "System" when no user', async () => {
      mockPrismaService.audit_logs.findMany.mockResolvedValue([
        {
          id: 'log-2',
          action: 'system.startup',
          resource_type: 'System',
          resource_id: null,
          actor_id: null,
          details: null,
          created_at: new Date(),
          users: null,
        },
      ]);

      const result = await service.getActivity();

      expect(result.activities[0].actor).toBe('System');
    });

    it('should include users relation with select', async () => {
      mockPrismaService.audit_logs.findMany.mockResolvedValue([]);

      await service.getActivity();

      expect(mockPrismaService.audit_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            users: {
              select: { id: true, full_name: true },
            },
          },
        }),
      );
    });
  });
});
