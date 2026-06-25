import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SupportChatService } from './support-chat.service';
import { SupportChatController } from './support-chat.controller';
import { SupportChatGateway } from './support-chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [
    PrismaModule,
    FilesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret',
    }),
  ],
  providers: [SupportChatService, SupportChatGateway, WsJwtGuard],
  controllers: [SupportChatController],
  exports: [SupportChatService],
})
export class SupportChatModule {}
