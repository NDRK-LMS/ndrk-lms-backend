import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, ContentType, TranscodeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';
import { CreateContentDto, UploadUrlDto, ReplaceFileDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

export interface FindAllContentOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  transcode_status?: string;
  uploaded_by?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  // BR-012, BR-013: Set transcode_status based on type
  private getInitialTranscodeStatus(type: ContentType): TranscodeStatus {
    return type === ContentType.VIDEO
      ? TranscodeStatus.PENDING
      : TranscodeStatus.COMPLETED;
  }

  // BR-005: uploaded_by from JWT
  async create(dto: CreateContentDto, uploadedBy: string) {
    return this.prisma.contents.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        s3_key: dto.s3_key ?? null,
        s3_bucket: dto.s3_bucket ?? null,
        file_size_bytes: dto.file_size_bytes ?? null,
        mime_type: dto.mime_type ?? null,
        duration_seconds: dto.duration_seconds ?? null,
        transcode_status: this.getInitialTranscodeStatus(dto.type),
        tags: dto.tags ?? [],
        uploaded_by: uploadedBy,
        updated_at: new Date(),
      },
    });
  }

  // BR-020, BR-021, BR-022, BR-023
  async findAll(options: FindAllContentOptions = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      transcode_status,
      uploaded_by,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    const take = Math.min(limit, 100);

    const sortByMap: Record<string, string> = {
      createdAt: 'created_at',
      title: 'title',
      fileSize: 'file_size_bytes',
      type: 'type',
    };
    const orderField = sortByMap[sortBy] ?? sortBy;

    const where: Prisma.contentsWhereInput = { deleted_at: null };

    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (type && type !== 'all') {
      where.type = type as ContentType;
    }

    if (transcode_status && transcode_status !== 'all') {
      where.transcode_status = transcode_status as TranscodeStatus;
    }

    if (uploaded_by) {
      where.uploaded_by = uploaded_by;
    }

    const [data, total] = await Promise.all([
      this.prisma.contents.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: { [orderField]: sortOrder },
      }),
      this.prisma.contents.count({ where }),
    ]);

    return {
      data,
      total,
      totalPages: Math.max(1, Math.ceil(total / take)),
      page,
      limit: take,
    };
  }

  async findById(id: string) {
    const content = await this.prisma.contents.findFirst({
      where: { id, deleted_at: null },
    });
    if (!content) throw new NotFoundException('Content not found');

    const usageCount = await this.prisma.lessons.count({
      where: { content_id: id },
    });

    return { ...content, usage_count: usageCount };
  }

  // BR-007, BR-011: title required, type cannot change
  async update(id: string, dto: UpdateContentDto) {
    const content = await this.prisma.contents.findFirst({
      where: { id, deleted_at: null },
    });
    if (!content) throw new NotFoundException('Content not found');

    return this.prisma.contents.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.thumbnail_url !== undefined && { thumbnail_url: dto.thumbnail_url }),
        updated_at: new Date(),
      },
    });
  }

  // BR-009, BR-010: soft delete, check lesson references
  async softDelete(id: string) {
    const content = await this.prisma.contents.findFirst({
      where: { id, deleted_at: null },
    });
    if (!content) throw new NotFoundException('Content not found');

    const lessonCount = await this.prisma.lessons.count({
      where: { content_id: id },
    });
    if (lessonCount > 0) {
      throw new ConflictException(
        `Cannot delete content: referenced by ${lessonCount} lesson(s)`,
      );
    }

    await this.prisma.contents.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return { success: true };
  }

  // BR-006, BR-016: presigned upload URL
  async getUploadUrl(dto: UploadUrlDto, userId: string) {
    const s3Key = this.s3.generateS3Key(userId, dto.filename);
    return this.s3.generatePresignedUploadUrl(s3Key, dto.content_type);
  }

  // BR-017, BR-018: signed playback URL
  async getSignedPlaybackUrl(id: string) {
    const content = await this.prisma.contents.findFirst({
      where: { id, deleted_at: null },
    });
    if (!content) throw new NotFoundException('Content not found');

    return this.s3.generateSignedPlaybackUrl(
      content.hls_manifest_key,
      content.s3_key,
    );
  }

  async getTranscodeStatus(id: string) {
    const content = await this.prisma.contents.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        transcode_status: true,
        transcode_job_id: true,
        hls_manifest_key: true,
      },
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  // BR-014: reset transcode_status on replace
  async replaceFile(id: string, dto: ReplaceFileDto) {
    const content = await this.prisma.contents.findFirst({
      where: { id, deleted_at: null },
    });
    if (!content) throw new NotFoundException('Content not found');

    return this.prisma.contents.update({
      where: { id },
      data: {
        s3_key: dto.s3_key,
        file_size_bytes: dto.file_size_bytes ?? null,
        mime_type: dto.mime_type ?? null,
        transcode_status: TranscodeStatus.PENDING,
        hls_manifest_key: null,
        updated_at: new Date(),
      },
    });
  }

  async getUsage(id: string) {
    const content = await this.prisma.contents.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!content) throw new NotFoundException('Content not found');

    const lessons = await this.prisma.lessons.findMany({
      where: { content_id: id },
      select: {
        id: true,
        title: true,
        modules: {
          select: {
            title: true,
            programmes: {
              select: { title: true },
            },
          },
        },
      },
    });

    return {
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        module_title: l.modules.title,
        programme_title: l.modules.programmes.title,
      })),
      total: lessons.length,
    };
  }
}
