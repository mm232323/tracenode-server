import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.gaurd';
import { DashboardService } from './dashboard.service';
import {
  UserStatesResponseDto,
  RecentProjectsResponseDto,
  UserUsagesResponseDto,
  UserStatus,
} from './dtos/dashboard-response.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard) // apply to whole controller, or per-route
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @Get('/')
  async getUserGlobalStatus(
    @CurrentUser('id') userId: string,
  ): Promise<UserStatus> {
    return this.dashboardService.getUserGlobalStatus(userId);
  }
  @Get('/states')
  async getUserStates(
    @CurrentUser('id') userId: string,
  ): Promise<UserStatesResponseDto> {
    return this.dashboardService.getUserStates(userId);
  }
  @Get('/recent-projects')
  async getUserRecentProjects(
    @CurrentUser('id') userId: string,
  ): Promise<RecentProjectsResponseDto> {
    return this.dashboardService.getUserRecentProjects(userId);
  }
  @Get('/usages')
  async getUserUsages(
    @CurrentUser('id') userId: string,
  ): Promise<UserUsagesResponseDto> {
    return this.dashboardService.getUserUsages(userId);
  }
}
