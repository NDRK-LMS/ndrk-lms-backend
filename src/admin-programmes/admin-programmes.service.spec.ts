import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AdminProgrammesService } from './admin-programmes.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock dynamic import of @ndrk/shared used in assignBatchFaculty
jest.mock('@ndrk/shared', () => ({
  UserRole: {
    FACULTY: 'FACULTY',
    GUEST_FACULTY: 'GUEST_FACULTY',
    LEARNER: 'LEARNER',
    SUPER_ADMIN: 'SUPER_ADMIN',
    PROGRAMME_ADMIN: 'PROGRAMME_ADMIN',
    EVALUATOR: 'EVALUATOR',
  },
  roleRequiresMfa: jest.fn(),
}));

const mockProgramme = {
  id: 'prog-uuid-1',
  title: 'B.Ed Programme',
  description: 'Teacher training',
  slug: 'b-ed-programme',
  status: 'DRAFT',
  category: 'Education',
  thumbnail_url: null,
  start_date: new Date('2026-04-01'),
  end_date: new Date('2026-12-31'),
  self_enrollment: false,
  max_capacity: 100,
  cert_min_attendance: null,
  cert_min_grade: null,
  created_by: 'admin-uuid',
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
  sequential_lessons: false,
  _count: { batches: 2, enrollments: 15 },
};

