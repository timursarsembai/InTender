import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PublishOrderDto } from './dto/publish-order.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@intender/shared';

@Controller('v1')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @Post('orders')
  createDraft(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createDraft(user.id, dto);
  }

  @Get('orders')
  getPublishedOrders(
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    return this.ordersService.getPublishedOrders(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @Get('me/orders')
  getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.getMyOrders(user.id);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @Patch('orders/:id')
  updateDraft(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto
  ) {
    return this.ordersService.updateDraft(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @Post('orders/:id/publish')
  publishOrder(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PublishOrderDto
  ) {
    return this.ordersService.publish(user.id, id, dto.idempotencyKey);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @Post('orders/:id/cancel')
  cancelOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.cancel(user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @Post('orders/:id/close-without-selection')
  closeOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.closeWithoutSelection(user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('orders/:id/repeat')
  repeatOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.repeatOrder(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id/disclosed-contacts')
  getDisclosedContacts(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getDisclosedContacts(user.id, id);
  }
}
