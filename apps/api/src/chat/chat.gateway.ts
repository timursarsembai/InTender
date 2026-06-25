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
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    // Connection established; auth is enforced per-event via WsJwtGuard.
  }

  handleDisconnect(client: Socket) {
    // No-op; rooms are cleaned up by socket.io.
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
    return { event: 'joinedRoom', data: data.roomId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.leave(data.roomId);
    return { event: 'leftRoom', data: data.roomId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() dto: SendMessageDto, @ConnectedSocket() client: Socket) {
    const userId = client.data.user.sub;
    const message = await this.chatService.sendMessage(
      userId,
      dto.chatRoomId,
      dto.content ?? '',
      dto.attachmentFileId,
    );
    this.server.to(dto.chatRoomId).emit('newMessage', message);
    return { event: 'messageSent', data: message };
  }
}
