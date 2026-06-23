import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateUploadIntentDto } from './dto/create-upload-intent.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-intent')
  createUploadIntent(
    @CurrentUser() user: any,
    @Body() dto: CreateUploadIntentDto
  ) {
    return this.filesService.createUploadIntent(
      user.id,
      dto.originalName,
      dto.mimeType,
      dto.sizeBytes
    );
  }

  @Post(':id/complete')
  completeUpload(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.completeUpload(user.id, id);
  }

  @Get(':id/download')
  getDownloadUrl(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.getDownloadUrl(user.id, id);
  }
}
