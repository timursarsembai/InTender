import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsIn(['deepseek', 'claude', 'gemini'])
  aiProvider?: string;

  @IsOptional()
  @IsString()
  deepseekApiKey?: string;

  @IsOptional()
  @IsString()
  anthropicApiKey?: string;

  @IsOptional()
  @IsString()
  geminiApiKey?: string;
}
