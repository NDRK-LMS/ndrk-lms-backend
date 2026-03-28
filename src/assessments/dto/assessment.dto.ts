import {
  IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, IsBoolean,
  IsArray, ValidateNested, MaxLength, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentType, QuestionType, ShowResults } from '@prisma/client';

export class CreateAssessmentDto {
  @IsNotEmpty() @IsString() @MaxLength(500)
  title: string;

  @IsOptional() @IsString()
  description?: string;

  @IsEnum(AssessmentType)
  type: AssessmentType;

  @IsNotEmpty() @IsString()
  programme_id: string;

  @IsOptional() @IsString()
  module_id?: string;

  @IsOptional() @IsString()
  batch_id?: string;

  @IsOptional() @IsNumber()
  duration_minutes?: number;

  @IsOptional() @IsNumber()
  max_attempts?: number;

  @IsOptional() @IsNumber()
  passing_score?: number;

  @IsNotEmpty() @IsNumber()
  total_points: number;

  @IsOptional() @IsBoolean()
  shuffle_questions?: boolean;

  @IsOptional() @IsBoolean()
  shuffle_options?: boolean;

  @IsOptional() @IsEnum(ShowResults)
  show_results?: ShowResults;

  @IsOptional() @IsBoolean()
  allow_review?: boolean;

  @IsOptional() @IsBoolean()
  negative_marking?: boolean;

  @IsOptional() @IsNumber()
  negative_mark_value?: number;

  @IsOptional() @IsDateString()
  available_from?: string;

  @IsOptional() @IsDateString()
  available_until?: string;
}

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type: QuestionType;

  @IsNotEmpty() @IsString()
  question_text: string;

  @IsOptional() @IsString()
  explanation?: string;

  @IsNotEmpty() @IsNumber()
  points: number;

  @IsOptional() @IsString()
  image_url?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}

export class CreateOptionDto {
  @IsNotEmpty() @IsString()
  option_text: string;

  @IsBoolean()
  is_correct: boolean;

  @IsOptional() @IsString()
  image_url?: string;
}

export class GradeAnswerDto {
  @IsNotEmpty() @IsString()
  answer_id: string;

  @IsNotEmpty() @IsNumber()
  points_awarded: number;

  @IsOptional() @IsString()
  feedback?: string;
}

export class GradeSubmissionDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => GradeAnswerDto)
  answers: GradeAnswerDto[];
}
