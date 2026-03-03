import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MfaSetupDto, MfaCodeDto } from './dto/mfa.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    googleAuth(token: string): Promise<{
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
    mfaSetup(dto: MfaSetupDto): Promise<{
        otpauthUrl: string;
    }>;
    mfaVerify(dto: MfaCodeDto): Promise<{
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
    mfaChallenge(dto: MfaCodeDto): Promise<{
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
    testAuth(user: unknown): Promise<{
        message: string;
        user: unknown;
    }>;
}
