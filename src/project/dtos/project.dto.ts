import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';

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

export class NodeDto {
  @IsString()
  id: string; // Convert bigint to string for client

  @IsString()
  name: string;

  @IsString()
  type: string; // NodeType enum as string

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  codeSnippet?: string;

  @IsNumber()
  @IsOptional()
  lineStart?: number;

  @IsNumber()
  @IsOptional()
  lineEnd?: number;

  // For React Flow, we need position and data
  // We'll compute position client-side or set default
  @IsArray()
  @IsOptional()
  position?: { x: number; y: number };

  @IsString()
  @IsOptional()
  data?: string; // Could be JSON stringified, but we'll keep simple for now
}

export class EdgeDto {
  @IsString()
  id: string; // Convert bigint to string

  @IsString()
  source: string; // sourceNodeId as string

  @IsString()
  target: string; // targetNodeId as string

  @IsString()
  @IsOptional()
  relation?: string;

  @IsBoolean()
  @IsOptional()
  animated?: boolean = true;
}

export class ProjectListResponseDto {
  projects: ProjectDto[];
}

export class ProjectResponseDto {
  project: ProjectDto;
}

export class ProjectGraphResponseDto {
  project: ProjectDto;
  nodes: NodeDto[];
  edges: EdgeDto[];
}