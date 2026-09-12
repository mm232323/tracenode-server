import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PlanService } from 'src/plan/plan.service';
import { UserService } from 'src/user/user.service';
import { ProjectService } from 'src/project/project.service';
import { UsageService } from 'src/usage/usage.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService,PlanService,UserService,ProjectService,UsageService],
})
export class DashboardModule {}
