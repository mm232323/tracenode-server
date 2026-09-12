import { IsString, IsNumber, IsOptional } from 'class-validator';

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

  createdAt: Date;
}

export class PlanListResponseDto {
  plans: PlanDto[];
}

export class PlanResponseDto {
  plan: PlanDto;
}
