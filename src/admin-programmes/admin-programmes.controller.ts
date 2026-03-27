import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@ndrk/shared';
import { ProgrammeStatus, Prisma, BatchStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminProgrammesService } from './admin-programmes.service';

@Controller('api/v1/admin/programmes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminProgrammesController {
  constructor(private readonly programmesService: AdminProgrammesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async create(
    @Body()
    body: {
      title: string;
      description?: string | null;
      category?: string | null;
      status?: ProgrammeStatus;
      thumbnailUrl?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      selfEnrollment?: boolean;
      maxCapacity?: number | null;
      certMinAttendance?: number | null;
      certMinGrade?: number | null;
    },
    @CurrentUser('sub') userId: string,
  ) {
    if (!body?.title?.trim()) {
      throw new BadRequestException('Title is required');
    }

    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;

    const programme = await this.programmesService.create({
      title: body.title.trim(),
      description: body.description ?? null,
      category: body.category ?? null,
      status: body.status,
      thumbnailUrl: body.thumbnailUrl ?? null,
      startDate,
      endDate,
      selfEnrollment: body.selfEnrollment ?? false,
      maxCapacity: body.maxCapacity ?? null,
      certMinAttendance:
        body.certMinAttendance != null
          ? new Prisma.Decimal(body.certMinAttendance)
          : null,
      certMinGrade:
        body.certMinGrade != null
          ? new Prisma.Decimal(body.certMinGrade)
          : null,
      createdBy: userId,
    });

    return { id: programme.id, slug: programme.slug };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.programmesService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      search,
      status,
      category,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  // ----- Global batches list (for /admin/batches) -----
  @Get('batches')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async findAllBatches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('programmeId') programmeId?: string,
  ) {
    return this.programmesService.findAllBatches({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      programmeId,
    });
  }

  // ----- Batch routes (must be before :id to avoid matching "batches" as id)
  @Get('batches/:batchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async getBatchDetail(@Param('batchId') batchId: string) {
    return this.programmesService.getBatchDetail(batchId);
  }

  @Patch('batches/:batchId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async updateBatch(
    @Param('batchId') batchId: string,
    @Body()
    body: {
      name?: string;
      startDate?: string | null;
      endDate?: string | null;
      capacity?: number | null;
      status?: string;
    },
  ) {
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    const status =
      body.status != null && Object.values(BatchStatus).includes(body.status as BatchStatus)
        ? (body.status as BatchStatus)
        : undefined;
    return this.programmesService.updateBatch(batchId, {
      name: body.name,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      capacity: body.capacity,
      status,
    });
  }

  @Delete('batches/:batchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async deleteBatch(@Param('batchId') batchId: string) {
    await this.programmesService.deleteBatch(batchId);
  }

  @Post('batches/:batchId/enroll')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async enrollLearners(
    @Param('batchId') batchId: string,
    @Body() body: { userIds: string[] },
    @CurrentUser('sub') enrolledBy: string,
  ) {
    return this.programmesService.enrollLearners(
      batchId,
      body.userIds ?? [],
      enrolledBy,
    );
  }

  @Delete('batches/:batchId/enrollments/:enrollmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async removeEnrollment(@Param('enrollmentId') enrollmentId: string) {
    await this.programmesService.removeEnrollment(enrollmentId);
  }

  @Get('batches/:batchId/enrollments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async getBatchEnrollments(@Param('batchId') batchId: string) {
    return this.programmesService.getBatchEnrollments(batchId);
  }

  @Post('batches/:batchId/faculty')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async assignBatchFaculty(
    @Param('batchId') batchId: string,
    @Body() body: { userId: string; role?: string },
    @CurrentUser('sub') _assignedBy: string,
  ) {
    return this.programmesService.assignBatchFaculty(
      batchId,
      body.userId,
      body.role ?? 'PRIMARY',
    );
  }

  @Delete('batches/:batchId/faculty/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async removeBatchFaculty(
    @Param('batchId') batchId: string,
    @Param('userId') userId: string,
  ) {
    await this.programmesService.removeBatchFaculty(batchId, userId);
  }

  // ----- Programme :id routes
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async findOne(@Param('id') id: string) {
    const result = await this.programmesService.findOneWithStructure(id);
    if (!result) throw new NotFoundException('Programme not found');
    return result;
  }

  @Post(':id/modules')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async createModule(
    @Param('id') id: string,
    @Body() body: { title: string; description?: string | null },
  ) {
    if (!body?.title?.trim()) {
      throw new BadRequestException('Module title is required');
    }

    await this.programmesService.createModule(id, {
      title: body.title.trim(),
      description: body.description ?? null,
    });

    const updated = await this.programmesService.findOneWithStructure(id);
    if (!updated) throw new NotFoundException('Programme not found');
    return updated;
  }

  @Post('modules/:moduleId/lessons')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async createLesson(
    @Param('moduleId') moduleId: string,
    @Body()
    body: {
      title: string;
      type: string;
      description?: string | null;
      durationMinutes?: number | null;
      externalUrl?: string | null;
    },
  ) {
    if (!body?.title?.trim()) {
      throw new BadRequestException('Lesson title is required');
    }

    await this.programmesService.createLesson(moduleId, {
      title: body.title.trim(),
      type: body.type,
      description: body.description ?? null,
      durationMinutes: body.durationMinutes ?? null,
      externalUrl: body.externalUrl ?? null,
    });

    const { programmeId } = await this.programmesService.findModuleProgrammeId(moduleId);
    const updated = await this.programmesService.findOneWithStructure(programmeId);
    if (!updated) throw new NotFoundException('Programme not found');
    return updated;
  }

  @Post(':id/batches')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async createBatch(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      startDate?: string | null;
      endDate?: string | null;
      capacity?: number | null;
    },
  ) {
    if (!body?.name?.trim()) {
      throw new BadRequestException('Batch name is required');
    }

    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;

    await this.programmesService.createBatch(id, {
      name: body.name.trim(),
      startDate,
      endDate,
      capacity: body.capacity ?? null,
    });

    const updated = await this.programmesService.findOneWithStructure(id);
    if (!updated) throw new NotFoundException('Programme not found');
    return updated;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async updateProgramme(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      description: string | null;
      category: string | null;
      status: ProgrammeStatus;
      thumbnailUrl: string | null;
      startDate: string | null;
      endDate: string | null;
      selfEnrollment: boolean;
      maxCapacity: number | null;
      sequentialLessons: boolean;
      certMinAttendance: number | null;
      certMinGrade: number | null;
    }>,
  ) {
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    const {
      certMinAttendance: certMinAttendanceNum,
      certMinGrade: certMinGradeNum,
      ...rest
    } = body;
    const data: Parameters<AdminProgrammesService['update']>[1] = {
      ...rest,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      certMinAttendance:
        certMinAttendanceNum != null
          ? new Prisma.Decimal(certMinAttendanceNum)
          : undefined,
      certMinGrade:
        certMinGradeNum != null ? new Prisma.Decimal(certMinGradeNum) : undefined,
    };
    return this.programmesService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async deleteProgramme(@Param('id') id: string) {
    await this.programmesService.archive(id);
  }

  @Put(':id/modules/reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async reorderModules(
    @Param('id') id: string,
    @Body() body: { moduleIds: string[] },
  ) {
    if (!Array.isArray(body?.moduleIds)) {
      throw new BadRequestException('moduleIds array is required');
    }
    return this.programmesService.reorderModules(id, body.moduleIds);
  }

  @Patch(':id/modules/:moduleId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async updateModule(
    @Param('moduleId') moduleId: string,
    @Body() body: { title?: string; description?: string | null; isVisible?: boolean },
  ) {
    return this.programmesService.updateModule(moduleId, body);
  }

  @Delete(':id/modules/:moduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async deleteModule(@Param('moduleId') moduleId: string) {
    await this.programmesService.deleteModule(moduleId);
  }

  @Put('modules/:moduleId/lessons/reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async reorderLessons(
    @Param('moduleId') moduleId: string,
    @Body() body: { lessonIds: string[] },
  ) {
    if (!Array.isArray(body?.lessonIds)) {
      throw new BadRequestException('lessonIds array is required');
    }
    return this.programmesService.reorderLessons(moduleId, body.lessonIds);
  }

  @Patch('modules/:moduleId/lessons/:lessonId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body()
    body: {
      title?: string;
      type?: string;
      description?: string | null;
      durationMinutes?: number | null;
      isMandatory?: boolean;
      externalUrl?: string | null;
    },
  ) {
    return this.programmesService.updateLesson(lessonId, body);
  }

  @Delete('modules/:moduleId/lessons/:lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async deleteLesson(@Param('lessonId') lessonId: string) {
    await this.programmesService.deleteLesson(lessonId);
  }
}
