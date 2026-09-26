import { IsString, IsNumber, IsOptional } from 'class-validator';

export class ScanBudget {
  @IsNumber()
  maxFolders: number;

  @IsNumber()
  maxFiles: number;

  @IsNumber()
  maxDeepFiles: number;

  @IsNumber()
  maxAiTokens: number;

  @IsNumber()
  maxAiRequests: number;

  @IsNumber()
  maxRepositorySize: number; // in MB
    [key: string]: any;
}

export class PlanDto {
  id: number;

  @IsString()
  name: string;

  apiLimit: number | string; // Handle both number and Decimal from Prisma

  mappingLimit: number | string; // Handle both number and Decimal from Prisma

  @IsNumber()
  @IsOptional()
  monthlyPrice?: number;

  @IsNumber()
  @IsOptional()
  yearlyPrice?: number;

  @IsOptional()
  scanBudget?: ScanBudget;

  createdAt: Date;
}

export class PlanListResponseDto {
  plans: PlanDto[];
}

export class PlanResponseDto {
  plan: PlanDto;
}