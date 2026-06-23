import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('v1')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/organization')
  async getMyOrganization(@Request() req: any) {
    return this.organizationsService.findByOwnerId(req.user.id);
  }

  @Get('organizations/:id/public-profile')
  async getPublicProfile(@Param('id') id: string) {
    return this.organizationsService.getPublicProfile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('organizations')
  async createOrUpdate(@Request() req: any, @Body() body: any) {
    return this.organizationsService.createOrUpdate(req.user.id, body);
  }
}
