import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { SupportChatService } from './support-chat.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/support' })
export class SupportChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly supportChatService: SupportChatService) {}

  handleConnection(_client: Socket) {}
  handleDisconnect(_client: Socket) {}

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinSupportRoom')
  async handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
    return { event: 'joinedSupportRoom', data: data.roomId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendSupportMessage')
  async handleMessage(
    @MessageBody() dto: { roomId: string; content?: string; attachmentFileId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user.sub;
    const role = client.data.user.role;
    const isStaff = role === 'ADMIN' || role === 'MODERATOR';

    let result: { roomId: string; message: object } | object;

    if (isStaff) {
      const message = await this.supportChatService.staffSendMessage(
        userId,
        dto.roomId,
        dto.content ?? '',
        dto.attachmentFileId,
      );
      result = { roomId: dto.roomId, message };
    } else {
      result = await this.supportChatService.sendMessage(userId, dto.content ?? '', dto.attachmentFileId);
    }

    const roomId = (result as { roomId: string }).roomId ?? dto.roomId;
    this.server.to(roomId).emit('newSupportMessage', (result as { message: object }).message ?? result);

    return { event: 'supportMessageSent', data: result };
  }
}
