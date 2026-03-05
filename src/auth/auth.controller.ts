import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MfaSetupDto, MfaCodeDto } from './dto/mfa.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, {
      ipAddress: req.ip,
      deviceInfo: { userAgent: req.headers['user-agent'] ?? null },
    });
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      ipAddress: req.ip,
      deviceInfo: { userAgent: req.headers['user-agent'] ?? null },
    });
  }

  @Post('google')
  async googleAuth(@Body('token') token: string, @Req() req: Request) {
    if (!token) {
      throw new UnauthorizedException('Google token required');
    }
    return this.authService.googleLogin(token, {
      ipAddress: req.ip,
      deviceInfo: { userAgent: req.headers['user-agent'] ?? null },
    });
  }

  @Post('refresh')
  async refreshTokens(@Body('refreshToken') refreshToken: string, @Req() req: Request) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    return this.authService.refreshTokens(refreshToken, {
      ipAddress: req.ip,
      deviceInfo: { userAgent: req.headers['user-agent'] ?? null },
    });
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
  async mfaVerify(@Body() dto: MfaCodeDto, @Req() req: Request) {
    return this.authService.mfaVerify(dto.tempToken, dto.code, {
      ipAddress: req.ip,
      deviceInfo: { userAgent: req.headers['user-agent'] ?? null },
    });
  }

  @Post('mfa/challenge')
  async mfaChallenge(@Body() dto: MfaCodeDto, @Req() req: Request) {
    return this.authService.mfaChallenge(dto.tempToken, dto.code, {
      ipAddress: req.ip,
      deviceInfo: { userAgent: req.headers['user-agent'] ?? null },
    });
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  async updateMe(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(userId, dto);
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
