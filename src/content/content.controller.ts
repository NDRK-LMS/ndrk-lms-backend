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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@ndrk/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContentService } from './content.service';
import { CreateContentDto, UploadUrlDto, ReplaceFileDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

@Controller('api/v1/admin/content')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.PROGRAMME_ADMIN, UserRole.FACULTY)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('transcode_status') transcodeStatus?: string,
    @Query('uploaded_by') uploadedBy?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.contentService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      type,
      transcode_status: transcodeStatus,
      uploaded_by: uploadedBy,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Post('upload')
  async getUploadUrl(
    @Body() dto: UploadUrlDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.contentService.getUploadUrl(dto, userId);
  }

  @Post()
  async create(
    @Body() dto: CreateContentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.contentService.create(dto, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contentService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.contentService.softDelete(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.contentService.getTranscodeStatus(id);
  }

  @Post(':id/signed-url')
  async getSignedUrl(@Param('id') id: string) {
    return this.contentService.getSignedPlaybackUrl(id);
  }

  @Post(':id/replace')
  async replaceFile(@Param('id') id: string, @Body() dto: ReplaceFileDto) {
    return this.contentService.replaceFile(id, dto);
  }

  @Get(':id/usage')
  async getUsage(@Param('id') id: string) {
    return this.contentService.getUsage(id);
  }
}
