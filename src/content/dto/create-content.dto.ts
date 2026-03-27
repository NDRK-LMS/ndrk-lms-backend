import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, IsArray, MaxLength } from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateContentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsString()
  s3_key?: string;

  @IsOptional()
  @IsString()
  s3_bucket?: string;

  @IsOptional()
  @IsNumber()
  file_size_bytes?: number;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsNumber()
  duration_seconds?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UploadUrlDto {
  @IsNotEmpty()
  @IsString()
  filename: string;

  @IsNotEmpty()
  @IsString()
  content_type: string;

  @IsOptional()
  @IsNumber()
  file_size_bytes?: number;
}

export class ReplaceFileDto {
  @IsNotEmpty()
  @IsString()
  s3_key: string;

  @IsOptional()
  @IsNumber()
  file_size_bytes?: number;

  @IsOptional()
  @IsString()
  mime_type?: string;
}
