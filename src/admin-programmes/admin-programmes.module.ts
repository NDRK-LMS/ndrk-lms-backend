import { Module } from '@nestjs/common';
import { AdminProgrammesController } from './admin-programmes.controller';
import { AdminProgrammesService } from './admin-programmes.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AdminProgrammesController],
  providers: [AdminProgrammesService, PrismaService],
})
export class AdminProgrammesModule {}

