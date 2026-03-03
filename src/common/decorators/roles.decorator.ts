import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@ndrk/shared';

export const ROLES_KEY = 'roles';

export type AppRole = UserRole;

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

