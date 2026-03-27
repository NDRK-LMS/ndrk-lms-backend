import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as otplib from 'otplib';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_value'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock otplib
jest.mock('otplib', () => ({
  generateSecret: jest.fn().mockReturnValue('MOCK_SECRET'),
  generateURI: jest.fn().mockReturnValue('otpauth://totp/NDRK%20LMS:test@test.com?secret=MOCK_SECRET'),
  verify: jest.fn().mockReturnValue(true),
}));

// Mock crypto
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('mock_random_hex'),
    }),
    createCipheriv: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue(Buffer.from('encrypted')),
      final: jest.fn().mockReturnValue(Buffer.from('')),
      getAuthTag: jest.fn().mockReturnValue(Buffer.from('authtag1234x')),
    }),
    createDecipheriv: jest.fn().mockReturnValue({
      setAuthTag: jest.fn(),
      update: jest.fn().mockReturnValue(Buffer.from('MOCK_SECRET')),
      final: jest.fn().mockReturnValue(Buffer.from('')),
    }),
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockReturnValue(Buffer.alloc(32)),
      }),
    }),
  };
});

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  full_name: 'Test User',
  password_hash: 'hashed_password',
  role: 'LEARNER',
  status: 'ACTIVE',
  avatar_url: null,
  mfa_enabled: false,
  mfa_secret: null,
  google_id: null,
  last_login_at: null,
  phone: null,
  bio: null,
  notification_prefs: null,
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

