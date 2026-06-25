import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseIntPipe, Query, DefaultValuePipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@intender/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(skip, take, search);
  }

  @Post('users/:id/set-role')
  setUserRole(
    @CurrentUser() admin: { id: string },
    @Param('id') userId: string,
    @Body('role') role: UserRole,
  ) {
    return this.adminService.setUserRole(admin.id, userId, role);
  }

  @Post('impersonate/:userId')
  impersonateUser(
    @CurrentUser() admin: { id: string },
    @Param('userId') userId: string,
  ) {
    return this.adminService.impersonateUser(admin.id, userId);
  }

  @Get('config')
  getConfig() {
    return this.adminService.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.adminService.updateConfig(dto);
  }

  @Get('complaints')
  getComplaints(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    return this.adminService.getComplaints(skip, take);
  }

  @Post('complaints/:id/resolve')
  resolveComplaint(
    @CurrentUser() admin: { id: string },
    @Param('id') id: string,
    @Body() dto: ResolveComplaintDto,
  ) {
    return this.adminService.resolveComplaint(admin.id, id, dto);
  }

  @Post('refund')
  issueRefund(
    @CurrentUser() admin: { id: string },
    @Body('userId') userId: string,
    @Body('amountMinor', ParseIntPipe) amountMinor: number,
    @Body('idempotencyKey') idempotencyKey: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.issueRefund(admin.id, userId, amountMinor, idempotencyKey, reason);
  }

  @Post('ratings/:id/delete')
  deleteRating(@CurrentUser() admin: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteRating(admin.id, id);
  }
}
