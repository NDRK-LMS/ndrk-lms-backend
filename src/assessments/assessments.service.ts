import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, AssessmentStatus, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto, CreateQuestionDto } from './dto/assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  // ── Assessment CRUD ──────────────────────────────────────────────────

  async create(dto: CreateAssessmentDto, createdBy: string) {
    return this.prisma.assessments.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        programme_id: dto.programme_id,
        module_id: dto.module_id ?? null,
        batch_id: dto.batch_id ?? null,
        status: AssessmentStatus.DRAFT,
        duration_minutes: dto.duration_minutes ?? null,
        max_attempts: dto.max_attempts ?? 1,
        passing_score: dto.passing_score ?? null,
        total_points: dto.total_points,
        shuffle_questions: dto.shuffle_questions ?? false,
        shuffle_options: dto.shuffle_options ?? false,
        show_results: dto.show_results ?? 'AFTER_GRADING',
        allow_review: dto.allow_review ?? true,
        negative_marking: dto.negative_marking ?? false,
        negative_mark_value: dto.negative_mark_value ?? null,
        available_from: dto.available_from ? new Date(dto.available_from) : null,
        available_until: dto.available_until ? new Date(dto.available_until) : null,
        created_by: createdBy,
        updated_at: new Date(),
      },
    });
  }

  async findAll(options: {
    page?: number; limit?: number; search?: string;
    type?: string; status?: string; programme_id?: string;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
  } = {}) {
    const { page = 1, limit = 20, search, type, status, programme_id,
      sortBy = 'created_at', sortOrder = 'desc' } = options;

    const where: Prisma.assessmentsWhereInput = {};

    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (type && type !== 'all') where.type = type as any;
    if (status && status !== 'all') where.status = status as any;
    if (programme_id) where.programme_id = programme_id;

    const [data, total] = await Promise.all([
      this.prisma.assessments.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { questions: true, submissions: true } },
          programmes: { select: { title: true } },
        },
      }),
      this.prisma.assessments.count({ where }),
    ]);

    return {
      data: data.map((a) => ({
        ...a,
        question_count: a._count.questions,
        submission_count: a._count.submissions,
        programme_title: a.programmes.title,
        _count: undefined,
        programmes: undefined,
      })),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  }

  async findById(id: string) {
    const assessment = await this.prisma.assessments.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sequence: 'asc' },
          include: { question_options: { orderBy: { sequence: 'asc' } } },
        },
        programmes: { select: { title: true } },
        _count: { select: { submissions: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async update(id: string, data: Partial<CreateAssessmentDto>) {
    const assessment = await this.prisma.assessments.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    // BR-002: Cannot edit after ACTIVE
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Cannot edit assessment after publishing');
    }

    const updateData: any = { updated_at: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.duration_minutes !== undefined) updateData.duration_minutes = data.duration_minutes;
    if (data.max_attempts !== undefined) updateData.max_attempts = data.max_attempts;
    if (data.passing_score !== undefined) updateData.passing_score = data.passing_score;
    if (data.total_points !== undefined) updateData.total_points = data.total_points;
    if (data.shuffle_questions !== undefined) updateData.shuffle_questions = data.shuffle_questions;
    if (data.shuffle_options !== undefined) updateData.shuffle_options = data.shuffle_options;
    if (data.show_results !== undefined) updateData.show_results = data.show_results;
    if (data.negative_marking !== undefined) updateData.negative_marking = data.negative_marking;
    if (data.negative_mark_value !== undefined) updateData.negative_mark_value = data.negative_mark_value;
    if (data.available_from !== undefined) updateData.available_from = data.available_from ? new Date(data.available_from) : null;
    if (data.available_until !== undefined) updateData.available_until = data.available_until ? new Date(data.available_until) : null;

    return this.prisma.assessments.update({ where: { id }, data: updateData });
  }

  // BR-001, BR-003, BR-004: Publish validation
  async publish(id: string) {
    const assessment = await this.prisma.assessments.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT assessments can be published');
    }

    // BR-003: Must have at least 1 question
    if (assessment.questions.length === 0) {
      throw new BadRequestException('Cannot publish assessment without questions');
    }

    // BR-004: total_points must match sum of question points
    const sumPoints = assessment.questions.reduce(
      (sum, q) => sum + Number(q.points), 0,
    );
    if (Math.abs(sumPoints - Number(assessment.total_points)) > 0.01) {
      throw new BadRequestException(
        `Total points (${assessment.total_points}) does not match sum of question points (${sumPoints})`,
      );
    }

    return this.prisma.assessments.update({
      where: { id },
      data: { status: AssessmentStatus.ACTIVE, updated_at: new Date() },
    });
  }

  // ── Questions CRUD ──────────────────────────────────────────────────

  async addQuestion(assessmentId: string, dto: CreateQuestionDto) {
    const assessment = await this.prisma.assessments.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Cannot add questions after publishing');
    }

    const sequence = await this.prisma.questions.count({ where: { assessment_id: assessmentId } });

    const question = await this.prisma.questions.create({
      data: {
        assessment_id: assessmentId,
        type: dto.type,
        question_text: dto.question_text,
        explanation: dto.explanation ?? null,
        points: dto.points,
        sequence,
        image_url: dto.image_url ?? null,
        tags: dto.tags ?? [],
        updated_at: new Date(),
      },
    });

    // Create options for MCQ/TRUE_FALSE
    if (dto.options?.length) {
      await this.prisma.question_options.createMany({
        data: dto.options.map((opt, i) => ({
          question_id: question.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          sequence: i,
          image_url: opt.image_url ?? null,
        })),
      });
    }

    return this.prisma.questions.findUnique({
      where: { id: question.id },
      include: { question_options: { orderBy: { sequence: 'asc' } } },
    });
  }

  async updateQuestion(questionId: string, dto: Partial<CreateQuestionDto>) {
    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      include: { assessments: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.assessments.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Cannot edit questions after publishing');
    }

    const updateData: any = { updated_at: new Date() };
    if (dto.question_text !== undefined) updateData.question_text = dto.question_text;
    if (dto.explanation !== undefined) updateData.explanation = dto.explanation;
    if (dto.points !== undefined) updateData.points = dto.points;
    if (dto.image_url !== undefined) updateData.image_url = dto.image_url;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    await this.prisma.questions.update({ where: { id: questionId }, data: updateData });

    // Replace options if provided
    if (dto.options) {
      await this.prisma.question_options.deleteMany({ where: { question_id: questionId } });
      await this.prisma.question_options.createMany({
        data: dto.options.map((opt, i) => ({
          question_id: questionId,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          sequence: i,
          image_url: opt.image_url ?? null,
        })),
      });
    }

    return this.prisma.questions.findUnique({
      where: { id: questionId },
      include: { question_options: { orderBy: { sequence: 'asc' } } },
    });
  }

  async deleteQuestion(questionId: string) {
    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      include: { assessments: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.assessments.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Cannot delete questions after publishing');
    }

    await this.prisma.questions.delete({ where: { id: questionId } });
    return { success: true };
  }

  async reorderQuestions(assessmentId: string, questionIds: string[]) {
    const questions = await this.prisma.questions.findMany({
      where: { assessment_id: assessmentId },
      select: { id: true },
    });
    const validIds = new Set(questions.map((q) => q.id));
    if (!questionIds.every((id) => validIds.has(id))) {
      throw new BadRequestException('Invalid question IDs');
    }

    await this.prisma.$transaction(
      questionIds.map((id, index) =>
        this.prisma.questions.update({ where: { id }, data: { sequence: index } }),
      ),
    );

    return this.findById(assessmentId);
  }

  // ── Submissions & Grading ──────────────────────────────────────────

  async getSubmissions(assessmentId: string) {
    const assessment = await this.prisma.assessments.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    return this.prisma.submissions.findMany({
      where: { assessment_id: assessmentId },
      include: {
        users_submissions_user_idTousers: {
          select: { id: true, full_name: true, email: true },
        },
      },
      orderBy: { started_at: 'desc' },
    });
  }

  async getSubmissionDetail(submissionId: string) {
    const submission = await this.prisma.submissions.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: {
            questions: {
              include: { question_options: { orderBy: { sequence: 'asc' } } },
            },
          },
        },
        users_submissions_user_idTousers: {
          select: { id: true, full_name: true, email: true },
        },
        assessments: { select: { title: true, total_points: true, passing_score: true } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  // BR-009, BR-010, BR-011, BR-012, BR-013: Auto-grade MCQ/TRUE_FALSE
  async autoGrade(assessmentId: string) {
    const assessment = await this.prisma.assessments.findUnique({
      where: { id: assessmentId },
      include: { questions: { include: { question_options: true } } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const submissions = await this.prisma.submissions.findMany({
      where: { assessment_id: assessmentId },
      include: { answers: true },
    });

    for (const submission of submissions) {
      let totalScore = 0;

      for (const answer of submission.answers) {
        const question = assessment.questions.find((q) => q.id === answer.question_id);
        if (!question) continue;

        // Only auto-grade MCQ and TRUE_FALSE
        if (['MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE'].includes(question.type)) {
          const correctIds = question.question_options
            .filter((o) => o.is_correct)
            .map((o) => o.id)
            .sort();
          const selectedIds = [...(answer.selected_option_ids ?? [])].sort();

          const isCorrect =
            correctIds.length === selectedIds.length &&
            correctIds.every((id, i) => id === selectedIds[i]);

          let pointsAwarded = 0;
          if (isCorrect) {
            pointsAwarded = Number(question.points);
          } else if (assessment.negative_marking && selectedIds.length > 0) {
            pointsAwarded = -Number(assessment.negative_mark_value ?? 0);
          }

          totalScore += pointsAwarded;

          await this.prisma.answers.update({
            where: { id: answer.id },
            data: {
              isCorrect: isCorrect,
              points_awarded: Math.max(0, pointsAwarded),
            },
          });
        }
      }

      // Calculate percentage and pass/fail
      const totalPoints = Number(assessment.total_points);
      const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
      const isPassed = assessment.passing_score
        ? percentage >= Number(assessment.passing_score)
        : null;

      await this.prisma.submissions.update({
        where: { id: submission.id },
        data: {
          total_score: Math.max(0, totalScore),
          percentage: Math.max(0, Math.round(percentage * 100) / 100),
          is_passed: isPassed,
          status: 'GRADED',
          graded_at: new Date(),
        },
      });
    }

    return { graded: submissions.length };
  }

  // Manual grading
  async gradeSubmission(submissionId: string, grades: { answer_id: string; points_awarded: number; feedback?: string }[], gradedBy: string) {
    const submission = await this.prisma.submissions.findUnique({
      where: { id: submissionId },
      include: { assessments: true, answers: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    for (const grade of grades) {
      await this.prisma.answers.update({
        where: { id: grade.answer_id },
        data: {
          points_awarded: grade.points_awarded,
          feedback: grade.feedback ?? null,
        },
      });
    }

    // Recalculate total
    const allAnswers = await this.prisma.answers.findMany({
      where: { submission_id: submissionId },
    });
    const totalScore = allAnswers.reduce((sum, a) => sum + Number(a.points_awarded ?? 0), 0);
    const totalPoints = Number(submission.assessments.total_points);
    const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
    const isPassed = submission.assessments.passing_score
      ? percentage >= Number(submission.assessments.passing_score)
      : null;

    return this.prisma.submissions.update({
      where: { id: submissionId },
      data: {
        total_score: totalScore,
        percentage: Math.round(percentage * 100) / 100,
        is_passed: isPassed,
        status: 'GRADED',
        graded_by: gradedBy,
        graded_at: new Date(),
      },
    });
  }

  // ── Analytics ──────────────────────────────────────────────────────

  async getAnalytics(assessmentId: string) {
    const assessment = await this.prisma.assessments.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const submissions = await this.prisma.submissions.findMany({
      where: { assessment_id: assessmentId, status: 'GRADED' },
      include: { answers: true },
    });

    const scores = submissions.map((s) => Number(s.percentage ?? 0));
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passCount = submissions.filter((s) => s.is_passed).length;

    const ranges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 },
    ];

    return {
      total_submissions: submissions.length,
      avg_score: Math.round(avgScore * 100) / 100,
      pass_rate: submissions.length ? Math.round((passCount / submissions.length) * 100 * 100) / 100 : 0,
      score_distribution: ranges.map(({ range, min, max }) => ({
        range,
        count: scores.filter((s) => s >= min && s <= max).length,
      })),
    };
  }

  // ── CSV Question Import ─────────────────────────────────────────────

  async importQuestionsFromCsv(assessmentId: string, csvText: string) {
    const assessment = await this.prisma.assessments.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Cannot add questions after publishing');
    }

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) throw new BadRequestException('CSV must have at least one data row');

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const typeIdx = header.indexOf('type');
    const textIdx = header.indexOf('question_text');
    const optAIdx = header.indexOf('option_a');
    const optBIdx = header.indexOf('option_b');
    const optCIdx = header.indexOf('option_c');
    const optDIdx = header.indexOf('option_d');
    const correctIdx = header.indexOf('correct_options');
    const pointsIdx = header.indexOf('points');
    const explanationIdx = header.indexOf('explanation');
    const tagsIdx = header.indexOf('tags');

    if (textIdx === -1 || pointsIdx === -1) {
      throw new BadRequestException('CSV must include question_text and points columns');
    }

    let currentSequence = await this.prisma.questions.count({ where: { assessment_id: assessmentId } });
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      const questionText = cols[textIdx]?.trim();
      const points = parseFloat(cols[pointsIdx]?.trim()) || 10;
      const type = (cols[typeIdx]?.trim().toUpperCase() || 'MCQ_SINGLE') as any;
      const explanation = explanationIdx >= 0 ? cols[explanationIdx]?.trim() || null : null;
      const tags = tagsIdx >= 0 ? (cols[tagsIdx]?.trim() || '').split(';').map((t: string) => t.trim()).filter(Boolean) : [];

      if (!questionText) {
        errors.push({ row: i + 1, message: 'Missing question_text' });
        continue;
      }

      try {
        const question = await this.prisma.questions.create({
          data: {
            assessment_id: assessmentId,
            type,
            question_text: questionText,
            explanation,
            points,
            sequence: currentSequence++,
            tags,
            updated_at: new Date(),
          },
        });

        // Create options for MCQ/TRUE_FALSE
        if (['MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE'].includes(type)) {
          const options: { text: string; idx: string }[] = [];
          if (optAIdx >= 0 && cols[optAIdx]?.trim()) options.push({ text: cols[optAIdx].trim(), idx: 'A' });
          if (optBIdx >= 0 && cols[optBIdx]?.trim()) options.push({ text: cols[optBIdx].trim(), idx: 'B' });
          if (optCIdx >= 0 && cols[optCIdx]?.trim()) options.push({ text: cols[optCIdx].trim(), idx: 'C' });
          if (optDIdx >= 0 && cols[optDIdx]?.trim()) options.push({ text: cols[optDIdx].trim(), idx: 'D' });

          const correctLetters = correctIdx >= 0
            ? cols[correctIdx]?.trim().toUpperCase().split(';').map((c: string) => c.trim())
            : [];

          if (options.length > 0) {
            await this.prisma.question_options.createMany({
              data: options.map((opt, seq) => ({
                question_id: question.id,
                option_text: opt.text,
                is_correct: correctLetters.includes(opt.idx),
                sequence: seq,
              })),
            });
          }
        }

        created.push(questionText);
      } catch (err) {
        errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return {
      imported: created.length,
      errors,
      total_questions: currentSequence,
    };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // ── Delete Assessment ───────────────────────────────────────────────

  async deleteAssessment(id: string) {
    const assessment = await this.prisma.assessments.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    if (assessment._count.submissions > 0) {
      throw new BadRequestException(
        `Cannot delete assessment with ${assessment._count.submissions} submission(s). Archive it instead.`,
      );
    }

    // Delete questions + options (cascade), then assessment
    await this.prisma.$transaction([
      this.prisma.question_options.deleteMany({
        where: { questions: { assessment_id: id } },
      }),
      this.prisma.questions.deleteMany({ where: { assessment_id: id } }),
      this.prisma.assessments.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  // ── Question Bank ──────────────────────────────────────────────────

  async getQuestionBank(options: {
    search?: string; type?: string; tags?: string; limit?: number; page?: number;
  } = {}) {
    const { search, type, tags, limit = 20, page = 1 } = options;

    const where: Prisma.questionsWhereInput = {};

    if (search?.trim()) {
      where.question_text = { contains: search.trim(), mode: 'insensitive' };
    }
    if (type && type !== 'all') {
      where.type = type as any;
    }
    if (tags?.trim()) {
      where.tags = { hasSome: tags.split(',').map((t) => t.trim()) };
    }

    const [data, total] = await Promise.all([
      this.prisma.questions.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          question_options: { orderBy: { sequence: 'asc' } },
          assessments: { select: { id: true, title: true } },
        },
      }),
      this.prisma.questions.count({ where }),
    ]);

    return {
      data: data.map((q) => ({
        id: q.id,
        type: q.type,
        question_text: q.question_text,
        explanation: q.explanation,
        points: q.points,
        tags: q.tags,
        image_url: q.image_url,
        options: q.question_options,
        source_assessment: q.assessments.title,
      })),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  }

  async copyQuestionFromBank(assessmentId: string, sourceQuestionId: string) {
    const assessment = await this.prisma.assessments.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Cannot add questions after publishing');
    }

    const source = await this.prisma.questions.findUnique({
      where: { id: sourceQuestionId },
      include: { question_options: { orderBy: { sequence: 'asc' } } },
    });
    if (!source) throw new NotFoundException('Source question not found');

    const sequence = await this.prisma.questions.count({ where: { assessment_id: assessmentId } });

    const newQuestion = await this.prisma.questions.create({
      data: {
        assessment_id: assessmentId,
        type: source.type,
        question_text: source.question_text,
        explanation: source.explanation,
        points: source.points,
        sequence,
        image_url: source.image_url,
        tags: source.tags,
        updated_at: new Date(),
      },
    });

    if (source.question_options.length > 0) {
      await this.prisma.question_options.createMany({
        data: source.question_options.map((opt) => ({
          question_id: newQuestion.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          sequence: opt.sequence,
          image_url: opt.image_url,
        })),
      });
    }

    return this.findById(assessmentId);
  }

  // ── Duplicate Assessment ───────────────────────────────────────────

  async duplicate(assessmentId: string, createdBy: string, overrides?: {
    title?: string; batch_id?: string; shuffle_questions?: boolean;
    negative_marking?: boolean; available_from?: string; available_until?: string;
  }) {
    const source = await this.prisma.assessments.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          orderBy: { sequence: 'asc' },
          include: { question_options: { orderBy: { sequence: 'asc' } } },
        },
      },
    });
    if (!source) throw new NotFoundException('Assessment not found');

    // Create the copy
    const copy = await this.prisma.assessments.create({
      data: {
        title: overrides?.title?.trim() || `${source.title} (Copy)`,
        description: source.description,
        type: source.type,
        programme_id: source.programme_id,
        module_id: source.module_id,
        batch_id: overrides?.batch_id ?? null,
        status: AssessmentStatus.DRAFT,
        duration_minutes: source.duration_minutes,
        max_attempts: source.max_attempts,
        passing_score: source.passing_score,
        total_points: source.total_points,
        shuffle_questions: overrides?.shuffle_questions ?? source.shuffle_questions,
        shuffle_options: source.shuffle_options,
        show_results: source.show_results,
        allow_review: source.allow_review,
        negative_marking: overrides?.negative_marking ?? source.negative_marking,
        negative_mark_value: source.negative_mark_value,
        available_from: overrides?.available_from ? new Date(overrides.available_from) : null,
        available_until: overrides?.available_until ? new Date(overrides.available_until) : null,
        created_by: createdBy,
        updated_at: new Date(),
      },
    });

    // Copy all questions with options
    for (const q of source.questions) {
      const newQ = await this.prisma.questions.create({
        data: {
          assessment_id: copy.id,
          type: q.type,
          question_text: q.question_text,
          explanation: q.explanation,
          points: q.points,
          sequence: q.sequence,
          image_url: q.image_url,
          tags: q.tags,
          updated_at: new Date(),
        },
      });

      if (q.question_options.length > 0) {
        await this.prisma.question_options.createMany({
          data: q.question_options.map((opt) => ({
            question_id: newQ.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            sequence: opt.sequence,
            image_url: opt.image_url,
          })),
        });
      }
    }

    return this.findById(copy.id);
  }
}
