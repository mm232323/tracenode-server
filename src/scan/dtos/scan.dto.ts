import { IsString, IsNumber, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ScanFolderDto {
  @IsString()
  path: string;

  @IsNumber()
  depth: number;

  @IsNumber()
  priority: number;
}

export class ScanFileDto {
  @IsString()
  path: string;

  @IsString()
  sha: string;

  @IsNumber()
  size: number;

  @IsNumber()
  priority: number;

  @IsString()
  category: string;

  @IsArray()
  @IsString({ each: true })
  reasons: string[];
}

export class ScanStatsDto {
  @IsNumber()
  totalEntries: number;

  @IsNumber()
  ignoredEntries: number;

  @IsNumber()
  keptFolders: number;

  @IsNumber()
  keptFiles: number;

  @IsNumber()
  droppedByCap: number;
}

export class RepositoryDto {
  @IsString()
  owner: string;

  @IsString()
  name: string;

  @IsString()
  branch: string;

  @IsString()
  treeSha: string;
}

export class StartScanDto {
  @Type(() => RepositoryDto)
  repository: RepositoryDto;

  @IsBoolean()
  truncated: boolean;

  @IsArray()
  @Type(() => ScanFolderDto)
  folders: ScanFolderDto[];

  @IsArray()
  @Type(() => ScanFileDto)
  files: ScanFileDto[];

  @Type(() => ScanStatsDto)
  stats: ScanStatsDto;
}

export class ScanProgressDto {
  @IsString()
  analysisRunId: string;

  @IsString()
  status: string;

  @IsNumber()
  @IsOptional()
  foldersScanned?: number;

  @IsNumber()
  @IsOptional()
  filesProcessed?: number;

  @IsNumber()
  @IsOptional()
  deepFilesAnalyzed?: number;

  @IsString()
  @IsOptional()
  message?: string;
}

export class ScanCompleteDto {
  @IsString()
  analysisRunId: string;

  @IsString()
  status: string;

  @IsNumber()
  @IsOptional()
  durationMs?: number;

  @IsString()
  @IsOptional()
  message?: string;
}
