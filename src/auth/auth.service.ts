import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { hash, compare } from 'bcrypt';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import * as otplib from 'otplib';
import { UserRole, roleRequiresMfa } from '@ndrk/shared';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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

  async register(dto: RegisterDto, context?: { ipAddress?: string; deviceInfo?: unknown }) {
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
        fullName: dto.fullName,
        passwordHash,
        role,
        status: 'ACTIVE',
      },
    });

    return this.generateTokens(user, context);
  }

  async login(dto: LoginDto, context?: { ipAddress?: string; deviceInfo?: unknown }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await compare(dto.password, user.passwordHash);
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
        mfaEnabled: !!user.mfaEnabled,
        tempToken,
        userId: user.id,
      };
    }

    return this.generateTokens(user, context);
  }

  async googleLogin(googleToken: string, context?: { ipAddress?: string; deviceInfo?: unknown }) {
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
            fullName,
            googleId,
            avatarUrl,
            role: UserRole.LEARNER,
            status: 'ACTIVE',
          },
        });
      } else {
        const updateData: Record<string, string> = {};
        if (!user.googleId && googleId) {
          updateData.googleId = googleId;
        }
        if (!user.avatarUrl && avatarUrl) {
          updateData.avatarUrl = avatarUrl;
        }

        if (Object.keys(updateData).length > 0) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is disabled');
      }

      const requiresMfa = roleRequiresMfa(user.role as UserRole);

      if (requiresMfa) {
        const tempToken = this.generateTempToken(user.id);
        return {
          requiresMfa: true,
          mfaEnabled: !!user.mfaEnabled,
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
        mfaSecret: encrypted,
      },
    });

    return {
      otpauthUrl,
    };
  }

  // Verify MFA during initial setup and enable it
  async mfaVerify(
    tempToken: string,
    code: string,
    context?: { ipAddress?: string; deviceInfo?: unknown },
  ) {
    const userId = this.verifyTempToken(tempToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('User or MFA secret not found');
    }

    const secret = this.decryptMfaSecret(user.mfaSecret);
    const isValid = otplib.verify({ token: code, secret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    return this.generateTokens(updated, context);
  }

  // Verify MFA on subsequent logins
  async mfaChallenge(
    tempToken: string,
    code: string,
    context?: { ipAddress?: string; deviceInfo?: unknown },
  ) {
    const userId = this.verifyTempToken(tempToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret || !user.mfaEnabled) {
      throw new UnauthorizedException('MFA is not enabled for this user');
    }

    const secret = this.decryptMfaSecret(user.mfaSecret);
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
        userId: user.id,
        tokenHash,
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
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    if (!record || !(await compare(dto.token, record.tokenHash))) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const newHash = await hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password has been reset successfully.' };
  }

  async generateTokens(
    user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatarUrl: string | null;
    mfaEnabled: boolean;
    },
    context?: { ipAddress?: string; deviceInfo?: unknown },
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: await hash(refreshToken, 10),
        // If deviceInfo is undefined, Prisma will simply not set the field.
        deviceInfo: context?.deviceInfo as any,
        ipAddress: context?.ipAddress ?? '0.0.0.0',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const welcomeMessages: Record<string, string> = {
      [UserRole.SUPER_ADMIN]: `Welcome back, ${user.fullName}! System administrator access granted.`,
      [UserRole.PROGRAMME_ADMIN]: `Welcome, ${user.fullName}! Ready to manage your programmes?`,
      [UserRole.FACULTY]: `Welcome, Professor ${user.fullName}! Your classes await.`,
      [UserRole.GUEST_FACULTY]: `Welcome, ${user.fullName}! Thank you for joining as guest faculty.`,
      [UserRole.EVALUATOR]: `Welcome, ${user.fullName}! Assessment dashboard ready.`,
      [UserRole.LEARNER]: `Welcome back, ${user.fullName}! Continue your learning journey.`,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        mfaEnabled: user.mfaEnabled,
      },
      accessToken,
      refreshToken,
      message: welcomeMessages[user.role] ?? `Welcome, ${user.fullName}!`,
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

  async refreshTokens(
    refreshToken: string,
    context?: { ipAddress?: string; deviceInfo?: unknown },
  ) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as { sub: string };

      const session = await this.prisma.session.findFirst({
        where: { userId: payload.sub },
        include: { user: true },
      });

      if (!session || !(await compare(refreshToken, session.refreshTokenHash))) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.prisma.session.delete({ where: { id: session.id } });
      return this.generateTokens(session.user, context);
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
        fullName: true,
        role: true,
        avatarUrl: true,
        mfaEnabled: true,
        lastLoginAt: true,
        phone: true,
        bio: true,
        notificationPrefs: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async updateMe(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
      bio?: string;
      notificationPrefs?: unknown;
      metadata?: unknown;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        notificationPrefs: data.notificationPrefs as any,
        metadata: data.metadata as any,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        mfaEnabled: true,
        lastLoginAt: true,
        phone: true,
        bio: true,
        notificationPrefs: true,
        metadata: true,
      },
    });

    return user;
  }
}
