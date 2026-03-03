import { IsEmail, IsIn, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { UserRole } from '@ndrk/shared';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(3)
  fullName: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsIn([UserRole.LEARNER, UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN])
  role?: UserRole;
}

