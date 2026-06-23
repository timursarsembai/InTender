import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRatingDto } from './dto/create-rating.dto';

@Controller('v1/ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createRating(@CurrentUser() user: any, @Body() dto: CreateRatingDto) {
    return this.ratingsService.createRating(user.id, dto);
  }

  @Get('users/:id')
  getUserRatings(@Param('id') id: string) {
    return this.ratingsService.getUserRatings(id);
  }
}
