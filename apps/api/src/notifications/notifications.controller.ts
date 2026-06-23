import { Controller, Get, Post, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(
    @CurrentUser() user: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.notificationsService.getMyNotifications(
      user.id,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20
    );
  }

  @Post('read')
  markAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAsRead(user.id);
  }
}