const mockModule = {
  id: 'mod-uuid-1',
  programme_id: 'prog-uuid-1',
  title: 'Module 1',
  description: 'Intro',
  sequence: 0,
  is_visible: true,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockLesson = {
  id: 'les-uuid-1',
  module_id: 'mod-uuid-1',
  title: 'Lesson 1',
  type: 'VIDEO',
  description: null,
  duration_minutes: 30,
  sequence: 0,
  is_mandatory: true,
  external_url: null,
  content_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  modules: { programme_id: 'prog-uuid-1', id: 'mod-uuid-1' },
};

const mockBatch = {
  id: 'batch-uuid-1',
  programme_id: 'prog-uuid-1',
  name: 'Batch A',
  status: 'ACTIVE',
  start_date: new Date('2026-04-01'),
  end_date: new Date('2026-06-30'),
  capacity: 30,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockEnrollment = {
  id: 'enr-uuid-1',
  batch_id: 'batch-uuid-1',
  programme_id: 'prog-uuid-1',
  user_id: 'user-uuid-1',
  status: 'ACTIVE',
  enrolled_at: new Date(),
  enrolled_by: 'admin-uuid',
  users: {
    id: 'user-uuid-1',
    full_name: 'Test Learner',
    email: 'learner@test.com',
    avatar_url: null,
    status: 'ACTIVE',
  },
};

const mockPrismaService = {
  programmes: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  modules: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  lessons: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  batches: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  enrollments: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  },
  batch_faculty: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  lesson_progress: {
    count: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AdminProgrammesService', () => {
  let service: AdminProgrammesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminProgrammesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminProgrammesService>(AdminProgrammesService);
    jest.clearAllMocks();
  });

  // ── Programme CRUD ────────────────────────────────────────────────────

  describe('create', () => {
    it('should create programme with auto-generated slug (BR-001)', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null); // slug unique
      mockPrismaService.programmes.create.mockResolvedValue({
        ...mockProgramme,
        slug: 'b-ed-programme',
      });

      const result = await service.create({
        title: 'B.Ed Programme',
        createdBy: 'admin-uuid',
      });

      expect(result.slug).toBe('b-ed-programme');
      expect(mockPrismaService.programmes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'B.Ed Programme',
            slug: 'b-ed-programme',
            created_by: 'admin-uuid',
            updated_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should append counter if slug exists (BR-001)', async () => {
      mockPrismaService.programmes.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // first slug taken
        .mockResolvedValueOnce(null); // slug-1 available
      mockPrismaService.programmes.create.mockResolvedValue({
        ...mockProgramme,
        slug: 'b-ed-programme-1',
      });

      await service.create({ title: 'B.Ed Programme', createdBy: 'admin-uuid' });

      expect(mockPrismaService.programmes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'b-ed-programme-1' }),
        }),
      );
    });

    it('should default status to DRAFT (BR-002)', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null);
      mockPrismaService.programmes.create.mockResolvedValue(mockProgramme);

      await service.create({ title: 'Test', createdBy: 'admin-uuid' });

      expect(mockPrismaService.programmes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
    });

    it('should set created_by from input (BR-003)', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null);
      mockPrismaService.programmes.create.mockResolvedValue(mockProgramme);

      await service.create({ title: 'Test', createdBy: 'admin-uuid-123' });

      expect(mockPrismaService.programmes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ created_by: 'admin-uuid-123' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated programmes', async () => {
      mockPrismaService.programmes.findMany.mockResolvedValue([mockProgramme]);
      mockPrismaService.programmes.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.programmes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should search by title and description', async () => {
      mockPrismaService.programmes.findMany.mockResolvedValue([]);
      mockPrismaService.programmes.count.mockResolvedValue(0);

      await service.findAll({ search: 'teacher' });

      const where = mockPrismaService.programmes.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { title: { contains: 'teacher', mode: 'insensitive' } },
        { description: { contains: 'teacher', mode: 'insensitive' } },
      ]);
    });

    it('should filter by status', async () => {
      mockPrismaService.programmes.findMany.mockResolvedValue([]);
      mockPrismaService.programmes.count.mockResolvedValue(0);

      await service.findAll({ status: 'ACTIVE' });

      const where = mockPrismaService.programmes.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('ACTIVE');
    });

    it('should map startDate sort to start_date', async () => {
      mockPrismaService.programmes.findMany.mockResolvedValue([]);
      mockPrismaService.programmes.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'startDate' });

      expect(mockPrismaService.programmes.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { start_date: 'desc' },
        }),
      );
    });
  });

  describe('findOneWithStructure', () => {
    it('should return programme with modules, lessons, batches', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue({
        ...mockProgramme,
        modules: [{
          ...mockModule,
          lessons: [{ ...mockLesson, modules: undefined }],
        }],
        batches: [mockBatch],
      });

      const result = await service.findOneWithStructure('prog-uuid-1');

      expect(result).not.toBeNull();
      expect(result!.programme.id).toBe('prog-uuid-1');
      expect(result!.modules).toHaveLength(1);
      expect(result!.modules[0].lessons).toHaveLength(1);
      expect(result!.batches).toHaveLength(1);
    });

    it('should return null when programme not found', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null);

      const result = await service.findOneWithStructure('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update programme fields', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(mockProgramme);
      mockPrismaService.programmes.update.mockResolvedValue(mockProgramme);
      // Mock findOneWithStructure chain
      mockPrismaService.programmes.findUnique
        .mockResolvedValueOnce({ id: 'prog-uuid-1' }) // update check
        .mockResolvedValueOnce({ ...mockProgramme, modules: [], batches: [] }); // findOneWithStructure

      const result = await service.update('prog-uuid-1', { title: 'Updated Title' });

      expect(mockPrismaService.programmes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prog-uuid-1' },
          data: expect.objectContaining({
            title: 'Updated Title',
            updated_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when programme not found', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archive', () => {
    it('should set status ARCHIVED and deleted_at (BR-002)', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(mockProgramme);
      mockPrismaService.programmes.update.mockResolvedValue({});

      await service.archive('prog-uuid-1');

      expect(mockPrismaService.programmes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ARCHIVED',
            deleted_at: expect.any(Date),
            updated_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when programme not found', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null);

      await expect(service.archive('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Module CRUD ───────────────────────────────────────────────────────

  describe('createModule', () => {
    it('should auto-assign sequence from existing count (BR-004)', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(mockProgramme);
      mockPrismaService.modules.count.mockResolvedValue(3);
      mockPrismaService.modules.create.mockResolvedValue({
        ...mockModule,
        sequence: 3,
      });

      const result = await service.createModule('prog-uuid-1', { title: 'New Module' });

      expect(mockPrismaService.modules.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            programme_id: 'prog-uuid-1',
            sequence: 3,
            updated_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw when programme not found', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null);

      await expect(
        service.createModule('nonexistent', { title: 'X' }),
      ).rejects.toThrow('Programme not found');
    });
  });

  describe('deleteModule', () => {
    it('should delete and resequence remaining modules (BR-005)', async () => {
      mockPrismaService.modules.findUnique.mockResolvedValue({
        ...mockModule,
        sequence: 1,
      });
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          modules: {
            delete: jest.fn(),
            updateMany: jest.fn(),
          },
        };
        await fn(tx);
        return tx;
      });
      // findOneWithStructure after delete
      mockPrismaService.programmes.findUnique.mockResolvedValue({
        ...mockProgramme,
        modules: [],
        batches: [],
      });

      await service.deleteModule('mod-uuid-1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when module not found', async () => {
      mockPrismaService.modules.findUnique.mockResolvedValue(null);

      await expect(service.deleteModule('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderModules', () => {
    it('should validate all IDs belong to the programme (BR-006)', async () => {
      mockPrismaService.modules.findMany.mockResolvedValue([
        { id: 'mod-1' },
        { id: 'mod-2' },
      ]);

      await expect(
        service.reorderModules('prog-uuid-1', ['mod-1', 'mod-2', 'mod-invalid']),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reorderModules('prog-uuid-1', ['mod-1', 'mod-2', 'mod-invalid']),
      ).rejects.toThrow('Invalid module IDs provided');
    });

    it('should update sequence via transaction', async () => {
      mockPrismaService.modules.findMany.mockResolvedValue([
        { id: 'mod-1' },
        { id: 'mod-2' },
      ]);
      mockPrismaService.modules.update.mockResolvedValue({});
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);
      mockPrismaService.programmes.findUnique.mockResolvedValue({
        ...mockProgramme,
        modules: [],
        batches: [],
      });

      await service.reorderModules('prog-uuid-1', ['mod-2', 'mod-1']);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      // Verify modules.update was called for each ID
      expect(mockPrismaService.modules.update).toHaveBeenCalledTimes(2);
    });
  });

  // ── Lesson CRUD ───────────────────────────────────────────────────────

  describe('createLesson', () => {
    it('should auto-assign sequence within module (BR-008)', async () => {
      mockPrismaService.modules.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.lessons.count.mockResolvedValue(2);
      mockPrismaService.lessons.create.mockResolvedValue({
        ...mockLesson,
        sequence: 2,
      });

      await service.createLesson('mod-uuid-1', {
        title: 'New Lesson',
        type: 'VIDEO',
      });

      expect(mockPrismaService.lessons.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            module_id: 'mod-uuid-1',
            sequence: 2,
            is_mandatory: true,
            updated_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should default is_mandatory to true (BR-009)', async () => {
      mockPrismaService.modules.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.lessons.count.mockResolvedValue(0);
      mockPrismaService.lessons.create.mockResolvedValue(mockLesson);

      await service.createLesson('mod-uuid-1', {
        title: 'Test',
        type: 'DOCUMENT',
      });

      expect(mockPrismaService.lessons.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_mandatory: true }),
        }),
      );
    });

    it('should accept lesson type VIDEO, DOCUMENT, LIVE_CLASS, ASSESSMENT, EXTERNAL_LINK (BR-007)', async () => {
      mockPrismaService.modules.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.lessons.count.mockResolvedValue(0);
      mockPrismaService.lessons.create.mockResolvedValue(mockLesson);

      await service.createLesson('mod-uuid-1', {
        title: 'External',
        type: 'EXTERNAL_LINK',
        externalUrl: 'https://example.com',
      });

      expect(mockPrismaService.lessons.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'EXTERNAL_LINK',
            external_url: 'https://example.com',
          }),
        }),
      );
    });

    it('should throw when module not found', async () => {
      mockPrismaService.modules.findUnique.mockResolvedValue(null);

      await expect(
        service.createLesson('nonexistent', { title: 'X', type: 'VIDEO' }),
      ).rejects.toThrow('Module not found');
    });
  });

  describe('deleteLesson', () => {
    it('should delete and resequence remaining lessons', async () => {
      mockPrismaService.lessons.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          lessons: { delete: jest.fn(), updateMany: jest.fn() },
        };
        await fn(tx);
      });
      mockPrismaService.programmes.findUnique.mockResolvedValue({
        ...mockProgramme,
        modules: [],
        batches: [],
      });

      await service.deleteLesson('les-uuid-1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when lesson not found', async () => {
      mockPrismaService.lessons.findUnique.mockResolvedValue(null);

      await expect(service.deleteLesson('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderLessons', () => {
    it('should validate all IDs belong to the module', async () => {
      mockPrismaService.lessons.findMany.mockResolvedValue([{ id: 'les-1' }]);

      await expect(
        service.reorderLessons('mod-uuid-1', ['les-1', 'les-invalid']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Batch Management ──────────────────────────────────────────────────

  describe('createBatch', () => {
    it('should create batch under programme', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(mockProgramme);
      mockPrismaService.batches.create.mockResolvedValue(mockBatch);

      const result = await service.createBatch('prog-uuid-1', {
        name: 'Batch A',
        capacity: 30,
      });

      expect(mockPrismaService.batches.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            programme_id: 'prog-uuid-1',
            name: 'Batch A',
            capacity: 30,
            updated_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw when programme not found', async () => {
      mockPrismaService.programmes.findUnique.mockResolvedValue(null);

      await expect(
        service.createBatch('nonexistent', { name: 'X' }),
      ).rejects.toThrow('Programme not found');
    });
  });

  describe('deleteBatch', () => {
    it('should throw ConflictException with active enrollments (BR-010)', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        _count: { enrollments: 5 },
      });
      mockPrismaService.enrollments.count.mockResolvedValue(5);

      await expect(service.deleteBatch('batch-uuid-1')).rejects.toThrow(ConflictException);
      await expect(service.deleteBatch('batch-uuid-1')).rejects.toThrow(
        'Cannot delete batch with active enrollments',
      );
    });

    it('should delete batch when no active enrollments (BR-010)', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        _count: { enrollments: 0 },
      });
      mockPrismaService.enrollments.count.mockResolvedValue(0);
      mockPrismaService.batches.delete.mockResolvedValue({});
      mockPrismaService.programmes.findUnique.mockResolvedValue({
        ...mockProgramme,
        modules: [],
        batches: [],
      });

      await service.deleteBatch('batch-uuid-1');

      expect(mockPrismaService.batches.delete).toHaveBeenCalledWith({
        where: { id: 'batch-uuid-1' },
      });
    });

    it('should throw NotFoundException when batch not found', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue(null);

      await expect(service.deleteBatch('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Enrollment ────────────────────────────────────────────────────────

  describe('enrollLearners', () => {
    it('should throw ConflictException when capacity exceeded (BR-011)', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        capacity: 2,
        programmes: mockProgramme,
        _count: { enrollments: 1 },
      });

      await expect(
        service.enrollLearners('batch-uuid-1', ['u1', 'u2', 'u3']),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.enrollLearners('batch-uuid-1', ['u1', 'u2', 'u3']),
      ).rejects.toThrow('capacity');
    });

    it('should skip duplicate enrollments (BR-013)', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        capacity: 100,
        programmes: mockProgramme,
        _count: { enrollments: 1 },
      });
      // user-1 already enrolled
      mockPrismaService.enrollments.findMany.mockResolvedValue([
        { user_id: 'user-1' },
      ]);
      mockPrismaService.enrollments.createMany.mockResolvedValue({ count: 1 });
      // Mock getBatchDetail return
      mockPrismaService.batches.findUnique.mockResolvedValueOnce({
        ...mockBatch,
        capacity: 100,
        programmes: mockProgramme,
        _count: { enrollments: 1 },
      });
      // Second call for getBatchDetail
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        programmes: { id: 'prog-uuid-1', title: 'B.Ed' },
        _count: { enrollments: 2 },
        enrollments: [],
        batch_faculty: [],
      });

      await service.enrollLearners('batch-uuid-1', ['user-1', 'user-2'], 'admin-uuid');

      // Only user-2 should be enrolled
      expect(mockPrismaService.enrollments.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              user_id: 'user-2',
              enrolled_by: 'admin-uuid',
              enrolled_at: expect.any(Date),
            }),
          ],
          skipDuplicates: true,
        }),
      );
    });

    it('should set enrolled_by from admin context (BR-014)', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        capacity: 100,
        programmes: mockProgramme,
        _count: { enrollments: 0 },
      });
      mockPrismaService.enrollments.findMany.mockResolvedValue([]);
      mockPrismaService.enrollments.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        programmes: { id: 'prog-uuid-1', title: 'B.Ed' },
        _count: { enrollments: 1 },
        enrollments: [],
        batch_faculty: [],
      });

      await service.enrollLearners('batch-uuid-1', ['user-1'], 'admin-uuid-xyz');

      expect(mockPrismaService.enrollments.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              enrolled_by: 'admin-uuid-xyz',
            }),
          ],
        }),
      );
    });

    it('should set enrolled_at timestamp (BR-015)', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        capacity: 100,
        programmes: mockProgramme,
        _count: { enrollments: 0 },
      });
      mockPrismaService.enrollments.findMany.mockResolvedValue([]);
      mockPrismaService.enrollments.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        programmes: { id: 'prog-uuid-1', title: 'B.Ed' },
        _count: { enrollments: 1 },
        enrollments: [],
        batch_faculty: [],
      });

      await service.enrollLearners('batch-uuid-1', ['user-1']);

      expect(mockPrismaService.enrollments.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              enrolled_at: expect.any(Date),
            }),
          ],
        }),
      );
    });

    it('should throw NotFoundException when batch not found', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue(null);

      await expect(
        service.enrollLearners('nonexistent', ['u1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when all users already enrolled (BR-013)', async () => {
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        capacity: 100,
        programmes: mockProgramme,
        _count: { enrollments: 1 },
      });
      mockPrismaService.enrollments.findMany.mockResolvedValue([
        { user_id: 'user-1' },
      ]);

      await expect(
        service.enrollLearners('batch-uuid-1', ['user-1']),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeEnrollment', () => {
    it('should delete enrollment', async () => {
      mockPrismaService.enrollments.findUnique.mockResolvedValue({
        id: 'enr-uuid-1',
        batch_id: 'batch-uuid-1',
      });
      mockPrismaService.enrollments.delete.mockResolvedValue({});
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        programmes: { id: 'prog-uuid-1', title: 'B.Ed' },
        _count: { enrollments: 0 },
        enrollments: [],
        batch_faculty: [],
      });

      await service.removeEnrollment('enr-uuid-1');

      expect(mockPrismaService.enrollments.delete).toHaveBeenCalledWith({
        where: { id: 'enr-uuid-1' },
      });
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      mockPrismaService.enrollments.findUnique.mockResolvedValue(null);

      await expect(service.removeEnrollment('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Faculty Assignment ────────────────────────────────────────────────

  describe('assignBatchFaculty', () => {
    it('should throw ConflictException for duplicate assignment (BR-016)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'fac-uuid-1',
        role: 'FACULTY',
        status: 'ACTIVE',
      });
      mockPrismaService.batch_faculty.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.assignBatchFaculty('batch-uuid-1', 'fac-uuid-1'),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.assignBatchFaculty('batch-uuid-1', 'fac-uuid-1'),
      ).rejects.toThrow('Faculty already assigned');
    });

    it('should only allow FACULTY or GUEST_FACULTY roles (BR-017)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null); // not found = not a faculty

      await expect(
        service.assignBatchFaculty('batch-uuid-1', 'learner-uuid'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.assignBatchFaculty('batch-uuid-1', 'learner-uuid'),
      ).rejects.toThrow('Faculty not found or not active');
    });

    it('should assign faculty with role (BR-018)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'fac-uuid-1',
        role: 'FACULTY',
        status: 'ACTIVE',
      });
      mockPrismaService.batch_faculty.findUnique.mockResolvedValue(null);
      mockPrismaService.batch_faculty.create.mockResolvedValue({});
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        programmes: { id: 'prog-uuid-1', title: 'B.Ed' },
        _count: { enrollments: 0 },
        enrollments: [],
        batch_faculty: [],
      });

      await service.assignBatchFaculty('batch-uuid-1', 'fac-uuid-1', 'SECONDARY');

      expect(mockPrismaService.batch_faculty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            batch_id: 'batch-uuid-1',
            user_id: 'fac-uuid-1',
            role: 'SECONDARY',
          }),
        }),
      );
    });
  });

  // ── Progress Calculation ──────────────────────────────────────────────

  describe('calculateLearnerProgress (via getBatchEnrollments)', () => {
    it('should calculate progress as completed/total mandatory lessons (BR-019, BR-020)', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([mockEnrollment]);
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        programme_id: 'prog-uuid-1',
      });
      // Total mandatory lessons = 10, completed = 7
      mockPrismaService.lessons.count.mockResolvedValue(10);
      mockPrismaService.lesson_progress.count.mockResolvedValue(7);

      const result = await service.getBatchEnrollments('batch-uuid-1');

      expect(result[0].progressPercent).toBe(70);
    });

    it('should return 0 when no mandatory lessons', async () => {
      mockPrismaService.enrollments.findMany.mockResolvedValue([mockEnrollment]);
      mockPrismaService.batches.findUnique.mockResolvedValue({
        ...mockBatch,
        programme_id: 'prog-uuid-1',
      });
      mockPrismaService.lessons.count.mockResolvedValue(0);
      mockPrismaService.lesson_progress.count.mockResolvedValue(0);

      const result = await service.getBatchEnrollments('batch-uuid-1');

      expect(result[0].progressPercent).toBe(0);
    });
  });

  // ── Global Batch Listing ──────────────────────────────────────────────

  describe('findAllBatches', () => {
    it('should return paginated batches with programme info', async () => {
      mockPrismaService.batches.findMany.mockResolvedValue([{
        ...mockBatch,
        programmes: { id: 'prog-uuid-1', title: 'B.Ed' },
        _count: { enrollments: 5 },
      }]);
      mockPrismaService.batches.count.mockResolvedValue(1);

      const result = await service.findAllBatches();

      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].programme.title).toBe('B.Ed');
      expect(result.batches[0].totalEnrollments).toBe(5);
    });

    it('should filter by programmeId', async () => {
      mockPrismaService.batches.findMany.mockResolvedValue([]);
      mockPrismaService.batches.count.mockResolvedValue(0);

      await service.findAllBatches({ programmeId: 'prog-uuid-1' });

      const where = mockPrismaService.batches.findMany.mock.calls[0][0].where;
      expect(where.programme_id).toBe('prog-uuid-1');
    });

    it('should search by batch name or programme title', async () => {
      mockPrismaService.batches.findMany.mockResolvedValue([]);
      mockPrismaService.batches.count.mockResolvedValue(0);

      await service.findAllBatches({ search: 'batch' });

      const where = mockPrismaService.batches.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { name: { contains: 'batch', mode: 'insensitive' } },
        { programmes: { title: { contains: 'batch', mode: 'insensitive' } } },
      ]);
    });

    it('should filter by batch status (BR-012)', async () => {
      mockPrismaService.batches.findMany.mockResolvedValue([]);
      mockPrismaService.batches.count.mockResolvedValue(0);

      await service.findAllBatches({ status: 'ACTIVE' });

      const where = mockPrismaService.batches.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('ACTIVE');
    });
  });
});
