import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  chatRoomId!: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUUID()
  @IsOptional()
  attachmentFileId?: string;
}
