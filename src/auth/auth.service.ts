import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { hash, compare } from 'bcrypt';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import * as otplib from 'otplib';
import { UserRole, roleRequiresMfa } from '@ndrk/shared';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type RequestContext = {
  ipAddress?: string | null;
  deviceInfo?: Prisma.InputJsonValue;
};

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // Encrypt MFA secret using AES-256-GCM with key derived from MFA_ENCRYPTION_KEY
  private encryptMfaSecret(secret: string): string {
    const baseKey = process.env.MFA_ENCRYPTION_KEY ?? '';
    const key = createHash('sha256').update(baseKey).digest(); // 32 bytes
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptMfaSecret(stored: string): string {
    const baseKey = process.env.MFA_ENCRYPTION_KEY ?? '';
    const key = createHash('sha256').update(baseKey).digest();
    const [ivHex, tagHex, dataHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  }

  async register(dto: RegisterDto, context?: RequestContext) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await hash(dto.password, 10);

    const allowedRoles = [
      UserRole.LEARNER,
      UserRole.SUPER_ADMIN,
      UserRole.PROGRAMME_ADMIN,
    ] as const;
    const role =
      dto.role && (allowedRoles as readonly UserRole[]).includes(dto.role)
        ? dto.role
        : UserRole.LEARNER;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        full_name: dto.fullName,
        password_hash: passwordHash,
        role,
        status: 'ACTIVE',
        updated_at: new Date(),
      },
    });

    return this.generateTokens(user, context);
  }

  async login(dto: LoginDto, context?: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await compare(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is disabled');
    }

    const requiresMfa = roleRequiresMfa(user.role as UserRole);

    if (requiresMfa) {
      const tempToken = this.generateTempToken(user.id);
      return {
        requiresMfa: true,
        mfaEnabled: !!user.mfa_enabled,
        tempToken,
        userId: user.id,
      };
    }

    return this.generateTokens(user, context);
  }

  async googleLogin(googleToken: string, context?: RequestContext) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new UnauthorizedException('Invalid Google token');
      }
      const email = payload.email;
      const fullName = payload.name ?? email;
      const googleId = payload.sub;
      const avatarUrl = payload.picture ?? undefined;

      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            full_name: fullName,
            google_id: googleId,
            avatar_url: avatarUrl,
            role: UserRole.LEARNER,
            status: 'ACTIVE',
            updated_at: new Date(),
          },
        });
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is disabled');
      }

      const requiresMfa = roleRequiresMfa(user.role as UserRole);

      if (requiresMfa) {
        const tempToken = this.generateTempToken(user.id);
        return {
          requiresMfa: true,
          mfaEnabled: !!user.mfa_enabled,
          tempToken,
          userId: user.id,
        };
      }

      return {
        requiresMfa: false,
        ...(await this.generateTokens(user, context)),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('Google auth error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  // MFA: first-time setup for admin
  async mfaSetup(tempToken: string) {
    const userId = this.verifyTempToken(tempToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!roleRequiresMfa(user.role as UserRole)) {
      throw new UnauthorizedException('MFA is only required for admin users');
    }

    const secret = otplib.generateSecret();
    const otpauthUrl = otplib.generateURI({
      strategy: 'totp',
      label: `NDRK LMS:${user.email}`,
      issuer: 'NDRK LMS',
      algorithm: 'sha1',
      secret,
    });
    const encrypted = this.encryptMfaSecret(secret);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfa_secret: encrypted,
      },
    });

    return {
      otpauthUrl,
    };
  }

  // Verify MFA during initial setup and enable it
  async mfaVerify(tempToken: string, code: string, context?: RequestContext) {
    const userId = this.verifyTempToken(tempToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfa_secret) {
      throw new UnauthorizedException('User or MFA secret not found');
    }

    const secret = this.decryptMfaSecret(user.mfa_secret);
    const isValid = otplib.verify({ token: code, secret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { mfa_enabled: true },
    });

    return this.generateTokens(updated, context);
  }

  // Verify MFA on subsequent logins
  async mfaChallenge(tempToken: string, code: string, context?: RequestContext) {
    const userId = this.verifyTempToken(tempToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfa_secret || !user.mfa_enabled) {
      throw new UnauthorizedException('MFA is not enabled for this user');
    }

    const secret = this.decryptMfaSecret(user.mfa_secret);
    const isValid = otplib.verify({ token: code, secret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    return this.generateTokens(user, context);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      return { message: 'If this email exists, a reset link has been sent.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expiresAt,
      },
    });

    return {
      message: 'Password reset link generated.',
      resetToken: process.env.NODE_ENV === 'development' ? rawToken : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        used_at: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
      include: { users: true },
    });

    if (!record || !(await compare(dto.token, record.token_hash))) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const newHash = await hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user_id },
        data: { password_hash: newHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used_at: new Date() },
      }),
    ]);

    return { message: 'Password has been reset successfully.' };
  }

  async generateTokens(
    user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    avatar_url: string | null;
    mfa_enabled: boolean;
    },
    context?: RequestContext,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.prisma.session.create({
      data: {
        user_id: user.id,
        refresh_token_hash: await hash(refreshToken, 10),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ip_address: context?.ipAddress ?? '0.0.0.0',
        device_info: context?.deviceInfo,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const welcomeMessages: Record<string, string> = {
      [UserRole.SUPER_ADMIN]: `Welcome back, ${user.full_name}! System administrator access granted.`,
      [UserRole.PROGRAMME_ADMIN]: `Welcome, ${user.full_name}! Ready to manage your programmes?`,
      [UserRole.FACULTY]: `Welcome, Professor ${user.full_name}! Your classes await.`,
      [UserRole.GUEST_FACULTY]: `Welcome, ${user.full_name}! Thank you for joining as guest faculty.`,
      [UserRole.EVALUATOR]: `Welcome, ${user.full_name}! Assessment dashboard ready.`,
      [UserRole.LEARNER]: `Welcome back, ${user.full_name}! Continue your learning journey.`,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        mfaEnabled: user.mfa_enabled,
      },
      accessToken,
      refreshToken,
      message: welcomeMessages[user.role] ?? `Welcome, ${user.full_name}!`,
    };
  }

  private generateTempToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, type: 'mfa_temp' },
      { secret: process.env.JWT_SECRET, expiresIn: '10m' },
    );
  }

  verifyTempToken(token: string): string {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as { sub?: string; type?: string };

      if (payload.type !== 'mfa_temp' || !payload.sub) {
        throw new Error('Invalid token type');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  async refreshTokens(refreshToken: string, context?: RequestContext) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as { sub: string };

      const session = await this.prisma.session.findFirst({
        where: { user_id: payload.sub },
        include: { users: true },
      });

      if (!session || !(await compare(refreshToken, session.refresh_token_hash))) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.prisma.session.delete({ where: { id: session.id } });
      return this.generateTokens(session.users, context);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        avatar_url: true,
        mfa_enabled: true,
        last_login_at: true,
        phone: true,
        bio: true,
        notification_prefs: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const data: Prisma.UserUpdateInput = {};

    if (dto.fullName != null) data.full_name = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatarUrl !== undefined) data.avatar_url = dto.avatarUrl;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.notificationPrefs !== undefined) {
      data.notification_prefs = dto.notificationPrefs as Prisma.InputJsonValue;
    }
    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        avatar_url: true,
        mfa_enabled: true,
        last_login_at: true,
        phone: true,
        bio: true,
        notification_prefs: true,
      },
    });

    return updated;
  }
}
