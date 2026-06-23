import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@intender/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('complaints')
  getComplaints(
    @Query('skip', ParseIntPipe) skip: number = 0,
    @Query('take', ParseIntPipe) take: number = 20
  ) {
    return this.adminService.getComplaints(skip, take);
  }

  @Post('complaints/:id/resolve')
  resolveComplaint(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ResolveComplaintDto
  ) {
    return this.adminService.resolveComplaint(admin.id, id, dto);
  }

  @Post('refund')
  issueRefund(
    @CurrentUser() admin: any,
    @Body('userId') userId: string,
    @Body('amountMinor', ParseIntPipe) amountMinor: number,
    @Body('idempotencyKey') idempotencyKey: string,
    @Body('reason') reason: string
  ) {
    return this.adminService.issueRefund(admin.id, userId, amountMinor, idempotencyKey, reason);
  }

  @Post('ratings/:id/delete')
  deleteRating(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.adminService.deleteRating(admin.id, id);
  }
}
