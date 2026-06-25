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
  deepseekModel?: string;

  @IsOptional()
  @IsString()
  anthropicApiKey?: string;

  @IsOptional()
  @IsString()
  anthropicModel?: string;

  @IsOptional()
  @IsString()
  geminiApiKey?: string;

  @IsOptional()
  @IsString()
  geminiModel?: string;
}
