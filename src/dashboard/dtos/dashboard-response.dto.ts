import { ProjectDto } from '../../project/dtos/project.dto';
import { PlanDto } from '../../plan/dtos/plan.dto';
import { UsageDto } from '../../usage/dtos/usage.dto';

export class UserStatesResponseDto {
  ProjectsCount: number;
  nodesCount: number;
  UserPlan: PlanDto | null;
  MapsCount: number;
}

export class RecentProjectsResponseDto {
  projects: ProjectDto[];
}

export class UserUsagesResponseDto {
  usages: UsageDto | null;
  limits: PlanDto | null;
}

export type UserStatus = {
    id: string,
    planId?: number,
    planName?: string,
    userName?: string,
}