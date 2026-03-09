import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (search?.trim()) {
      where.OR = [
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
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
          fullName: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          avatarUrl: true,
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
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { deletedAt: null, status: UserStatus.DISABLED } }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfMonth },
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
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        googleId: true,
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
    if (existing && !existing.deletedAt) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = input.password ? await hash(input.password, 10) : undefined;

    const data: Prisma.UserCreateInput = {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      status: UserStatus.ACTIVE,
    };
    if (input.phone) data.phone = input.phone;
    if (passwordHash) data.passwordHash = passwordHash;

    return this.prisma.user.create({ data });
  }

  async update(
    id: string,
    data: { fullName?: string; role?: UserRole | string; status?: UserStatus | string; phone?: string },
  ) {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.fullName != null) updateData.fullName = data.fullName;
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
      where: { id: { in: userIds }, deletedAt: null },
      data: { status },
    });
    return { updated: result.count };
  }

  async softDelete(id: string, deletedBy: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
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

