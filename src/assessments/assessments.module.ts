import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService, PrismaService, RolesGuard],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
