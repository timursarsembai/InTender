import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SupportChatService } from './support-chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@intender/shared';

@UseGuards(JwtAuthGuard)
@Controller('v1/support')
export class SupportChatController {
  constructor(private readonly supportChatService: SupportChatService) {}

  @Get('my-room')
  getMyRoom(@CurrentUser() user: { sub: string }) {
    return this.supportChatService.getOrCreateMyRoom(user.sub);
  }

  @Get('my-messages')
  getMyMessages(@CurrentUser() user: { sub: string }) {
    return this.supportChatService.getMyMessages(user.sub);
  }

  @Post('send')
  sendMessage(
    @CurrentUser() user: { sub: string },
    @Body('content') content: string,
    @Body('attachmentFileId') attachmentFileId?: string,
  ) {
    return this.supportChatService.sendMessage(user.sub, content, attachmentFileId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('rooms')
  getAllRooms(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
  ) {
    return this.supportChatService.getAllRooms(skip, take);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('rooms/:id/messages')
  getRoomMessages(@CurrentUser() user: { sub: string }, @Param('id') roomId: string) {
    return this.supportChatService.getRoomMessages(user.sub, roomId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post('rooms/:id/send')
  staffSendMessage(
    @CurrentUser() user: { sub: string },
    @Param('id') roomId: string,
    @Body('content') content: string,
    @Body('attachmentFileId') attachmentFileId?: string,
  ) {
    return this.supportChatService.staffSendMessage(user.sub, roomId, content, attachmentFileId);
  }
}
