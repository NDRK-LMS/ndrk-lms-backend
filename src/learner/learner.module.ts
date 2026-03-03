import { Module } from '@nestjs/common';
import { LearnerController } from './learner.controller';
import { LearnerService } from './learner.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LearnerController],
  providers: [LearnerService, PrismaService],
})
export class LearnerModule {}

