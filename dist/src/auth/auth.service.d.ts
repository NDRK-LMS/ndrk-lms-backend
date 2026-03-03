import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private googleClient;
    constructor(prisma: PrismaService, jwtService: JwtService);
    private encryptMfaSecret;
    private decryptMfaSecret;
    register(dto: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        message: string;
    } | {
        requiresMfa: boolean;
        mfaEnabled: boolean;
        tempToken: string;
        userId: string;
    }>;
    googleLogin(googleToken: string): Promise<{
        requiresMfa: boolean;
        mfaEnabled: boolean;
        tempToken: string;
        userId: string;
    } | {
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        message: string;
        requiresMfa: boolean;
        mfaEnabled?: undefined;
        tempToken?: undefined;
        userId?: undefined;
    }>;
    mfaSetup(tempToken: string): Promise<{
        otpauthUrl: string;
    }>;
    mfaVerify(tempToken: string, code: string): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        message: string;
    }>;
    mfaChallenge(tempToken: string, code: string): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        resetToken?: undefined;
    } | {
        message: string;
        resetToken: string | undefined;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    generateTokens(user: {
        id: string;
        email: string;
        fullName: string;
        role: string;
        avatarUrl: string | null;
        mfaEnabled: boolean;
    }): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        message: string;
    }>;
    private generateTempToken;
    verifyTempToken(token: string): string;
    refreshTokens(refreshToken: string): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            role: string;
            avatarUrl: string | null;
            mfaEnabled: boolean;
        };
        accessToken: string;
        refreshToken: string;
        message: string;
    }>;
    getMe(userId: string): Promise<{
        email: string;
        fullName: string;
        role: string;
        id: string;
        avatarUrl: string | null;
        mfaEnabled: boolean;
        lastLoginAt: Date | null;
    }>;
}
