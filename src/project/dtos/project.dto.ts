import { IsString, IsNumber, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum Framework {
  NESTJS = 'NESTJS',
  NEXTJS = 'NEXTJS',
  EXPRESS = 'EXPRESS',
  ASPNET = 'ASPNET',
  SPRING = 'SPRING',
  LARAVEL = 'LARAVEL',
  DJANGO = 'DJANGO',
  GO = 'GO',
  FASTAPI = 'FASTAPI',
  FLASK = 'FLASK',
  OTHER = 'OTHER',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export class ProjectDto {
  id: number | bigint; // Handle both number and bigint from Prisma

  @IsString()
  userId: string;

  @IsNumber()
  repositoryId: number | bigint; // Handle both number and bigint from Prisma

  @IsString()
  name: string;

  @IsEnum(Framework)
  framework: Framework;

  @IsEnum(Visibility)
  visibility: Visibility;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsNumber()
  totalNodes: number;

  @IsNumber()
  totalEdges: number;

  @IsOptional()
  lastScannedAt?: Date;

  createdAt: Date;

  modifiedAt: Date;
}

export class ProjectListResponseDto {
  projects: ProjectDto[];
}

export class ProjectResponseDto {
  project: ProjectDto;
}
