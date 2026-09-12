import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { PlanService } from 'src/plan/plan.service';
import { ProjectService } from 'src/project/project.service';
import { UsageService } from 'src/usage/usage.service';
import { UserStatesResponseDto, RecentProjectsResponseDto, UserUsagesResponseDto, UserStatus } from './dtos/dashboard-response.dto';

@Injectable()
export class DashboardService {
  [x: string]: any;
  constructor(
    private userService: UserService,
    private planService: PlanService,
    private projectService: ProjectService,
    private usageService: UsageService,
  ) {}
  async getUserGlobalStatus(userId: string): Promise<UserStatus> {
    let user = await this.userService.GetByIdAsync(userId);
    if (user == null) throw new NotFoundException('User not found');
    let plan = await this.planService.GetByUserIdAsync(userId);
    let userStatus: UserStatus = {
      id: user.user.id,
      planId: plan?.plan.id,
      planName: plan?.plan.name,
      userName: user.user.fullName ?? '',
    };

    return userStatus;
  }
  async getUserStates(userId: string): Promise<UserStatesResponseDto> {
    let ProjectsCount = await this.projectService.GetByUserIdAsync(userId);
    let nodesCount = ProjectsCount.projects.reduce(
      (acc, project) => acc + project.totalNodes,
      0,
    );
    let UserPlan = await this.planService.GetByUserIdAsync(userId);
    let MapsCount = await this.usageService.GetByUserIdAsync(userId);
    return {
      ProjectsCount: ProjectsCount.projects.length,
      nodesCount,
      UserPlan: UserPlan?.plan ?? null,
      MapsCount: MapsCount?.usage?.mappingUsed ?? 0,
    };
  }
  async getUserRecentProjects(userId: string): Promise<RecentProjectsResponseDto> {
    let projects = await this.projectService.GetByUserIdAsync(userId);
    projects.projects.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    return { projects: projects.projects.slice(0, 6) };
  }
  async getUserUsages(userId: string): Promise<UserUsagesResponseDto> {
    let usages = await this.usageService.GetByUserIdAsync(userId);
    let limits = await this.planService.GetByUserIdAsync(userId);
    return { 
      usages: usages?.usage ?? null,
      limits: limits?.plan ?? null
    };
  }
}
