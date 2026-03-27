import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, ProgrammeStatus, LessonType, BatchStatus, EnrollmentStatus, FacultyRole } from '@prisma/client';
import { UserRole } from '@ndrk/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface FindAllProgrammesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FindAllBatchesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  programmeId?: string;
}

export type AdminBatchListItem = {
  id: string;
  name: string;
  status: BatchStatus;
  startDate: Date | null;
  endDate: Date | null;
  capacity: number | null;
  programme: {
    id: string;
    title: string;
  };
  totalEnrollments: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminProgrammeListItem = {
  id: string;
  title: string;
  description?: string | null;
  status: ProgrammeStatus;
  category?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  selfEnrollment: boolean;
  maxCapacity?: number | null;
  totalBatches: number;
  totalEnrollments: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AdminProgrammesService {
  constructor(private prisma: PrismaService) {}

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
  }

  async create(input: {
    title: string;
    description?: string | null;
    category?: string | null;
    status?: ProgrammeStatus;
    thumbnailUrl?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    selfEnrollment?: boolean;
    maxCapacity?: number | null;
    certMinAttendance?: Prisma.Decimal | null;
    certMinGrade?: Prisma.Decimal | null;
    createdBy: string;
  }) {
    const slugBase = this.slugify(input.title);

    let slug = slugBase || `programme-${Date.now()}`;
    let counter = 1;
    // ensure slug is unique with a reasonable upper bound
    while (counter < 1000) {
      const existing = await this.prisma.programmes.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existing) break;
      slug = `${slugBase}-${counter++}`;
    }

    return this.prisma.programmes.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        status: input.status ?? ProgrammeStatus.DRAFT,
        thumbnail_url: input.thumbnailUrl ?? null,
        slug,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        self_enrollment: input.selfEnrollment ?? false,
        max_capacity: input.maxCapacity ?? null,
        cert_min_attendance: input.certMinAttendance ?? null,
        cert_min_grade: input.certMinGrade ?? null,
        created_by: input.createdBy,
        updated_at: new Date(),
      },
    });
  }

  async findAll(options: FindAllProgrammesOptions = {}) {
    const {
      page = 1,
      limit = 12,
      search,
      status,
      category,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    const where: Prisma.programmesWhereInput = {};

    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as ProgrammeStatus;
    }

    if (category && category.trim() && category !== 'all') {
      where.category = { equals: category.trim(), mode: 'insensitive' };
    }

    const orderByField =
      sortBy === 'title' || sortBy === 'status' || sortBy === 'category'
        ? sortBy
        : sortBy === 'startDate'
          ? 'start_date'
          : sortBy === 'endDate'
            ? 'end_date'
            : 'created_at';

    const [rows, total] = await Promise.all([
      this.prisma.programmes.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          _count: {
            select: {
              batches: true,
              enrollments: true,
            },
          },
        },
      }),
      this.prisma.programmes.count({ where }),
    ]);

    const programmes: AdminProgrammeListItem[] = rows.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      category: p.category,
      startDate: p.start_date,
      endDate: p.end_date,
      selfEnrollment: p.self_enrollment,
      maxCapacity: p.max_capacity,
      totalBatches: p._count.batches,
      totalEnrollments: p._count.enrollments,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return {
      programmes,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  }

  async findOneWithStructure(id: string) {
    const programme = await this.prisma.programmes.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { sequence: 'asc' },
          include: {
            lessons: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
        batches: {
          orderBy: { start_date: 'asc' },
        },
        _count: {
          select: {
            batches: true,
            enrollments: true,
          },
        },
      },
    });

    if (!programme) return null;

    return {
      programme: {
        id: programme.id,
        title: programme.title,
        description: programme.description,
        status: programme.status,
        category: programme.category,
        startDate: programme.start_date,
        endDate: programme.end_date,
        selfEnrollment: programme.self_enrollment,
        maxCapacity: programme.max_capacity,
        certMinAttendance: programme.cert_min_attendance,
        certMinGrade: programme.cert_min_grade,
        createdAt: programme.created_at,
        updatedAt: programme.updated_at,
        totalBatches: programme._count.batches,
        totalEnrollments: programme._count.enrollments,
      },
      modules: programme.modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        sequence: m.sequence,
        isVisible: m.is_visible,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          description: l.description,
          durationMinutes: l.duration_minutes,
          sequence: l.sequence,
          isMandatory: l.is_mandatory,
          createdAt: l.created_at,
          updatedAt: l.updated_at,
        })),
      })),
      batches: programme.batches.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        startDate: b.start_date,
        endDate: b.end_date,
        capacity: b.capacity,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
    };
  }

  async findModuleProgrammeId(moduleId: string): Promise<{ programmeId: string }> {
    const mod = await this.prisma.modules.findUnique({
      where: { id: moduleId },
      select: { programme_id: true },
    });
    if (!mod) {
      throw new Error('Module not found');
    }
    return { programmeId: mod.programme_id };
  }

  async createModule(
    programmeId: string,
    input: { title: string; description?: string | null },
  ) {
    const parent = await this.prisma.programmes.findUnique({ where: { id: programmeId } });
    if (!parent) {
      throw new Error('Programme not found');
    }

    const sequence = await this.prisma.modules.count({ where: { programme_id: programmeId } });

    return this.prisma.modules.create({
      data: {
        programme_id: programmeId,
        title: input.title,
        description: input.description ?? null,
        sequence,
        updated_at: new Date(),
      },
    });
  }

  async createLesson(
    moduleId: string,
    input: {
      title: string;
      type: string;
      description?: string | null;
      durationMinutes?: number | null;
      externalUrl?: string | null;
    },
  ) {
    const parent = await this.prisma.modules.findUnique({ where: { id: moduleId } });
    if (!parent) {
      throw new Error('Module not found');
    }

    const sequence = await this.prisma.lessons.count({ where: { module_id: moduleId } });

    return this.prisma.lessons.create({
      data: {
        module_id: moduleId,
        title: input.title,
        type: input.type as LessonType,
        description: input.description ?? null,
        duration_minutes: input.durationMinutes ?? null,
        external_url: input.externalUrl ?? null,
        sequence,
        is_mandatory: true,
        updated_at: new Date(),
      },
    });
  }

  async createBatch(
    programmeId: string,
    input: { name: string; startDate?: Date | null; endDate?: Date | null; capacity?: number | null },
  ) {
    const parent = await this.prisma.programmes.findUnique({ where: { id: programmeId } });
    if (!parent) {
      throw new Error('Programme not found');
    }

    return this.prisma.batches.create({
      data: {
        programme_id: programmeId,
        name: input.name,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        capacity: input.capacity ?? null,
        updated_at: new Date(),
      },
    });
  }

  // ==================== BATCH MANAGEMENT ====================

  async getBatchDetail(batchId: string) {
    const batch = await this.prisma.batches.findUnique({
      where: { id: batchId },
      include: {
        programmes: { select: { id: true, title: true } },
        _count: { select: { enrollments: true } },
        enrollments: {
          include: {
            users: {
              select: { id: true, full_name: true, email: true, avatar_url: true, status: true },
            },
          },
          orderBy: { enrolled_at: 'desc' },
        },
        batch_faculty: {
          include: {
            users: {
              select: { id: true, full_name: true, email: true, avatar_url: true, role: true },
            },
          },
        },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const enrollmentsWithProgress = await Promise.all(
      batch.enrollments.map(async (e) => {
        const progress = await this.calculateLearnerProgress(e.user_id, batch.programme_id);
        return { ...e, progressPercent: progress };
      }),
    );

    return {
      batch: {
        id: batch.id,
        name: batch.name,
        status: batch.status,
        startDate: batch.start_date,
        endDate: batch.end_date,
        capacity: batch.capacity,
        programme: batch.programmes,
        totalEnrollments: batch._count.enrollments,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
      },
      enrollments: enrollmentsWithProgress,
      faculty: batch.batch_faculty.map((fa) => ({
        id: fa.id,
        role: fa.role,
        assignedAt: fa.assigned_at,
        user: fa.users,
      })),
    };
  }

  async updateBatch(
    batchId: string,
    data: {
      name?: string;
      startDate?: Date | null;
      endDate?: Date | null;
      capacity?: number | null;
      status?: BatchStatus;
    },
  ) {
    const batch = await this.prisma.batches.findUnique({
      where: { id: batchId },
      select: { programme_id: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    if (data.capacity !== undefined && data.capacity !== null) {
      const currentCount = await this.prisma.enrollments.count({
        where: {
          batch_id: batchId,
          status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLISTED] },
        },
      });
      if (data.capacity < currentCount) {
        throw new BadRequestException(
          `Cannot reduce capacity below current enrollment (${currentCount})`,
        );
      }
    }

    const updateData: any = { updated_at: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.status !== undefined) updateData.status = data.status;

    await this.prisma.batches.update({
      where: { id: batchId },
      data: updateData,
    });

    return this.getBatchDetail(batchId);
  }

  async deleteBatch(batchId: string) {
    const batch = await this.prisma.batches.findUnique({
      where: { id: batchId },
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLISTED] },
              },
            },
          },
        },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');
    const activeCount = await this.prisma.enrollments.count({
      where: {
        batch_id: batchId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.WAITLISTED] },
      },
    });
    if (activeCount > 0) {
      throw new ConflictException('Cannot delete batch with active enrollments');
    }

    const programmeId = batch.programme_id;
    await this.prisma.batches.delete({ where: { id: batchId } });

    return this.findOneWithStructure(programmeId);
  }

  // ==================== ENROLLMENT MANAGEMENT ====================

  async enrollLearners(batchId: string, userIds: string[], enrolledBy?: string) {
    const batch = await this.prisma.batches.findUnique({
      where: { id: batchId },
      include: {
        programmes: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    if (
      batch.capacity != null &&
      batch._count.enrollments + userIds.length > batch.capacity
    ) {
      throw new ConflictException(
        `Batch capacity (${batch.capacity}) would be exceeded`,
      );
    }

    const existing = await this.prisma.enrollments.findMany({
      where: { batch_id: batchId, user_id: { in: userIds } },
      select: { user_id: true },
    });
    const existingIds = new Set(existing.map((e) => e.user_id));
    const newIds = userIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      throw new ConflictException(
        'All selected users are already enrolled in this batch',
      );
    }

    await this.prisma.enrollments.createMany({
      data: newIds.map((userId) => ({
        batch_id: batchId,
        programme_id: batch.programme_id,
        user_id: userId,
        status: EnrollmentStatus.ACTIVE,
        enrolled_at: new Date(),
        enrolled_by: enrolledBy ?? null,
      })),
      skipDuplicates: true,
    });

    return this.getBatchDetail(batchId);
  }

  async removeEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: { batch_id: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    await this.prisma.enrollments.delete({ where: { id: enrollmentId } });
    return this.getBatchDetail(enrollment.batch_id);
  }

  async getBatchEnrollments(batchId: string) {
    const enrollments = await this.prisma.enrollments.findMany({
      where: { batch_id: batchId },
      include: {
        users: {
          select: { id: true, full_name: true, email: true, avatar_url: true, status: true },
        },
      },
      orderBy: { enrolled_at: 'desc' },
    });

    const batch = await this.prisma.batches.findUnique({
      where: { id: batchId },
      select: { programme_id: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    return Promise.all(
      enrollments.map(async (e) => ({
        ...e,
        progressPercent: await this.calculateLearnerProgress(e.user_id, batch.programme_id),
      })),
    );
  }

  private async calculateLearnerProgress(
    userId: string,
    programmeId: string,
  ): Promise<number> {
    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lessons.count({
        where: {
          modules: { programme_id: programmeId },
          is_mandatory: true,
        },
      }),
      this.prisma.lesson_progress.count({
        where: {
          user_id: userId,
          lessons: { modules: { programme_id: programmeId } },
          status: 'COMPLETED',
        },
      }),
    ]);

    if (totalLessons === 0) return 0;
    return Math.round((completedLessons / totalLessons) * 100);
  }

  // ==================== BATCH FACULTY (spec: faculty only at batch level) ====================

  async assignBatchFaculty(
    batchId: string,
    userId: string,
    role: FacultyRole | string = FacultyRole.PRIMARY,
  ) {
    const faculty = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: { in: [UserRole.FACULTY, UserRole.GUEST_FACULTY] },
        status: 'ACTIVE',
      },
    });
    if (!faculty) throw new NotFoundException('Faculty not found or not active');

    const existing = await this.prisma.batch_faculty.findUnique({
      where: { batch_id_user_id: { batch_id: batchId, user_id: userId } },
    });
    if (existing) throw new ConflictException('Faculty already assigned to this batch');

    await this.prisma.batch_faculty.create({
      data: {
        batch_id: batchId,
        user_id: userId,
        role: (role as FacultyRole) || FacultyRole.PRIMARY,
      },
    });

    return this.getBatchDetail(batchId);
  }

  async removeBatchFaculty(batchId: string, userId: string) {
    await this.prisma.batch_faculty.delete({
      where: { batch_id_user_id: { batch_id: batchId, user_id: userId } },
    });
    return this.getBatchDetail(batchId);
  }

  // ==================== REORDERING ====================

  async reorderModules(programmeId: string, moduleIds: string[]) {
    const modules = await this.prisma.modules.findMany({
      where: { programme_id: programmeId },
      select: { id: true },
    });
    const validIds = new Set(modules.map((m) => m.id));

    if (!moduleIds.every((id) => validIds.has(id))) {
      throw new BadRequestException('Invalid module IDs provided');
    }

    await this.prisma.$transaction(
      moduleIds.map((id, index) =>
        this.prisma.modules.update({
          where: { id },
          data: { sequence: index },
        }),
      ),
    );

    return this.findOneWithStructure(programmeId);
  }

  async reorderLessons(moduleId: string, lessonIds: string[]) {
    const lessons = await this.prisma.lessons.findMany({
      where: { module_id: moduleId },
      select: { id: true },
    });
    const validIds = new Set(lessons.map((l) => l.id));

    if (!lessonIds.every((id) => validIds.has(id))) {
      throw new BadRequestException('Invalid lesson IDs provided');
    }

    const { programmeId } = await this.findModuleProgrammeId(moduleId);

    await this.prisma.$transaction(
      lessonIds.map((id, index) =>
        this.prisma.lessons.update({
          where: { id },
          data: { sequence: index },
        }),
      ),
    );

    return this.findOneWithStructure(programmeId);
  }

  // ==================== MODULE / LESSON UPDATE & DELETE ====================

  async updateModule(
    moduleId: string,
    data: { title?: string; description?: string | null; isVisible?: boolean },
  ) {
    const mod = await this.prisma.modules.findUnique({
      where: { id: moduleId },
      select: { programme_id: true },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const updateData: any = { updated_at: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isVisible !== undefined) updateData.is_visible = data.isVisible;

    await this.prisma.modules.update({
      where: { id: moduleId },
      data: updateData,
    });

    return this.findOneWithStructure(mod.programme_id);
  }

  async deleteModule(moduleId: string) {
    const mod = await this.prisma.modules.findUnique({
      where: { id: moduleId },
      select: { programme_id: true, sequence: true },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const programmeId = mod.programme_id;

    await this.prisma.$transaction(async (tx) => {
      await tx.modules.delete({ where: { id: moduleId } });
      await tx.modules.updateMany({
        where: { programme_id: programmeId, sequence: { gt: mod.sequence } },
        data: { sequence: { decrement: 1 } },
      });
    });

    return this.findOneWithStructure(programmeId);
  }

  async updateLesson(
    lessonId: string,
    data: {
      title?: string;
      type?: string;
      description?: string | null;
      durationMinutes?: number | null;
      isMandatory?: boolean;
      externalUrl?: string | null;
    },
  ) {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      include: { modules: { select: { programme_id: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.prisma.lessons.update({
      where: { id: lessonId },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.type != null && { type: data.type as LessonType }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.durationMinutes !== undefined && {
          duration_minutes: data.durationMinutes,
        }),
        ...(data.isMandatory !== undefined && { is_mandatory: data.isMandatory }),
        ...(data.externalUrl !== undefined && { external_url: data.externalUrl }),
        updated_at: new Date(),
      },
    });

    return this.findOneWithStructure(lesson.modules.programme_id);
  }

  async deleteLesson(lessonId: string) {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      include: { modules: { select: { programme_id: true, id: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const { programme_id: programmeId, id: moduleId } = lesson.modules;
    const sequence = lesson.sequence;

    await this.prisma.$transaction(async (tx) => {
      await tx.lessons.delete({ where: { id: lessonId } });
      await tx.lessons.updateMany({
        where: { module_id: moduleId, sequence: { gt: sequence } },
        data: { sequence: { decrement: 1 } },
      });
    });

    return this.findOneWithStructure(programmeId);
  }

  // ==================== PROGRAMME UPDATE & ARCHIVE ====================

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      category: string | null;
      status: ProgrammeStatus;
      thumbnailUrl: string | null;
      startDate: Date | null;
      endDate: Date | null;
      selfEnrollment: boolean;
      maxCapacity: number | null;
      sequentialLessons: boolean;
      certMinAttendance: Prisma.Decimal | null;
      certMinGrade: Prisma.Decimal | null;
    }>,
  ) {
    const programme = await this.prisma.programmes.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    const updateData: any = { updated_at: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.thumbnailUrl !== undefined) updateData.thumbnail_url = data.thumbnailUrl;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.selfEnrollment !== undefined) updateData.self_enrollment = data.selfEnrollment;
    if (data.maxCapacity !== undefined) updateData.max_capacity = data.maxCapacity;
    if (data.sequentialLessons !== undefined) updateData.sequential_lessons = data.sequentialLessons;
    if (data.certMinAttendance !== undefined) updateData.cert_min_attendance = data.certMinAttendance;
    if (data.certMinGrade !== undefined) updateData.cert_min_grade = data.certMinGrade;

    await this.prisma.programmes.update({
      where: { id },
      data: updateData,
    });

    return this.findOneWithStructure(id);
  }

  async archive(id: string) {
    const programme = await this.prisma.programmes.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!programme) throw new NotFoundException('Programme not found');

    await this.prisma.programmes.update({
      where: { id },
      data: { status: ProgrammeStatus.ARCHIVED, deleted_at: new Date(), updated_at: new Date() },
    });
  }

  // ==================== GLOBAL BATCH LISTING (for /admin/batches) ====================

  async findAllBatches(options: FindAllBatchesOptions = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      programmeId,
    } = options;

    const where: Prisma.batchesWhereInput = {};

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { programmes: { title: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status as BatchStatus;
    }

    if (programmeId) {
      where.programme_id = programmeId;
    }

    const [rows, total] = await Promise.all([
      this.prisma.batches.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          programmes: {
            select: { id: true, title: true },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      }),
      this.prisma.batches.count({ where }),
    ]);

    const batches: AdminBatchListItem[] = rows.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      startDate: b.start_date,
      endDate: b.end_date,
      capacity: b.capacity,
      programme: b.programmes,
      totalEnrollments: b._count.enrollments,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    return {
      batches,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  }
}
