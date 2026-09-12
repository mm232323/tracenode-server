import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserStatesResponseDto, RecentProjectsResponseDto, UserUsagesResponseDto, UserStatus } from './dtos/dashboard-response.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
    @Get('/:userId')
  async getUserGlobalStatus(@Param('userId') userId: string): Promise<UserStatus> {
    return this.dashboardService.getUserGlobalStatus(userId);
  }
  @Get('/:userId/states')
  async getUserStates(@Param('userId') userId: string): Promise<UserStatesResponseDto> {
    return this.dashboardService.getUserStates(userId);
  }
  @Get('/:userId/recent-projects')
  async getUserRecentProjects(@Param('userId') userId: string): Promise<RecentProjectsResponseDto> {
    return this.dashboardService.getUserRecentProjects(userId);
  }
  @Get('/:userId/usages')
  async getUserUsages(@Param('userId') userId: string): Promise<UserUsagesResponseDto> {
    return this.dashboardService.getUserUsages(userId);
  }
  
}
