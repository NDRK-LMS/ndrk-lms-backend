import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'LEARNER',
  status: 'ACTIVE',
  last_login_at: null,
  created_at: new Date('2026-03-15'),
  avatar_url: null,
  phone: null,
  mfa_enabled: false,
  google_id: null,
  password_hash: 'hashed_password',
  deleted_at: null,
  updated_at: new Date(),
};

const mockUsers = [
  mockUser,
  {
    ...mockUser,
    id: 'user-uuid-2',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'SUPER_ADMIN',
  },
];

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('AdminUsersService', () => {
  let service: AdminUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
  });

  // ── findAll ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated users with defaults (BR-005, BR-008)', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result).toEqual({
        users: mockUsers,
        total: 2,
        totalPages: 1,
        page: 1,
        limit: 25,
      });
      // Should filter out soft-deleted users (BR-005)
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deleted_at: null }),
        }),
      );
      // Default sort: created_at DESC (BR-008)
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: 'desc' },
        }),
      );
    });

    it('should apply search filter on email and full_name (BR-006)', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll({ search: 'test' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
            OR: [
              { email: { contains: 'test', mode: 'insensitive' } },
              { full_name: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should map camelCase sort fields to snake_case (BR-007)', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'createdAt', sortOrder: 'asc' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: 'asc' },
        }),
      );
    });

    it('should map fullName sort to full_name (BR-007)', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'fullName' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { full_name: 'desc' },
        }),
      );
    });

    it('should filter by role', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ role: 'LEARNER' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { equals: 'LEARNER' },
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ status: 'ACTIVE' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { equals: 'ACTIVE' },
          }),
        }),
      );
    });

    it('should skip role filter when "all"', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      await service.findAll({ role: 'all' });

      const whereArg = mockPrismaService.user.findMany.mock.calls[0][0].where;
      expect(whereArg.role).toBeUndefined();
    });

    it('should paginate correctly', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.totalPages).toBe(5);
      expect(result.page).toBe(2);
    });

    it('should use explicit select with only needed fields', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll();

      const selectArg = mockPrismaService.user.findMany.mock.calls[0][0].select;
      expect(selectArg).toEqual({
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        last_login_at: true,
        created_at: true,
        avatar_url: true,
      });
    });
  });

  // ── getStats ────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return user stats (BR-012, BR-013)', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80)  // activeUsers
        .mockResolvedValueOnce(15)  // disabledUsers
        .mockResolvedValueOnce(5);  // newThisMonth

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 80,
        disabledUsers: 15,
        newThisMonth: 5,
      });
    });

    it('should count only non-deleted users (BR-012)', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.getStats();

      // All 4 count calls should filter deleted_at: null
      for (const call of mockPrismaService.user.count.mock.calls) {
        expect(call[0].where).toHaveProperty('deleted_at', null);
      }
    });

    it('should count newThisMonth from first day of current month (BR-013)', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.getStats();

      // The 4th call is newThisMonth
      const newThisMonthWhere = mockPrismaService.user.count.mock.calls[3][0].where;
      expect(newThisMonthWhere).toHaveProperty('created_at');
      expect(newThisMonthWhere.created_at.gte).toBeInstanceOf(Date);
      // First day of current month
      const gte = newThisMonthWhere.created_at.gte as Date;
      expect(gte.getDate()).toBe(1);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a single user by id', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOne('user-uuid-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1', deleted_at: null },
        }),
      );
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });

    it('should filter out soft-deleted users (BR-005)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await service.findOne('user-uuid-1');

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deleted_at: null }),
        }),
      );
    });
  });

  // ── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    const createInput = {
      email: 'new@example.com',
      fullName: 'New User',
      role: 'LEARNER' as any,
    };

    it('should create a new user (BR-001, BR-003)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: createInput.email,
        full_name: createInput.fullName,
      });

      const result = await service.create(createInput);

      expect(result.email).toBe('new@example.com');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            full_name: 'New User',
            role: 'LEARNER',
            status: 'ACTIVE',
            updated_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw BadRequestException when email exists (BR-001)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createInput)).rejects.toThrow(BadRequestException);
      await expect(service.create(createInput)).rejects.toThrow(
        'User with this email already exists',
      );
    });

    it('should allow create when existing user is soft-deleted (BR-001)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deleted_at: new Date(),
      });
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createInput);

      expect(result).toBeDefined();
    });

    it('should hash password with bcrypt when provided (BR-002)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await service.create({ ...createInput, password: 'mypassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password_hash: 'hashed_password',
          }),
        }),
      );
    });

    it('should not set password_hash when no password provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await service.create(createInput);

      const createData = mockPrismaService.user.create.mock.calls[0][0].data;
      expect(createData.password_hash).toBeUndefined();
    });

    it('should set status to ACTIVE on create (BR-003)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await service.create(createInput);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  // ── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update user fields', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        full_name: 'Updated Name',
      });

      const result = await service.update('user-uuid-1', {
        fullName: 'Updated Name',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
          data: expect.objectContaining({ full_name: 'Updated Name' }),
        }),
      );
    });

    it('should update role', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        role: 'FACULTY',
      });

      await service.update('user-uuid-1', { role: 'FACULTY' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'FACULTY' }),
        }),
      );
    });

    it('should update status', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        status: 'DISABLED',
      });

      await service.update('user-uuid-1', { status: 'DISABLED' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DISABLED' }),
        }),
      );
    });

    it('should only update provided fields', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.update('user-uuid-1', { phone: '+91-9876543210' });

      const data = mockPrismaService.user.update.mock.calls[0][0].data;
      expect(data).toEqual({ phone: '+91-9876543210' });
    });
  });

  // ── bulkUpdateStatus ────────────────────────────────────────────────

  describe('bulkUpdateStatus', () => {
    it('should update status for multiple users (BR-009)', async () => {
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdateStatus(
        ['uuid-1', 'uuid-2', 'uuid-3'],
        'ACTIVE' as any,
      );

      expect(result).toEqual({ updated: 3 });
      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['uuid-1', 'uuid-2', 'uuid-3'] },
            deleted_at: null,
          },
          data: { status: 'ACTIVE' },
        }),
      );
    });

    it('should only affect non-deleted users (BR-009)', async () => {
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

      await service.bulkUpdateStatus(['uuid-1'], 'DISABLED' as any);

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deleted_at: null }),
        }),
      );
    });

    it('should return 0 updated when no userIds provided', async () => {
      const result = await service.bulkUpdateStatus([], 'ACTIVE' as any);

      expect(result).toEqual({ updated: 0 });
      expect(mockPrismaService.user.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── softDelete ──────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('should set deleted_at instead of hard deleting (BR-004)', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deleted_at: new Date(),
      });

      const result = await service.softDelete('user-uuid-1', 'admin-uuid');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
          data: expect.objectContaining({
            deleted_at: expect.any(Date),
            metadata: expect.objectContaining({
              deleteReason: 'admin',
              deletedBy: 'admin-uuid',
            }),
          }),
        }),
      );
    });
  });

  // ── bulkImport ──────────────────────────────────────────────────────

  describe('bulkImport', () => {
    it('should import users from CSV (BR-010)', async () => {
      const csv = 'email,fullName,role\nnew1@test.com,User One,LEARNER\nnew2@test.com,User Two,FACULTY';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.bulkImport(Buffer.from(csv));

      expect(result.createdCount).toBe(2);
      expect(result.skippedCount).toBe(0);
    });

    it('should throw when CSV has no data rows', async () => {
      const csv = 'email,fullName,role';

      await expect(service.bulkImport(Buffer.from(csv))).rejects.toThrow(BadRequestException);
      await expect(service.bulkImport(Buffer.from(csv))).rejects.toThrow(
        'CSV must contain at least one data row',
      );
    });

    it('should throw when required columns missing (BR-010)', async () => {
      const csv = 'email,name\ntest@test.com,Test';

      await expect(service.bulkImport(Buffer.from(csv))).rejects.toThrow(BadRequestException);
      await expect(service.bulkImport(Buffer.from(csv))).rejects.toThrow(
        'CSV must include email, fullName, and role columns',
      );
    });

    it('should skip existing emails and report errors (BR-011)', async () => {
      const csv = 'email,fullName,role\nexisting@test.com,Existing,LEARNER';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser); // already exists

      const result = await service.bulkImport(Buffer.from(csv));

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('already exists');
    });

    it('should report rows with missing required fields (BR-010)', async () => {
      const csv = 'email,fullName,role\n,Missing Email,LEARNER';

      const result = await service.bulkImport(Buffer.from(csv));

      expect(result.createdCount).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('Missing required fields');
    });

    it('should handle CSV with optional phone and password columns', async () => {
      const csv = 'email,fullName,role,phone,password\nnew@test.com,New User,LEARNER,+91-123,pass1234';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.bulkImport(Buffer.from(csv));

      expect(result.createdCount).toBe(1);
    });
  });
});
