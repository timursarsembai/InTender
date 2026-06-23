import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  createComplaint(@CurrentUser() user: any, @Body() dto: CreateComplaintDto) {
    return this.complaintsService.createComplaint(user.id, dto);
  }

  @Get('my')
  getMyComplaints(@CurrentUser() user: any) {
    return this.complaintsService.getMyComplaints(user.id);
  }
}
