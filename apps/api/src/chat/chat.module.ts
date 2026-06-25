import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    PrismaModule,
    FilesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret',
    }),
  ],
  providers: [ChatService, ChatGateway, WsJwtGuard],
  controllers: [ChatController],
})
export class ChatModule {}
