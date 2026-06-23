import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@intender/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Roles(UserRole.SUPPLIER)
  @Post('orders/:orderId/offers')
  createOffer(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string,
    @Body() dto: CreateOfferDto
  ) {
    return this.offersService.createOffer(user.id, orderId, dto);
  }

  @Roles(UserRole.BUYER)
  @Get('orders/:orderId/offers')
  getOffersForOrder(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string
  ) {
    return this.offersService.getOffersForOrder(user.id, orderId);
  }

  @Roles(UserRole.SUPPLIER)
  @Get('me/offers')
  getMyOffers(@CurrentUser() user: any) {
    return this.offersService.getMyOffers(user.id);
  }

  @Get('offers/:id')
  getOffer(@Param('id') id: string) {
    return this.offersService.getOfferById(id);
  }

  @Roles(UserRole.SUPPLIER)
  @Patch('offers/:id')
  updateOffer(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto
  ) {
    return this.offersService.updateOffer(user.id, id, dto);
  }

  @Roles(UserRole.SUPPLIER)
  @Post('offers/:id/withdraw')
  withdrawOffer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.offersService.withdrawOffer(user.id, id);
  }

  @Roles(UserRole.BUYER)
  @Post('offers/:id/accept')
  acceptOffer(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AcceptOfferDto
  ) {
    return this.offersService.acceptOffer(user.id, id, dto.idempotencyKey);
  }
}
