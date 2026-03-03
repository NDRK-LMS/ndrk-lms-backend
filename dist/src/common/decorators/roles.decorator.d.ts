import { UserRole } from '@ndrk/shared';
export declare const ROLES_KEY = "roles";
export type AppRole = UserRole;
export declare const Roles: (...roles: AppRole[]) => import("@nestjs/common").CustomDecorator<string>;
