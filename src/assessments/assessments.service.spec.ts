import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { PrismaService } from '../prisma/prisma.service';

const mockAssessment = {
  id: 'asm-uuid-1',
  title: 'Module 1 Quiz',
  description: 'Test quiz',
  type: 'QUIZ',
  programme_id: 'prog-uuid-1',
  module_id: null,
  batch_id: null,
  status: 'DRAFT',
  duration_minutes: 30,
  max_attempts: 2,
  passing_score: 60,
  total_points: 100,
  shuffle_questions: false,
  shuffle_options: false,
  show_results: 'AFTER_GRADING',
  allow_review: true,
  negative_marking: false,
  negative_mark_value: null,
  available_from: null,
  available_until: null,
  created_by: 'user-uuid-1',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockQuestion = {
  id: 'q-uuid-1',
  assessment_id: 'asm-uuid-1',
  type: 'MCQ_SINGLE',
  question_text: 'What is 2+2?',
  explanation: 'Basic math',
  points: 10,
  sequence: 0,
  image_url: null,
  tags: [],
  created_at: new Date(),
  updated_at: new Date(),
  question_options: [
    { id: 'opt-1', question_id: 'q-uuid-1', option_text: '3', is_correct: false, sequence: 0, image_url: null },
    { id: 'opt-2', question_id: 'q-uuid-1', option_text: '4', is_correct: true, sequence: 1, image_url: null },
  ],
  assessments: mockAssessment,
};

const mockPrisma = {
  assessments: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  questions: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  question_options: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  submissions: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  answers: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AssessmentsService', () => {
  let service: AssessmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AssessmentsService>(AssessmentsService);
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create assessment with DRAFT status', async () => {
      mockPrisma.assessments.create.mockResolvedValue(mockAssessment);

      await service.create({
        title: 'Module 1 Quiz', type: 'QUIZ' as any,
        programme_id: 'prog-uuid-1', total_points: 100,
      }, 'user-uuid-1');

      expect(mockPrisma.assessments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
            created_by: 'user-uuid-1',
          }),
        }),
      );
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated assessments', async () => {
      mockPrisma.assessments.findMany.mockResolvedValue([{
        ...mockAssessment,
        _count: { questions: 5, submissions: 10 },
        programmes: { title: 'Programme X' },
      }]);
      mockPrisma.assessments.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data[0].question_count).toBe(5);
      expect(result.data[0].submission_count).toBe(10);
      expect(result.data[0].programme_title).toBe('Programme X');
    });

    it('should filter by type and status', async () => {
      mockPrisma.assessments.findMany.mockResolvedValue([]);
      mockPrisma.assessments.count.mockResolvedValue(0);

      await service.findAll({ type: 'QUIZ', status: 'DRAFT' });

      const where = mockPrisma.assessments.findMany.mock.calls[0][0].where;
      expect(where.type).toBe('QUIZ');
      expect(where.status).toBe('DRAFT');
    });
  });

  // ── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update DRAFT assessment (BR-002)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue(mockAssessment);
      mockPrisma.assessments.update.mockResolvedValue(mockAssessment);

      await service.update('asm-uuid-1', { title: 'Updated' });

      expect(mockPrisma.assessments.update).toHaveBeenCalled();
    });

    it('should reject update on ACTIVE assessment (BR-002)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({ ...mockAssessment, status: 'ACTIVE' });

      await expect(service.update('asm-uuid-1', { title: 'X' })).rejects.toThrow(BadRequestException);
      await expect(service.update('asm-uuid-1', { title: 'X' })).rejects.toThrow('Cannot edit assessment after publishing');
    });
  });

  // ── publish ─────────────────────────────────────────────────────────

  describe('publish', () => {
    it('should publish DRAFT with valid questions (BR-001)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({
        ...mockAssessment,
        questions: [{ points: 50 }, { points: 50 }],
      });
      mockPrisma.assessments.update.mockResolvedValue({ ...mockAssessment, status: 'ACTIVE' });

      await service.publish('asm-uuid-1');

      expect(mockPrisma.assessments.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should reject if no questions (BR-003)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({
        ...mockAssessment,
        questions: [],
      });

      await expect(service.publish('asm-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.publish('asm-uuid-1')).rejects.toThrow('without questions');
    });

    it('should reject if points mismatch (BR-004)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({
        ...mockAssessment,
        total_points: 100,
        questions: [{ points: 30 }, { points: 30 }], // sum=60, not 100
      });

      await expect(service.publish('asm-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.publish('asm-uuid-1')).rejects.toThrow('does not match');
    });

    it('should reject if not DRAFT (BR-001)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({
        ...mockAssessment,
        status: 'ACTIVE',
        questions: [{ points: 100 }],
      });

      await expect(service.publish('asm-uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.publish('asm-uuid-1')).rejects.toThrow('Only DRAFT');
    });
  });

  // ── Questions CRUD ──────────────────────────────────────────────────

  describe('addQuestion', () => {
    it('should add question with auto-sequence', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue(mockAssessment);
      mockPrisma.questions.count.mockResolvedValue(2);
      mockPrisma.questions.create.mockResolvedValue({ ...mockQuestion, sequence: 2 });
      mockPrisma.question_options.createMany.mockResolvedValue({});
      mockPrisma.questions.findUnique.mockResolvedValue(mockQuestion);

      await service.addQuestion('asm-uuid-1', {
        type: 'MCQ_SINGLE' as any,
        question_text: 'What is 2+2?',
        points: 10,
        options: [
          { option_text: '3', is_correct: false },
          { option_text: '4', is_correct: true },
        ],
      });

      expect(mockPrisma.questions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sequence: 2 }),
        }),
      );
    });

    it('should reject adding to ACTIVE assessment (BR-002)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({ ...mockAssessment, status: 'ACTIVE' });

      await expect(service.addQuestion('asm-uuid-1', {
        type: 'MCQ_SINGLE' as any, question_text: 'X', points: 5,
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question from DRAFT assessment', async () => {
      mockPrisma.questions.findUnique.mockResolvedValue(mockQuestion);
      mockPrisma.questions.delete.mockResolvedValue({});

      const result = await service.deleteQuestion('q-uuid-1');

      expect(result).toEqual({ success: true });
    });

    it('should reject deleting from ACTIVE assessment (BR-002)', async () => {
      mockPrisma.questions.findUnique.mockResolvedValue({
        ...mockQuestion,
        assessments: { ...mockAssessment, status: 'ACTIVE' },
      });

      await expect(service.deleteQuestion('q-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorderQuestions', () => {
    it('should reject invalid IDs', async () => {
      mockPrisma.questions.findMany.mockResolvedValue([{ id: 'q-1' }]);

      await expect(service.reorderQuestions('asm-uuid-1', ['q-1', 'q-invalid']))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── Auto-grade ──────────────────────────────────────────────────────

  describe('autoGrade', () => {
    it('should auto-grade MCQ correctly (BR-009, BR-012, BR-013)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({
        ...mockAssessment,
        total_points: 10,
        passing_score: 60,
        negative_marking: false,
        questions: [{
          id: 'q-1', type: 'MCQ_SINGLE', points: 10,
          question_options: [
            { id: 'opt-1', is_correct: false },
            { id: 'opt-2', is_correct: true },
          ],
        }],
      });
      mockPrisma.submissions.findMany.mockResolvedValue([{
        id: 'sub-1',
        answers: [{
          id: 'ans-1', question_id: 'q-1',
          selected_option_ids: ['opt-2'],
        }],
      }]);
      mockPrisma.answers.update.mockResolvedValue({});
      mockPrisma.submissions.update.mockResolvedValue({});

      const result = await service.autoGrade('asm-uuid-1');

      expect(result.graded).toBe(1);
      expect(mockPrisma.answers.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCorrect: true, points_awarded: 10 }),
        }),
      );
      expect(mockPrisma.submissions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_score: 10,
            percentage: 100,
            is_passed: true,
            status: 'GRADED',
          }),
        }),
      );
    });

    it('should apply negative marking (BR-010)', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue({
        ...mockAssessment,
        total_points: 10,
        negative_marking: true,
        negative_mark_value: 2,
        questions: [{
          id: 'q-1', type: 'MCQ_SINGLE', points: 10,
          question_options: [
            { id: 'opt-1', is_correct: true },
            { id: 'opt-2', is_correct: false },
          ],
        }],
      });
      mockPrisma.submissions.findMany.mockResolvedValue([{
        id: 'sub-1',
        answers: [{
          id: 'ans-1', question_id: 'q-1',
          selected_option_ids: ['opt-2'], // wrong answer
        }],
      }]);
      mockPrisma.answers.update.mockResolvedValue({});
      mockPrisma.submissions.update.mockResolvedValue({});

      await service.autoGrade('asm-uuid-1');

      expect(mockPrisma.answers.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCorrect: false, points_awarded: 0 }),
        }),
      );
    });
  });

  // ── Manual grading ──────────────────────────────────────────────────

  describe('gradeSubmission', () => {
    it('should grade and recalculate total (BR-012, BR-013)', async () => {
      mockPrisma.submissions.findUnique.mockResolvedValue({
        id: 'sub-1',
        assessments: { total_points: 100, passing_score: 60 },
        answers: [],
      });
      mockPrisma.answers.update.mockResolvedValue({});
      mockPrisma.answers.findMany.mockResolvedValue([
        { points_awarded: 40 },
        { points_awarded: 35 },
      ]);
      mockPrisma.submissions.update.mockResolvedValue({});

      await service.gradeSubmission('sub-1', [
        { answer_id: 'a-1', points_awarded: 40, feedback: 'Good' },
        { answer_id: 'a-2', points_awarded: 35 },
      ], 'grader-uuid');

      expect(mockPrisma.submissions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total_score: 75,
            percentage: 75,
            is_passed: true,
            graded_by: 'grader-uuid',
          }),
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.submissions.findUnique.mockResolvedValue(null);

      await expect(service.gradeSubmission('nonexistent', [], 'user')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Analytics ──────────────────────────────────────────────────────

  describe('getAnalytics', () => {
    it('should return score distribution and pass rate', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue(mockAssessment);
      mockPrisma.submissions.findMany.mockResolvedValue([
        { percentage: 85, is_passed: true, answers: [] },
        { percentage: 45, is_passed: false, answers: [] },
        { percentage: 72, is_passed: true, answers: [] },
      ]);

      const result = await service.getAnalytics('asm-uuid-1');

      expect(result.total_submissions).toBe(3);
      expect(result.avg_score).toBeCloseTo(67.33, 1);
      expect(result.pass_rate).toBeCloseTo(66.67, 1);
      expect(result.score_distribution).toHaveLength(5);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.assessments.findUnique.mockResolvedValue(null);

      await expect(service.getAnalytics('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
