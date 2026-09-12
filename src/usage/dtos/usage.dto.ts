import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UsageDto {
  id: number | bigint; // Handle both number and bigint from Prisma

  @IsString()
  userId: string;

  @IsNumber()
  planId: number;

  apiUsed: number | string; // Handle both number and Decimal from Prisma

  @IsNumber()
  mappingUsed: number;

  @IsOptional()
  expireDate?: Date;

  createdAt: Date;
}

export class UsageResponseDto {
  usage: UsageDto;
}

export class UsageWithLimitsDto {
  usage: UsageDto;
  limits: any; // PlanDto
}
