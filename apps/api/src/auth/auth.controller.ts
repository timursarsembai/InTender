import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, registerSchema } from './dto/register.dto';
import { LoginDto, loginSchema } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

// Simple validation pipe for Zod (could be moved to a shared place later)
function validateZod<T>(schema: z.ZodSchema<T>, data: any): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new BadRequestException(messages);
  }
  return result.data;
}

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: any) {
    const validDto = validateZod(registerSchema, dto);
    return this.authService.register(validDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any, @Body() dto: any) {
    // Validating body is optional here since LocalAuthGuard extracts username/password
    // but we can do it for consistency
    validateZod(loginSchema, dto);
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-role')
  async switchRole(@Request() req: any) {
    return this.authService.switchRole(req.user.id);
  }
}
