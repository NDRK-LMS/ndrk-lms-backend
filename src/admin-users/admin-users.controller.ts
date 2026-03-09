import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UserRole, UserStatus } from '@ndrk/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminUsersService } from './admin-users.service';

const CSV_ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'] as const;

/** RegExp matching allowed CSV MIME types, with optional params (e.g. ; charset=utf-8) */
const CSV_MIME_REGEX = new RegExp(
  `^(${CSV_ALLOWED_MIME_TYPES.map((t) => t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})(;.*)?$`,
  'i',
);

@Controller('api/v1/admin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      search,
      role,
      status,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async getStats() {
    return this.usersService.getStats();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(
    @Body()
    body: {
      email: string;
      fullName: string;
      role: string;
      phone?: string;
      password?: string;
    },
  ) {
    const role = body.role as UserRole;
    return this.usersService.create({
      email: body.email,
      fullName: body.fullName,
      role,
      phone: body.phone,
      password: body.password,
    });
  }

  @Patch('bulk')
  @Roles(UserRole.SUPER_ADMIN)
  async bulkUpdateStatus(@Body() body: { action: string; userIds: string[] }) {
    const status = body.action === 'enable' ? UserStatus.ACTIVE : UserStatus.DISABLED;
    return this.usersService.bulkUpdateStatus(body.userIds, status);
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({
            fileType: CSV_MIME_REGEX,
            fallbackToMimetype: true,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: { buffer: Buffer; originalname?: string },
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }
    return this.usersService.bulkImport(file.buffer);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: { fullName?: string; role?: string; status?: string; phone?: string },
  ) {
    const data: { fullName?: string; role?: unknown; status?: unknown; phone?: string } = {};
    if (body.fullName != null) data.fullName = body.fullName;
    if (body.phone != null) data.phone = body.phone;
    if (body.role != null) data.role = body.role;
    if (body.status != null) data.status = body.status;
    return this.usersService.update(id, data as Parameters<AdminUsersService['update']>[1]);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.usersService.softDelete(id, user.sub);
  }
}

