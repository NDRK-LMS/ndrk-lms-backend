import { IsNotEmpty } from 'class-validator';

export class MfaSetupDto {
  @IsNotEmpty()
  tempToken: string;
}

export class MfaCodeDto {
  @IsNotEmpty()
  tempToken: string;

  @IsNotEmpty()
  code: string;
}

