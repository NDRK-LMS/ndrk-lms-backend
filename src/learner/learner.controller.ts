import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LearnerService } from './learner.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/learner')
@UseGuards(AuthGuard('jwt'))
export class LearnerController {
  constructor(private readonly service: LearnerService) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser('sub') userId: string) {
    return this.service.getDashboard(userId);
  }
}

