import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { S3Service } from './s3.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [ContentController],
  providers: [ContentService, S3Service, PrismaService, RolesGuard],
  exports: [ContentService, S3Service],
})
export class ContentModule {}
