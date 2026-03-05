import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  // notificationPrefs and metadata are flexible JSON blobs
  @IsOptional()
  notificationPrefs?: unknown;

  @IsOptional()
  metadata?: unknown;
}

