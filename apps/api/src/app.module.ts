import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { WalletsModule } from './wallets/wallets.module';
import { OrdersModule } from './orders/orders.module';
import { OffersModule } from './offers/offers.module';
import { FilesModule } from './files/files.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RatingsModule } from './ratings/ratings.module';
import { ChatModule } from './chat/chat.module';
import { SupportChatModule } from './support-chat/support-chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WalletsModule,
    OrdersModule,
    OffersModule,
    FilesModule,
    AiModule,
    AuditModule,
    ComplaintsModule,
    AdminModule,
    NotificationsModule,
    RatingsModule,
    ChatModule,
    SupportChatModule,
  ],
})
export class AppModule {}
