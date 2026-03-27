import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole, UserStatus } from '@ndrk/shared';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from 'bcrypt';

export interface FindAllUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: FindAllUsersOptions = {}) {
    const {
      page = 1,
      limit = 25,
      search,
      role,
      status,
      sortBy: rawSortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    const sortByMap: Record<string, string> = {
      createdAt: 'created_at',
      fullName: 'full_name',
      lastLoginAt: 'last_login_at',
      avatarUrl: 'avatar_url',
    };
    const sortBy = sortByMap[rawSortBy] ?? rawSortBy;

    const where: Prisma.UserWhereInput = { deleted_at: null };

    if (search?.trim()) {
      where.OR = [
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { full_name: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (role && role !== 'all') {
      where.role = { equals: role as UserRole };
    }
    if (status && status !== 'all') {
      where.status = { equals: status as UserStatus };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          status: true,
          last_login_at: true,
          created_at: true,
          avatar_url: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, activeUsers, disabledUsers, newThisMonth] = await Promise.all([
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.user.count({ where: { deleted_at: null, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { deleted_at: null, status: UserStatus.DISABLED } }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          created_at: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      disabledUsers,
      newThisMonth,
    };
  }

  async findOne(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        status: true,
        avatar_url: true,
        mfa_enabled: true,
        last_login_at: true,
        created_at: true,
        google_id: true,
      },
    });
  }

  async create(input: {
    email: string;
    fullName: string;
    role: UserRole;
    phone?: string;
    password?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing && !existing.deleted_at) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = input.password ? await hash(input.password, 10) : undefined;

    const data: Prisma.UserCreateInput = {
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      status: UserStatus.ACTIVE,
      updated_at: new Date(),
    };
    if (input.phone) data.phone = input.phone;
    if (passwordHash) data.password_hash = passwordHash;

    return this.prisma.user.create({ data });
  }

  async update(
    id: string,
    data: { fullName?: string; role?: UserRole | string; status?: UserStatus | string; phone?: string },
  ) {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.fullName != null) updateData.full_name = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role != null) updateData.role = data.role as UserRole;
    if (data.status != null) updateData.status = data.status as UserStatus;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async bulkUpdateStatus(userIds: string[], status: UserStatus) {
    if (!userIds.length) return { updated: 0 };
    const result = await this.prisma.user.updateMany({
      where: { id: { in: userIds }, deleted_at: null },
      data: { status },
    });
    return { updated: result.count };
  }

  async softDelete(id: string, deletedBy: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        metadata: {
          deleteReason: 'admin',
          deletedBy,
        } as Prisma.JsonObject,
      },
    });

    return { success: true };
  }

  async bulkImport(buffer: Buffer) {
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new BadRequestException('CSV must contain at least one data row');
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const emailIdx = header.indexOf('email');
    const fullNameIdx = header.indexOf('fullname') !== -1 ? header.indexOf('fullname') : header.indexOf('full name');
    const roleIdx = header.indexOf('role');
    const phoneIdx = header.indexOf('phone');
    const passwordIdx = header.indexOf('password');

    if (emailIdx === -1 || fullNameIdx === -1 || roleIdx === -1) {
      throw new BadRequestException('CSV must include email, fullName, and role columns');
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: { row: number; email?: string; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;

      const cols = raw.split(',');
      const email = cols[emailIdx]?.trim();
      const fullName = cols[fullNameIdx]?.trim();
      const role = cols[roleIdx]?.trim() as UserRole;
      const phone = phoneIdx !== -1 ? cols[phoneIdx]?.trim() : undefined;
      const password = passwordIdx !== -1 ? cols[passwordIdx]?.trim() : undefined;

      if (!email || !fullName || !role) {
        errors.push({ row: i + 1, email, message: 'Missing required fields' });
        continue;
      }

      try {
        await this.create({ email, fullName, role, phone, password });
        created.push(email);
      } catch (err) {
        if (err instanceof BadRequestException) {
          skipped.push(email);
          errors.push({ row: i + 1, email, message: err.message });
        } else {
          errors.push({
            row: i + 1,
            email,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    return {
      createdCount: created.length,
      skippedCount: skipped.length,
      errors,
    };
  }
}
