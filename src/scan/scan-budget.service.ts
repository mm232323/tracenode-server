import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScanBudget } from 'src/plan/dtos/plan.dto';
import { BudgetCheckResult, ConsumedBudget } from './dtos/budget-consume.dto';



@Injectable()
export class ScanBudgetService {
  constructor(private prisma: PrismaService) {}

/**
   * Get the scan budget for a user based on their plan
   */
  
  async getUserScanBudget(userId: string): Promise<ScanBudget> {
    if (!userId) {
      console.error('User ID is required but got:', userId);
      throw new Error('User ID is required');
    }

    console.log('Fetching user scan budget for userId:', userId);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true },
      });

      if (!user) {
        console.error('User not found in database:', userId);
        throw new Error('User not found');
      }

      if (!user.plan) {
        console.log('User has no plan assigned, using default free plan');
        // Default to free plan if no plan assigned
        return {
          maxFolders: 50,
          maxFiles: 3000,
          maxDeepFiles: 15,
          maxAiRequests: 100,
          maxAiTokens: 500000,
          maxRepositorySize: 100,
        };
      }

      console.log('User plan found:', user.plan.name);
      return {
        maxFolders: user.plan.maxFolders,
        maxFiles: user.plan.maxFiles,
        maxDeepFiles: user.plan.maxDeepFiles,
        maxAiRequests: user.plan.maxAiRequests,
        maxAiTokens: user.plan.maxAiTokens,
        maxRepositorySize: user.plan.maxRepoSizeMb,
      };
    } catch (error) {
      console.error('Error fetching user scan budget:', error);
      throw new Error('Failed to fetch user scan budget');
    }
  }

  /**
   * Record AI usage (tokens and requests) against the budget
   */
  async recordAiUsage(
    userId: string,
    analysisRunId: string,
    tokensUsed: number,
    requestsMade: number,
  ): Promise<void> {
    // Update the analysis run's consumed budget
    const analysisRun = await this.prisma.analysisRun.findUnique({
      where: { id: analysisRunId },
    });

    if (!analysisRun) {
      return;
    }

    const consumed = analysisRun.consumed as {
      folders: number;
      files: number;
      deepFiles: number;
      aiRequests: number;
      aiTokens: number;
    } || {
      folders: 0,
      files: 0,
      deepFiles: 0,
      aiRequests: 0,
      aiTokens: 0,
    };

    await this.prisma.analysisRun.update({
      where: { id: analysisRunId },
      data: {
        consumed: {
          ...consumed,
          aiRequests: consumed.aiRequests + requestsMade,
          aiTokens: consumed.aiTokens + tokensUsed,
        },
      },
    });
  }

  /**
   * Get the consumed budget for an analysis run
   */
  async getConsumedBudget(analysisRunId: string): Promise<ConsumedBudget> {
    const analysisRun = await this.prisma.analysisRun.findUnique({
      where: { id: analysisRunId },
      include: {
        folders: true,
        deepFiles: true,
        files: true,
      },
    });

    if (!analysisRun) {
      return {
        folders: 0,
        files: 0,
        deepFiles: 0,
        aiRequests: 0,
        aiTokens: 0,
      };
    }

    return {
      folders: analysisRun.folders.length,
      files: analysisRun.files.length,
      deepFiles: analysisRun.deepFiles.length,
      aiRequests: 0, // Track AI requests separately
      aiTokens: 0, // Track AI tokens separately
    };
  }

  /**
   * Check if scanning a folder is within budget
   */
  async canScanFolder(
    userId: string,
    analysisRunId: string,
  ): Promise<BudgetCheckResult> {
    const budget = await this.getUserScanBudget(userId);
    const consumed = await this.getConsumedBudget(analysisRunId);

    if (consumed.folders >= budget.maxFolders) {
      return {
        allowed: false,
        reason: `Folder scan limit reached (${consumed.folders}/${budget.maxFolders})`,
        remaining: consumed,
      };
    }

    return {
      allowed: true,
      remaining: {
        ...consumed,
        folders: consumed.folders + 1,
      },
    };
  }

  /**
   * Check if adding a file is within budget
   */
  async canAddFile(
    userId: string,
    analysisRunId: string,
  ): Promise<BudgetCheckResult> {
    const budget = await this.getUserScanBudget(userId);
    const consumed = await this.getConsumedBudget(analysisRunId);

    if (consumed.files >= budget.maxFiles) {
      return {
        allowed: false,
        reason: `File limit reached (${consumed.files}/${budget.maxFiles})`,
        remaining: consumed,
      };
    }

    return {
      allowed: true,
      remaining: {
        ...consumed,
        files: consumed.files + 1,
      },
    };
  }

  /**
   * Check if deep analysis of a file is within budget
   */
  async canDeepAnalyzeFile(
    userId: string,
    analysisRunId: string,
  ): Promise<BudgetCheckResult> {
    const budget = await this.getUserScanBudget(userId);
    const consumed = await this.getConsumedBudget(analysisRunId);

    if (consumed.deepFiles >= budget.maxDeepFiles) {
      return {
        allowed: false,
        reason: `Deep analysis limit reached (${consumed.deepFiles}/${budget.maxDeepFiles})`,
        remaining: consumed,
      };
    }

    return {
      allowed: true,
      remaining: {
        ...consumed,
        deepFiles: consumed.deepFiles + 1,
      },
    };
  }

  /**
   * Check if AI request is within budget
   */
  async canMakeAiRequest(
    userId: string,
    analysisRunId: string,
    estimatedTokens: number,
  ): Promise<BudgetCheckResult> {
    const budget = await this.getUserScanBudget(userId);
    const consumed = await this.getConsumedBudget(analysisRunId);

    if (consumed.aiRequests >= budget.maxAiRequests) {
      return {
        allowed: false,
        reason: `AI request limit reached (${consumed.aiRequests}/${budget.maxAiRequests})`,
        remaining: consumed,
      };
    }

    if (consumed.aiTokens + estimatedTokens > budget.maxAiTokens) {
      return {
        allowed: false,
        reason: `AI token limit would be exceeded (${consumed.aiTokens + estimatedTokens}/${budget.maxAiTokens})`,
        remaining: consumed,
      };
    }

    return {
      allowed: true,
      remaining: {
        ...consumed,
        aiRequests: consumed.aiRequests + 1,
        aiTokens: consumed.aiTokens + estimatedTokens,
      },
    };
  }

  /**
   * Check if repository size is within budget
   */
  async canScanRepository(
    userId: string,
    repositorySizeMb: number,
  ): Promise<BudgetCheckResult> {
    const budget = await this.getUserScanBudget(userId);

    if (repositorySizeMb > budget.maxRepositorySize) {
      return {
        allowed: false,
        reason: `Repository size exceeds plan limit (${repositorySizeMb}MB/${budget.maxRepositorySize}MB)`,
        remaining: {
          folders: 0,
          files: 0,
          deepFiles: 0,
          aiRequests: 0,
          aiTokens: 0,
        },
      };
    }

    return {
      allowed: true,
      remaining: {
        folders: 0,
        files: 0,
        deepFiles: 0,
        aiRequests: 0,
        aiTokens: 0,
      },
    };
  }
}