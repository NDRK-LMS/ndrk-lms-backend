import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ContentService } from './content.service';
import { S3Service } from './s3.service';
import { PrismaService } from '../prisma/prisma.service';

const mockContent = {
  id: 'cnt-uuid-1',
  title: 'Intro Video',
  description: 'Module 1 intro',
  type: 'VIDEO',
  s3_key: 'content/uploads/user1/video.mp4',
  s3_bucket: 'ndrk-lms-content',
  file_size_bytes: BigInt(52428800),
  mime_type: 'video/mp4',
  duration_seconds: 300,
  transcode_status: 'PENDING',
  transcode_job_id: null,
  hls_manifest_key: null,
  thumbnail_url: null,
  tags: ['intro'],
  uploaded_by: 'user-uuid-1',
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

const mockPrisma = {
  contents: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  lessons: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockS3 = {
  generateS3Key: jest.fn().mockReturnValue('content/uploads/user1/12345-uuid.mp4'),
  generatePresignedUploadUrl: jest.fn().mockResolvedValue({
    upload_url: 'https://mock-s3-url.com/upload',
    s3_key: 'content/uploads/user1/12345-uuid.mp4',
    expires_in: 3600,
  }),
  generateSignedPlaybackUrl: jest.fn().mockResolvedValue({
    url: 'https://mock-cdn.com/playback',
    expires_in: 3600,
  }),
};

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create content with uploaded_by from JWT (BR-005)', async () => {
      mockPrisma.contents.create.mockResolvedValue(mockContent);

      await service.create(
        { title: 'Intro Video', type: 'VIDEO' as any, tags: ['intro'] },
        'user-uuid-1',
      );

      expect(mockPrisma.contents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            uploaded_by: 'user-uuid-1',
            title: 'Intro Video',
          }),
        }),
      );
    });

    it('should set transcode_status PENDING for VIDEO (BR-012)', async () => {
      mockPrisma.contents.create.mockResolvedValue(mockContent);

      await service.create({ title: 'Video', type: 'VIDEO' as any }, 'user-1');

      expect(mockPrisma.contents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transcode_status: 'PENDING',
          }),
        }),
      );
    });

    it('should set transcode_status COMPLETED for DOCUMENT (BR-013)', async () => {
      mockPrisma.contents.create.mockResolvedValue({ ...mockContent, type: 'DOCUMENT' });

      await service.create({ title: 'Doc', type: 'DOCUMENT' as any }, 'user-1');

      expect(mockPrisma.contents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transcode_status: 'COMPLETED',
          }),
        }),
      );
    });

    it('should set transcode_status COMPLETED for EXTERNAL_LINK (BR-013)', async () => {
      mockPrisma.contents.create.mockResolvedValue({ ...mockContent, type: 'EXTERNAL_LINK' });

      await service.create({ title: 'Link', type: 'EXTERNAL_LINK' as any }, 'user-1');

      expect(mockPrisma.contents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transcode_status: 'COMPLETED',
          }),
        }),
      );
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated content with defaults (BR-020, BR-023)', async () => {
      mockPrisma.contents.findMany.mockResolvedValue([mockContent]);
      mockPrisma.contents.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result).toEqual({
        data: [mockContent],
        total: 1,
        totalPages: 1,
        page: 1,
        limit: 20,
      });
      expect(mockPrisma.contents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: 'desc' },
          where: { deleted_at: null },
        }),
      );
    });

    it('should search by title and description (BR-021)', async () => {
      mockPrisma.contents.findMany.mockResolvedValue([]);
      mockPrisma.contents.count.mockResolvedValue(0);

      await service.findAll({ search: 'intro' });

      const where = mockPrisma.contents.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { title: { contains: 'intro', mode: 'insensitive' } },
        { description: { contains: 'intro', mode: 'insensitive' } },
      ]);
    });

    it('should filter by type (BR-022)', async () => {
      mockPrisma.contents.findMany.mockResolvedValue([]);
      mockPrisma.contents.count.mockResolvedValue(0);

      await service.findAll({ type: 'VIDEO' });

      const where = mockPrisma.contents.findMany.mock.calls[0][0].where;
      expect(where.type).toBe('VIDEO');
    });

    it('should filter by transcode_status (BR-022)', async () => {
      mockPrisma.contents.findMany.mockResolvedValue([]);
      mockPrisma.contents.count.mockResolvedValue(0);

      await service.findAll({ transcode_status: 'COMPLETED' });

      const where = mockPrisma.contents.findMany.mock.calls[0][0].where;
      expect(where.transcode_status).toBe('COMPLETED');
    });

    it('should cap limit at 100 (BR-023)', async () => {
      mockPrisma.contents.findMany.mockResolvedValue([]);
      mockPrisma.contents.count.mockResolvedValue(0);

      const result = await service.findAll({ limit: 500 });

      expect(result.limit).toBe(100);
      expect(mockPrisma.contents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should filter by uploaded_by (BR-022)', async () => {
      mockPrisma.contents.findMany.mockResolvedValue([]);
      mockPrisma.contents.count.mockResolvedValue(0);

      await service.findAll({ uploaded_by: 'user-uuid-1' });

      const where = mockPrisma.contents.findMany.mock.calls[0][0].where;
      expect(where.uploaded_by).toBe('user-uuid-1');
    });
  });

  // ── findById ────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return content with usage_count', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(mockContent);
      mockPrisma.lessons.count.mockResolvedValue(3);

      const result = await service.findById('cnt-uuid-1');

      expect(result.usage_count).toBe(3);
      expect(result.title).toBe('Intro Video');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update metadata fields (BR-007)', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(mockContent);
      mockPrisma.contents.update.mockResolvedValue({ ...mockContent, title: 'Updated' });

      await service.update('cnt-uuid-1', { title: 'Updated' });

      expect(mockPrisma.contents.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cnt-uuid-1' },
          data: expect.objectContaining({ title: 'Updated' }),
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── softDelete ──────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('should set deleted_at (BR-009)', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(mockContent);
      mockPrisma.lessons.count.mockResolvedValue(0);
      mockPrisma.contents.update.mockResolvedValue({});

      const result = await service.softDelete('cnt-uuid-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.contents.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deleted_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw ConflictException when referenced by lessons (BR-010)', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(mockContent);
      mockPrisma.lessons.count.mockResolvedValue(2);

      await expect(service.softDelete('cnt-uuid-1')).rejects.toThrow(ConflictException);
      await expect(service.softDelete('cnt-uuid-1')).rejects.toThrow('referenced by 2 lesson(s)');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getUploadUrl ────────────────────────────────────────────────────

  describe('getUploadUrl', () => {
    it('should generate presigned URL with user-scoped key (BR-006, BR-016)', async () => {
      const result = await service.getUploadUrl(
        { filename: 'lecture.mp4', content_type: 'video/mp4' },
        'user-uuid-1',
      );

      expect(mockS3.generateS3Key).toHaveBeenCalledWith('user-uuid-1', 'lecture.mp4');
      expect(result).toHaveProperty('upload_url');
      expect(result).toHaveProperty('s3_key');
      expect(result).toHaveProperty('expires_in', 3600);
    });
  });

  // ── getSignedPlaybackUrl ────────────────────────────────────────────

  describe('getSignedPlaybackUrl', () => {
    it('should return signed URL (BR-017)', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(mockContent);

      const result = await service.getSignedPlaybackUrl('cnt-uuid-1');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('expires_in', 3600);
    });

    it('should throw NotFoundException when not found (BR-018)', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(null);

      await expect(service.getSignedPlaybackUrl('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getTranscodeStatus ──────────────────────────────────────────────

  describe('getTranscodeStatus', () => {
    it('should return transcode fields', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue({
        id: 'cnt-uuid-1',
        transcode_status: 'PROCESSING',
        transcode_job_id: 'job-123',
        hls_manifest_key: null,
      });

      const result = await service.getTranscodeStatus('cnt-uuid-1');

      expect(result.transcode_status).toBe('PROCESSING');
      expect(result.transcode_job_id).toBe('job-123');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(null);

      await expect(service.getTranscodeStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── replaceFile ─────────────────────────────────────────────────────

  describe('replaceFile', () => {
    it('should reset transcode_status to PENDING (BR-014)', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(mockContent);
      mockPrisma.contents.update.mockResolvedValue({
        ...mockContent,
        s3_key: 'new-key.mp4',
        transcode_status: 'PENDING',
      });

      await service.replaceFile('cnt-uuid-1', {
        s3_key: 'new-key.mp4',
        file_size_bytes: 100000,
      });

      expect(mockPrisma.contents.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            s3_key: 'new-key.mp4',
            transcode_status: 'PENDING',
            hls_manifest_key: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(null);

      await expect(
        service.replaceFile('nonexistent', { s3_key: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getUsage ────────────────────────────────────────────────────────

  describe('getUsage', () => {
    it('should return referencing lessons with programme info', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue({ id: 'cnt-uuid-1' });
      mockPrisma.lessons.findMany.mockResolvedValue([
        {
          id: 'les-1',
          title: 'Lesson 1',
          modules: {
            title: 'Module A',
            programmes: { title: 'Programme X' },
          },
        },
      ]);

      const result = await service.getUsage('cnt-uuid-1');

      expect(result.total).toBe(1);
      expect(result.lessons[0]).toEqual({
        id: 'les-1',
        title: 'Lesson 1',
        module_title: 'Module A',
        programme_title: 'Programme X',
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.contents.findFirst.mockResolvedValue(null);

      await expect(service.getUsage('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
