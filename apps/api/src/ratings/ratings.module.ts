import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}
