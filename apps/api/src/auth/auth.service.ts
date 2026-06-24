import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@intender/shared';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user and organization atomically
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
        },
      });

      await tx.organization.create({
        data: {
          ownerUserId: newUser.id,
          legalType: dto.legalType,
          legalName: dto.legalName,
          bin: dto.bin,
        },
      });

      return newUser;
    });

    return this.login(user);
  }

  async switchRole(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (user.role === 'ADMIN') {
      throw new ConflictException('Администратор не может менять роль');
    }

    const newRole = user.role === 'BUYER' ? 'SUPPLIER' : 'BUYER';

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
    });

    return this.login(updatedUser);
  }
}
