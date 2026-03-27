import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminDashboardService } from './admin-dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@ndrk/shared';

@Controller('api/v1/admin/dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY, UserRole.GUEST_FACULTY, UserRole.EVALUATOR)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('stats')
  async getStats(
    @CurrentUser('role') role: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.getStats(role, userId);
  }

  @Get('charts')
  async getCharts(
    @Query('range') range?: string,
  ) {
    const validRanges = ['7d', '30d', '90d', 'all'];
    const chartRange = validRanges.includes(range ?? '')
      ? (range as '7d' | '30d' | '90d' | 'all')
      : '30d';
    return this.service.getCharts(chartRange);
  }

  @Get('activity')
  async getActivity(
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20;
    return this.service.getActivity(parsedLimit);
  }
}
