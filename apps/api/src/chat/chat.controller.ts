import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('v1/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  async getRooms(@CurrentUser() user: any) {
    return this.chatService.getRoomsForUser(user.id);
  }

  @Get('rooms/:id/messages')
  async getMessages(@Param('id') roomId: string, @CurrentUser() user: any) {
    return this.chatService.getMessages(roomId, user.id);
  }

  @Post('rooms/find-or-create')
  async findOrCreateRoom(
    @Body() body: { orderId: string; supplierOrganizationId: string; buyerOrganizationId: string },
  ) {
    return this.chatService.findOrCreateRoom(
      body.orderId,
      body.supplierOrganizationId,
      body.buyerOrganizationId,
    );
  }
}
