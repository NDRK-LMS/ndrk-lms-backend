import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminDashboardService } from './admin-dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@ndrk/shared';

@Controller('api/v1/admin/dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get()
  async getOverview() {
    return this.service.getOverview();
  }
}

