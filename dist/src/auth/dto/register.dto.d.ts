import { UserRole } from '@ndrk/shared';
export declare class RegisterDto {
    email: string;
    fullName: string;
    password: string;
    role?: UserRole;
}
