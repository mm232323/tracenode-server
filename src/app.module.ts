import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PlanModule } from './plan/plan.module';
import { ProjectModule } from './project/project.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommunityModule } from './community/community.module';
import { NotificationModule } from './notification/notification.module';
import { UsageModule } from './usage/usage.module';
import { ScanModule } from './scan/scan.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    UserModule,
    PlanModule,
    ProjectModule,
    DashboardModule,
    CommunityModule,
    NotificationModule,
    UsageModule,
    ScanModule,
  ],
})
export class AppModule {}