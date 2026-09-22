import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScanBudgetService, BudgetCheckResult } from './scan-budget.service';
import { StartScanDto, ScanProgressDto, ScanCompleteDto } from './dtos/scan.dto';

@Injectable()
export class ScanService {
  constructor(
    private prisma: PrismaService,
    private scanBudgetService: ScanBudgetService,
  ) {}

  async startScan(
    userId: string,
    scanData: StartScanDto,
  ): Promise<{ analysisRunId: string; message: string }> {
    // Find or create project for this repository
    const project = await this.findOrCreateProject(
      userId,
      scanData.repository.owner,
      scanData.repository.name,
    );

    // Create analysis run
    const analysisRun = await this.prisma.analysisRun.create({
      data: {
        projectId: project.id,
        userId,
        status: 'SCANNING',
        treeSha: scanData.repository.treeSha,
        branch: scanData.repository.branch,
        totalFiles: scanData.stats.keptFiles,
        totalSize: scanData.stats.totalEntries,
        budget: {
          maxFolders: scanData.folders.length,
          maxFiles: scanData.files.length,
          maxDeepFiles: 0, // Will be determined by plan
        },
        consumed: {
          folders: 0,
          files: 0,
          deepFiles: 0,
          aiRequests: 0,
          aiTokens: 0,
        },
      },
    });

    // Process folders within budget
    await this.processFolders(userId, analysisRun.id, scanData.folders);

    // Process files within budget
    await this.processFiles(userId, analysisRun.id, scanData.files);

    // Select top priority files for deep analysis
    await this.selectDeepAnalysisFiles(userId, analysisRun.id, scanData.files);

    return {
      analysisRunId: analysisRun.id,
      message: 'Scan started successfully',
    };
  }

  async getScanProgress(analysisRunId: string): Promise<ScanProgressDto> {
    const analysisRun = await this.prisma.analysisRun.findUnique({
      where: { id: analysisRunId },
      include: {
        folders: true,
        files: true,
        deepFiles: true,
      },
    });

    if (!analysisRun) {
      throw new BadRequestException('Analysis run not found');
    }

    return {
      analysisRunId,
      status: analysisRun.status,
      foldersScanned: analysisRun.folders.length,
      filesProcessed: analysisRun.files.length,
      deepFilesAnalyzed: analysisRun.deepFiles.length,
      message: `Scan in progress: ${analysisRun.folders.length} folders, ${analysisRun.files.length} files processed`,
    };
  }

  async completeScan(analysisRunId: string): Promise<ScanCompleteDto> {
    const analysisRun = await this.prisma.analysisRun.update({
      where: { id: analysisRunId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    const durationMs = analysisRun.completedAt
      ? analysisRun.completedAt.getTime() - analysisRun.startedAt.getTime()
      : 0;

    return {
      analysisRunId,
      status: analysisRun.status,
      durationMs,
      message: 'Scan completed successfully',
    };
  }

  private async findOrCreateProject(
    userId: string,
    owner: string,
    repoName: string,
  ) {
    // First, find the repository
    let repository = await this.prisma.repository.findFirst({
      where: {
        userId,
        repoName,
        owner,
      },
    });

    if (!repository) {
      repository = await this.prisma.repository.create({
        data: {
          userId,
          repoName,
          owner,
          branch: 'main',
        },
      });
    }

    // Then find or create the project
    let project = await this.prisma.project.findFirst({
      where: {
        userId,
        repositoryId: repository.id,
      },
    });

    if (!project) {
      project = await this.prisma.project.create({
        data: {
          userId,
          repositoryId: repository.id,
          name: `${owner}/${repoName}`,
          framework: 'OTHER',
          visibility: 'PRIVATE',
        },
      });
    }

    return project;
  }

  private async processFolders(
    userId: string,
    analysisRunId: string,
    folders: any[],
  ) {
    for (const folder of folders) {
      const budgetCheck = await this.scanBudgetService.canScanFolder(
        userId,
        analysisRunId,
      );

      if (!budgetCheck.allowed) {
        console.log(`Folder budget check failed: ${budgetCheck.reason}`);
        break;
      }

      await this.prisma.folder.create({
        data: {
          analysisRunId,
          path: folder.path,
          filesCount: 0, // Will be updated as files are processed
          sizeBytes: 0,
        },
      });
    }
  }

  private async processFiles(
    userId: string,
    analysisRunId: string,
    files: any[],
  ) {
    for (const file of files) {
      const budgetCheck = await this.scanBudgetService.canAddFile(
        userId,
        analysisRunId,
      );

      if (!budgetCheck.allowed) {
        console.log(`File budget check failed: ${budgetCheck.reason}`);
        break;
      }

      await this.prisma.treeFile.create({
        data: {
          analysisRunId,
          path: file.path,
          size: file.size,
        },
      });
    }
  }

  private async selectDeepAnalysisFiles(
    userId: string,
    analysisRunId: string,
    files: any[],
  ) {
    // Sort files by priority (already sorted from client)
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    for (const file of sortedFiles) {
      const budgetCheck = await this.scanBudgetService.canDeepAnalyzeFile(
        userId,
        analysisRunId,
      );

      if (!budgetCheck.allowed) {
        console.log(`Deep analysis budget check failed: ${budgetCheck.reason}`);
        break;
      }

      // Check if file already exists in tree files
      const treeFile = await this.prisma.treeFile.findFirst({
        where: {
          analysisRunId,
          path: file.path,
        },
      });

      if (treeFile) {
        // Mark this file for deep analysis
        await this.prisma.deepFile.create({
          data: {
            analysisRunId,
            fileId: treeFile.id,
            score: file.priority,
            reason: file.reasons?.join(', ') || 'High priority file',
          },
        });
      }
    }
  }
}
