import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAiJobDto } from './dto/create-ai-job.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('jobs')
  createJob(@CurrentUser() user: any, @Body() dto: CreateAiJobDto) {
    return this.aiService.createJob(user.id, dto.fileId, dto.idempotencyKey);
  }

  @Get('jobs/:id')
  getJob(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiService.getJob(user.id, id);
  }
}
