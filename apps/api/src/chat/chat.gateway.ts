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
import { UseGuards, UseFilters } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    // Basic connection handling. Authorization is checked via Guard on specific messages.
    console.log(`Client connected to chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from chat: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
    console.log(`Client ${client.data.user.id} joined room: ${data.roomId}`);
    return { event: 'joinedRoom', data: data.roomId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    console.log(`Client ${client.data.user.id} left room: ${data.roomId}`);
    return { event: 'leftRoom', data: data.roomId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() dto: SendMessageDto, @ConnectedSocket() client: Socket) {
    const userId = client.data.user.id;

    // Save message to DB
    const message = await this.chatService.sendMessage(userId, dto.chatRoomId, dto.content);

    // Broadcast to the room (including the sender to confirm receipt, or exclude with client.broadcast)
    this.server.to(dto.chatRoomId).emit('newMessage', message);

    return { event: 'messageSent', data: message };
  }
}
