import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MfaSetupDto, MfaCodeDto } from './dto/mfa.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  async googleAuth(@Body('token') token: string) {
    if (!token) {
      throw new UnauthorizedException('Google token required');
    }
    return this.authService.googleLogin(token);
  }

  @Post('refresh')
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('mfa/setup')
  async mfaSetup(@Body() dto: MfaSetupDto) {
    return this.authService.mfaSetup(dto.tempToken);
  }

  @Post('mfa/verify')
  async mfaVerify(@Body() dto: MfaCodeDto) {
    return this.authService.mfaVerify(dto.tempToken, dto.code);
  }

  @Post('mfa/challenge')
  async mfaChallenge(@Body() dto: MfaCodeDto) {
    return this.authService.mfaChallenge(dto.tempToken, dto.code);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  @Get('test')
  @UseGuards(AuthGuard('jwt'))
  async testAuth(@CurrentUser() user: unknown) {
    return {
      message: 'You are authenticated!',
      user,
    };
  }
}
