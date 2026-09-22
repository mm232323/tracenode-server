import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { PlanListResponseDto, PlanResponseDto, PlanDto, ScanBudget } from './dtos/plan.dto';

@Injectable()
export class PlanService {
  db = new PrismaService();
  constructor(private userService: UserService) {}
  async GetAllAsync(): Promise<PlanListResponseDto> {
    const plans = await this.db.plan.findMany();
    const transformedPlans = plans.map(plan => ({
      ...plan,
      apiLimit: typeof plan.apiLimit === 'object' ? Number(plan.apiLimit) : plan.apiLimit,
      mappingLimit: typeof plan.mappingLimit === 'object' ? Number(plan.mappingLimit) : plan.mappingLimit,
      scanBudget: {
        maxFolders: plan.maxFolders,
        maxFiles: plan.maxFiles,
        maxDeepFiles: plan.maxDeepFiles,
        maxAiRequests: plan.maxAiRequests,
        maxAiTokens: plan.maxAiTokens,
        maxRepositorySize: plan.maxRepoSizeMb,
      } as ScanBudget,
    }));
    return { plans: transformedPlans as PlanDto[] };
  }
  async GetByIdAsync(planId: number): Promise<PlanResponseDto> {
    const plan = await this.db.plan.findFirst({
      where: {id: planId },
    });
    if (!plan) {
      return { plan: null as any };
    }
    const transformedPlan = {
      ...plan,
      apiLimit: typeof plan.apiLimit === 'object' ? Number(plan.apiLimit) : plan.apiLimit,
      mappingLimit: typeof plan.mappingLimit === 'object' ? Number(plan.mappingLimit) : plan.mappingLimit,
      scanBudget: {
        maxFolders: plan.maxFolders,
        maxFiles: plan.maxFiles,
        maxDeepFiles: plan.maxDeepFiles,
        maxAiRequests: plan.maxAiRequests,
        maxAiTokens: plan.maxAiTokens,
        maxRepositorySize: plan.maxRepoSizeMb,
      } as ScanBudget,
    };
    return { plan: transformedPlan as PlanDto };
  }
  async GetByUserIdAsync(userId: string): Promise<PlanResponseDto> {
    var planId = await this.db.user.findFirst({
      where: {id: userId },
      select: { planId: true }})
    return await this.GetByIdAsync(planId?.planId ?? 0);
  }
}
