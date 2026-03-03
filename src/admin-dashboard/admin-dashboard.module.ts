import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, PrismaService, RolesGuard],
})
export class AdminDashboardModule {}

