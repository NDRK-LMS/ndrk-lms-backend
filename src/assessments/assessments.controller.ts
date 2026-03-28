import {
  Controller, Get, Post, Patch, Delete, Put,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@ndrk/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto, CreateQuestionDto, GradeSubmissionDto } from './dto/assessment.dto';

@Controller('api/v1/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY, UserRole.EVALUATOR)
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}

  // ── Assessment CRUD ──────────────────────────────────────────────

  @Get('assessments')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('programme_id') programmeId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search, type, status,
      programme_id: programmeId,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Post('assessments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async create(@Body() dto: CreateAssessmentDto, @CurrentUser('sub') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get('assessments/csv-template')
  async getCsvTemplate() {
    const template = 'type,question_text,option_a,option_b,option_c,option_d,correct_options,points,explanation,tags\nMCQ_SINGLE,What is 2+2?,3,4,5,6,B,10,Basic math,math;arithmetic\nMCQ_MULTI,"Select prime numbers",2,4,7,9,A;C,10,"2 and 7 are prime",math;prime\nTRUE_FALSE,The earth is round,True,False,,,A,5,Basic geography,geography\nSHORT_ANSWER,Define gravity,,,,,,10,Force of attraction,physics\nLONG_ANSWER,Explain photosynthesis,,,,,,20,,biology';
    return { template, filename: 'question_template.csv' };
  }

  @Get('assessments/question-bank')
  async getQuestionBank(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getQuestionBank({
      search, type, tags,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('assessments/:id')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('assessments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAssessmentDto>) {
    return this.service.update(id, dto);
  }

  @Post('assessments/:id/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  // ── Questions ──────────────────────────────────────────────────

  @Post('assessments/:id/questions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.service.addQuestion(id, dto);
  }

  @Patch('assessments/:id/questions/:qid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async updateQuestion(@Param('qid') qid: string, @Body() dto: Partial<CreateQuestionDto>) {
    return this.service.updateQuestion(qid, dto);
  }

  @Delete('assessments/:id/questions/:qid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async deleteQuestion(@Param('qid') qid: string) {
    return this.service.deleteQuestion(qid);
  }

  @Put('assessments/:id/questions/reorder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async reorderQuestions(@Param('id') id: string, @Body('questionIds') questionIds: string[]) {
    return this.service.reorderQuestions(id, questionIds);
  }

  // ── Submissions & Grading ──────────────────────────────────────

  @Get('assessments/:id/submissions')
  async getSubmissions(@Param('id') id: string) {
    return this.service.getSubmissions(id);
  }

  @Get('submissions/:subId')
  async getSubmissionDetail(@Param('subId') subId: string) {
    return this.service.getSubmissionDetail(subId);
  }

  @Patch('submissions/:subId/grade')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY, UserRole.EVALUATOR)
  async gradeSubmission(
    @Param('subId') subId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.gradeSubmission(subId, dto.answers, userId);
  }

  @Post('assessments/:id/auto-grade')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async autoGrade(@Param('id') id: string) {
    return this.service.autoGrade(id);
  }

  @Get('assessments/:id/analytics')
  async getAnalytics(@Param('id') id: string) {
    return this.service.getAnalytics(id);
  }

  // ── CSV Import ─────────────────────────────────────────────────

  @Post('assessments/:id/import-csv')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async importCsv(
    @Param('id') id: string,
    @Body('csv') csv: string,
  ) {
    return this.service.importQuestionsFromCsv(id, csv);
  }

  // ── Question Bank ──────────────────────────────────────────────

  @Post('assessments/:id/copy-from-bank')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async copyFromBank(
    @Param('id') id: string,
    @Body('questionId') questionId: string,
  ) {
    return this.service.copyQuestionFromBank(id, questionId);
  }

  // ── Duplicate Assessment ───────────────────────────────────────

  @Post('assessments/:id/duplicate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
  async duplicate(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: {
      title?: string; batch_id?: string; shuffle_questions?: boolean;
      negative_marking?: boolean; available_from?: string; available_until?: string;
    },
  ) {
    return this.service.duplicate(id, userId, body);
  }

  @Delete('assessments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async deleteAssessment(@Param('id') id: string) {
    return this.service.deleteAssessment(id);
  }
}
