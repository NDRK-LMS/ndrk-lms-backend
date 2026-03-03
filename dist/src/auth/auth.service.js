"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const google_auth_library_1 = require("google-auth-library");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt_1 = require("bcrypt");
const crypto_1 = require("crypto");
const otplib = __importStar(require("otplib"));
const shared_1 = require("@ndrk/shared");
let AuthService = class AuthService {
    prisma;
    jwtService;
    googleClient;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }
    encryptMfaSecret(secret) {
        const baseKey = process.env.MFA_ENCRYPTION_KEY ?? '';
        const key = (0, crypto_1.createHash)('sha256').update(baseKey).digest();
        const iv = (0, crypto_1.randomBytes)(12);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }
    decryptMfaSecret(stored) {
        const baseKey = process.env.MFA_ENCRYPTION_KEY ?? '';
        const key = (0, crypto_1.createHash)('sha256').update(baseKey).digest();
        const [ivHex, tagHex, dataHex] = stored.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const data = Buffer.from(dataHex, 'hex');
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted.toString('utf8');
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.BadRequestException('User with this email already exists');
        }
        const passwordHash = await (0, bcrypt_1.hash)(dto.password, 10);
        const allowedRoles = [
            shared_1.UserRole.LEARNER,
            shared_1.UserRole.SUPER_ADMIN,
            shared_1.UserRole.PROGRAMME_ADMIN,
        ];
        const role = dto.role && allowedRoles.includes(dto.role)
            ? dto.role
            : shared_1.UserRole.LEARNER;
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                fullName: dto.fullName,
                passwordHash,
                role,
                status: 'ACTIVE',
            },
        });
        return this.generateTokens(user);
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await (0, bcrypt_1.compare)(dto.password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Account is disabled');
        }
        const requiresMfa = (0, shared_1.roleRequiresMfa)(user.role);
        if (requiresMfa) {
            const tempToken = this.generateTempToken(user.id);
            return {
                requiresMfa: true,
                mfaEnabled: !!user.mfaEnabled,
                tempToken,
                userId: user.id,
            };
        }
        return this.generateTokens(user);
    }
    async googleLogin(googleToken) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: googleToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload?.email) {
                throw new common_1.UnauthorizedException('Invalid Google token');
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
                        role: shared_1.UserRole.LEARNER,
                        status: 'ACTIVE',
                    },
                });
            }
            if (user.status !== 'ACTIVE') {
                throw new common_1.UnauthorizedException('Account is disabled');
            }
            const requiresMfa = (0, shared_1.roleRequiresMfa)(user.role);
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
                ...(await this.generateTokens(user)),
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            console.error('Google auth error:', error);
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
    }
    async mfaSetup(tempToken) {
        const userId = this.verifyTempToken(tempToken);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (!(0, shared_1.roleRequiresMfa)(user.role)) {
            throw new common_1.UnauthorizedException('MFA is only required for admin users');
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
    async mfaVerify(tempToken, code) {
        const userId = this.verifyTempToken(tempToken);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.mfaSecret) {
            throw new common_1.UnauthorizedException('User or MFA secret not found');
        }
        const secret = this.decryptMfaSecret(user.mfaSecret);
        const isValid = otplib.verify({ token: code, secret });
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid MFA code');
        }
        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: { mfaEnabled: true },
        });
        return this.generateTokens(updated);
    }
    async mfaChallenge(tempToken, code) {
        const userId = this.verifyTempToken(tempToken);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.mfaSecret || !user.mfaEnabled) {
            throw new common_1.UnauthorizedException('MFA is not enabled for this user');
        }
        const secret = this.decryptMfaSecret(user.mfaSecret);
        const isValid = otplib.verify({ token: code, secret });
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid MFA code');
        }
        return this.generateTokens(user);
    }
    async forgotPassword(dto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) {
            return { message: 'If this email exists, a reset link has been sent.' };
        }
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = await (0, bcrypt_1.hash)(rawToken, 10);
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
    async resetPassword(dto) {
        const record = await this.prisma.passwordResetToken.findFirst({
            where: {
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
            include: { user: true },
        });
        if (!record || !(await (0, bcrypt_1.compare)(dto.token, record.tokenHash))) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const newHash = await (0, bcrypt_1.hash)(dto.newPassword, 10);
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
    async generateTokens(user) {
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
                refreshTokenHash: await (0, bcrypt_1.hash)(refreshToken, 10),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const welcomeMessages = {
            [shared_1.UserRole.SUPER_ADMIN]: `Welcome back, ${user.fullName}! System administrator access granted.`,
            [shared_1.UserRole.PROGRAMME_ADMIN]: `Welcome, ${user.fullName}! Ready to manage your programmes?`,
            [shared_1.UserRole.FACULTY]: `Welcome, Professor ${user.fullName}! Your classes await.`,
            [shared_1.UserRole.GUEST_FACULTY]: `Welcome, ${user.fullName}! Thank you for joining as guest faculty.`,
            [shared_1.UserRole.EVALUATOR]: `Welcome, ${user.fullName}! Assessment dashboard ready.`,
            [shared_1.UserRole.LEARNER]: `Welcome back, ${user.fullName}! Continue your learning journey.`,
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
    generateTempToken(userId) {
        return this.jwtService.sign({ sub: userId, type: 'mfa_temp' }, { secret: process.env.JWT_SECRET, expiresIn: '10m' });
    }
    verifyTempToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
            if (payload.type !== 'mfa_temp' || !payload.sub) {
                throw new Error('Invalid token type');
            }
            return payload.sub;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired session');
        }
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            const session = await this.prisma.session.findFirst({
                where: { userId: payload.sub },
                include: { user: true },
            });
            if (!session || !(await (0, bcrypt_1.compare)(refreshToken, session.refreshTokenHash))) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            await this.prisma.session.delete({ where: { id: session.id } });
            return this.generateTokens(session.user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async getMe(userId) {
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
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map