const mockAdminUser = {
  ...mockUser,
  id: 'admin-uuid-1',
  email: 'admin@example.com',
  full_name: 'Admin User',
  role: 'SUPER_ADMIN',
  mfa_enabled: true,
  mfa_secret: 'aabbcc:ddeeff:112233',
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-uuid-1', type: 'mfa_temp' }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset all mocks
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('mock_jwt_token');
    mockJwtService.verify.mockReturnValue({ sub: 'user-uuid-1', type: 'mfa_temp' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_value');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (otplib.verify as jest.Mock).mockReturnValue(true);
  });

  // ── Registration ──────────────────────────────────────────────────────

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      fullName: 'New User',
      password: 'password123',
    };

    it('should register a new user successfully (BR-001, BR-002, BR-003)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ ...mockUser, email: registerDto.email });
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });

    it('should throw BadRequestException when email already exists (BR-001)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('User with this email already exists');
    });

    it('should hash password with bcrypt 10 rounds (BR-002)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should default role to LEARNER when not specified (BR-003)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      await service.register(registerDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'LEARNER' }),
        }),
      );
    });

    it('should only allow LEARNER, SUPER_ADMIN, PROGRAMME_ADMIN roles (BR-004)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      // Invalid role should default to LEARNER
      await service.register({ ...registerDto, role: 'FACULTY' as any });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'LEARNER' }),
        }),
      );
    });

    it('should allow SUPER_ADMIN role when specified (BR-004)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ ...mockUser, role: 'SUPER_ADMIN' });
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      await service.register({ ...registerDto, role: 'SUPER_ADMIN' as any });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'SUPER_ADMIN' }),
        }),
      );
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should login successfully for LEARNER (no MFA)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect((result as any).user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException when user not found (BR-005)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when no password_hash (SSO user) (BR-005)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password_hash: null,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when user is not ACTIVE (BR-006)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'DISABLED',
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Account is disabled');
    });

    it('should return tempToken for SUPER_ADMIN (MFA required) (BR-007, BR-008)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);

      const result = await service.login({
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).toHaveProperty('tempToken');
      expect(result).not.toHaveProperty('accessToken');
    });

    it('should return tempToken for PROGRAMME_ADMIN (MFA required) (BR-007)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockAdminUser,
        role: 'PROGRAMME_ADMIN',
      });

      const result = await service.login({
        email: 'admin@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).toHaveProperty('tempToken');
    });
  });

  // ── MFA ───────────────────────────────────────────────────────────────

  describe('mfaSetup', () => {
    it('should generate TOTP secret and otpauth URL (BR-009, BR-010)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockAdminUser,
        mfa_enabled: false,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.mfaSetup('valid_temp_token');

      expect(result).toHaveProperty('otpauthUrl');
      expect(otplib.generateSecret).toHaveBeenCalled();
      expect(otplib.generateURI).toHaveBeenCalled();
      // Encrypted secret stored in DB
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mfa_secret: expect.any(String),
          }),
        }),
      );
    });

    it('should throw UnauthorizedException for non-admin user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.mfaSetup('valid_temp_token')).rejects.toThrow(UnauthorizedException);
      await expect(service.mfaSetup('valid_temp_token')).rejects.toThrow(
        'MFA is only required for admin users',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.mfaSetup('valid_temp_token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('mfaVerify', () => {
    it('should enable MFA and return tokens on valid code (BR-011)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockAdminUser,
        mfa_enabled: false,
        mfa_secret: 'aabbcc:ddeeff:112233',
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockAdminUser,
        mfa_enabled: true,
      });
      mockPrismaService.session.create.mockResolvedValue({});

      const result = await service.mfaVerify('valid_temp_token', '123456');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // mfa_enabled should be set to true
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { mfa_enabled: true },
        }),
      );
    });

    it('should throw UnauthorizedException on invalid TOTP code (BR-011)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockAdminUser,
        mfa_secret: 'aabbcc:ddeeff:112233',
      });
      (otplib.verify as jest.Mock).mockReturnValue(false);

      await expect(service.mfaVerify('valid_temp_token', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.mfaVerify('valid_temp_token', 'wrong')).rejects.toThrow(
        'Invalid MFA code',
      );
    });

    it('should throw when user has no mfa_secret', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockAdminUser,
        mfa_secret: null,
      });

      await expect(service.mfaVerify('valid_temp_token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('mfaChallenge', () => {
    it('should return tokens on valid TOTP code (BR-012)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.mfaChallenge('valid_temp_token', '123456');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException on invalid code (BR-012)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      (otplib.verify as jest.Mock).mockReturnValue(false);

      await expect(service.mfaChallenge('valid_temp_token', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when MFA not enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockAdminUser,
        mfa_enabled: false,
      });

      await expect(service.mfaChallenge('valid_temp_token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.mfaChallenge('valid_temp_token', '123456')).rejects.toThrow(
        'MFA is not enabled for this user',
      );
    });
  });

  // ── Sessions / Tokens ─────────────────────────────────────────────────

  describe('generateTokens', () => {
    it('should create session and return tokens (BR-013, BR-014, BR-015)', async () => {
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.generateTokens({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.full_name,
        role: mockUser.role,
        avatar_url: mockUser.avatar_url,
        mfa_enabled: mockUser.mfa_enabled,
      });

      expect(result).toHaveProperty('accessToken', 'mock_jwt_token');
      expect(result).toHaveProperty('refreshToken', 'mock_jwt_token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('message');
      // Session created with hashed refresh token
      expect(mockPrismaService.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: mockUser.id,
            refresh_token_hash: 'hashed_value',
          }),
        }),
      );
    });

    it('should update last_login_at (BR-016)', async () => {
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      await service.generateTokens({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.full_name,
        role: mockUser.role,
        avatar_url: mockUser.avatar_url,
        mfa_enabled: mockUser.mfa_enabled,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: { last_login_at: expect.any(Date) },
        }),
      );
    });

    it('should return role-specific welcome message', async () => {
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.generateTokens({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.full_name,
        role: 'LEARNER',
        avatar_url: null,
        mfa_enabled: false,
      });

      expect(result.message).toContain('Welcome back');
      expect(result.message).toContain('Test User');
    });
  });

  describe('refreshTokens', () => {
    it('should issue new tokens when refresh token is valid (BR-013)', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id });
      mockPrismaService.session.findFirst.mockResolvedValue({
        id: 'session-1',
        user_id: mockUser.id,
        refresh_token_hash: 'hashed_token',
        users: mockUser,
      });
      mockPrismaService.session.delete.mockResolvedValue({});
      mockPrismaService.session.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.refreshTokens('valid_refresh_token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Old session deleted
      expect(mockPrismaService.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should throw UnauthorizedException when refresh token invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshTokens('bad_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session not found', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id });
      mockPrismaService.session.findFirst.mockResolvedValue(null);

      await expect(service.refreshTokens('orphan_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when hash comparison fails', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id });
      mockPrismaService.session.findFirst.mockResolvedValue({
        id: 'session-1',
        refresh_token_hash: 'stored_hash',
        users: mockUser,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('mismatched_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── Password Reset ────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should create reset token when user exists (BR-017, BR-018)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordResetToken.create.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result).toHaveProperty('message');
      // Token hash stored in DB
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: mockUser.id,
            token_hash: 'hashed_value',
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should return safe message even when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@test.com' });

      expect(result.message).toContain('If this email exists');
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password when token is valid (BR-017, BR-019)', async () => {
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        user_id: mockUser.id,
        token_hash: 'stored_hash',
        used_at: null,
        expiresAt: new Date(Date.now() + 3600000),
        users: mockUser,
      });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.resetPassword({
        token: 'valid_token',
        newPassword: 'newpass123',
      });

      expect(result.message).toContain('successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
    });

    it('should throw BadRequestException when token not found', async () => {
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'newpass123' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'newpass123' }),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw when token hash does not match', async () => {
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        user_id: mockUser.id,
        token_hash: 'stored_hash',
        used_at: null,
        expiresAt: new Date(Date.now() + 3600000),
        users: mockUser,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.resetPassword({ token: 'wrong_token', newPassword: 'newpass123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Google OAuth ──────────────────────────────────────────────────────

  describe('googleLogin', () => {
    it('should throw UnauthorizedException on invalid Google token', async () => {
      await expect(service.googleLogin('bad_google_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('should return user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.full_name,
        role: mockUser.role,
        avatar_url: null,
        mfa_enabled: false,
        last_login_at: null,
        phone: null,
        bio: null,
        notification_prefs: null,
      });

      const result = await service.getMe(mockUser.id);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('full_name');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateMe', () => {
    it('should update profile fields', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        full_name: 'Updated Name',
        phone: '+91-1234567890',
      });

      const result = await service.updateMe(mockUser.id, {
        fullName: 'Updated Name',
        phone: '+91-1234567890',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            full_name: 'Updated Name',
            phone: '+91-1234567890',
          }),
        }),
      );
    });

    it('should only update provided fields', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        bio: 'New bio',
      });

      await service.updateMe(mockUser.id, { bio: 'New bio' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bio: 'New bio' }),
        }),
      );
      // full_name should NOT be in the update data
      const callData = mockPrismaService.user.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('full_name');
    });
  });

  // ── Temp Token ────────────────────────────────────────────────────────

  describe('verifyTempToken', () => {
    it('should return userId for valid mfa_temp token', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-uuid-1', type: 'mfa_temp' });

      const result = service.verifyTempToken('valid_temp_token');

      expect(result).toBe('user-uuid-1');
    });

    it('should throw UnauthorizedException for invalid token type', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-uuid-1', type: 'access' });

      expect(() => service.verifyTempToken('wrong_type')).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => service.verifyTempToken('expired')).toThrow(UnauthorizedException);
      expect(() => service.verifyTempToken('expired')).toThrow('Invalid or expired session');
    });
  });
});
