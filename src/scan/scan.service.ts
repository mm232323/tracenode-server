import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScanBudgetService } from './scan-budget.service';
import { StartScanDto, ScanProgressDto, ScanCompleteDto } from './dtos/scan.dto';

@Injectable()
export class ScanService {
  constructor(
    private prisma: PrismaService,
    private scanBudgetService: ScanBudgetService,
  ) {}

  /**
   * Get user by backend token (accessToken)
   */
  async getUserByToken(token: string) {
    if (!token) {
      return null;
    }
    return this.prisma.user.findUnique({
      where: { accessToken: token },
    });
  }

  async startScan(
    userId: string,
    scanData: StartScanDto,
  ): Promise<{ analysisRunId: string; message: string }> {
    console.log('Starting scan for userId:', userId);

    // Find or create project for this repository
    const project = await this.findOrCreateProject(
      userId,
      scanData.repository.owner,
      scanData.repository.name,
    );

    console.log('Project found/created:', project.id);

    // Get user's scan budget once
    const userBudget = await this.scanBudgetService.getUserScanBudget(userId);
    console.log('User budget:', userBudget);

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
        budget: userBudget,
        consumed: {
          folders: 0,
          files: 0,
          deepFiles: 0,
          aiRequests: 0,
          aiTokens: 0,
        },
      },
    });

    console.log('Analysis run created:', analysisRun.id);

    // Track consumed resources locally
    const consumed = {
      folders: 0,
      files: 0,
      deepFiles: 0,
    };

    // Process folders within budget
    await this.processFolders(userId, analysisRun.id, scanData.folders, userBudget, consumed);

    // Process files within budget
    await this.processFiles(userId, analysisRun.id, scanData.files, userBudget, consumed);

    // Select top priority files for deep analysis
    await this.selectDeepAnalysisFiles(userId, analysisRun.id, scanData.files, userBudget, consumed);

    // Update consumed in database
    await this.prisma.analysisRun.update({
      where: { id: analysisRun.id },
      data: {
        consumed: {
          folders: consumed.folders,
          files: consumed.files,
          deepFiles: consumed.deepFiles,
          aiRequests: 0,
          aiTokens: 0,
        },
      },
    });

    console.log('Scan completed. Consumed:', consumed);

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
    console.log('Finding or creating project for userId:', userId, 'owner:', owner, 'repoName:', repoName);

    let repository = await this.prisma.repository.findFirst({
      where: {
        userId,
        repoName,
        owner,
      },
    });

    if (!repository) {
      console.log('Repository not found, creating new one');
      repository = await this.prisma.repository.create({
        data: {
          userId,
          repoName,
          owner,
          branch: 'main',
        },
      });
      console.log('Repository created:', repository.id);
    } else {
      console.log('Repository found:', repository.id);
    }

    let project = await this.prisma.project.findFirst({
      where: {
        userId,
        repositoryId: repository.id,
      },
    });

    if (!project) {
      console.log('Project not found, creating new one');
      project = await this.prisma.project.create({
        data: {
          userId,
          repositoryId: repository.id,
          name: `${owner}/${repoName}`,
          framework: 'OTHER',
          visibility: 'PRIVATE',
        },
      });
      console.log('Project created:', project.id);
    } else {
      console.log('Project found:', project.id);
    }

    return project;
  }

  private async processFolders(
    userId: string,
    analysisRunId: string,
    folders: any[],
    budget: any,
    consumed: any,
  ) {
    for (const folder of folders) {
      if (consumed.folders >= budget.maxFolders) {
        console.log(`Folder budget reached: ${consumed.folders}/${budget.maxFolders}`);
        break;
      }

      await this.prisma.folder.create({
        data: {
          analysisRunId,
          path: folder.path,
          filesCount: 0,
          sizeBytes: 0,
        },
      });

      consumed.folders++;
    }
  }

  private async processFiles(
    userId: string,
    analysisRunId: string,
    files: any[],
    budget: any,
    consumed: any,
  ) {
    for (const file of files) {
      if (consumed.files >= budget.maxFiles) {
        console.log(`File budget reached: ${consumed.files}/${budget.maxFiles}`);
        break;
      }

      await this.prisma.treeFile.create({
        data: {
          analysisRunId,
          path: file.path,
          size: file.size,
        },
      });

      consumed.files++;
    }
  }

  private async selectDeepAnalysisFiles(
    userId: string,
    analysisRunId: string,
    files: any[],
    budget: any,
    consumed: any,
  ) {
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    for (const file of sortedFiles) {
      if (consumed.deepFiles >= budget.maxDeepFiles) {
        console.log(`Deep analysis budget reached: ${consumed.deepFiles}/${budget.maxDeepFiles}`);
        break;
      }

      const treeFile = await this.prisma.treeFile.findFirst({
        where: {
          analysisRunId,
          path: file.path,
        },
      });

      if (treeFile) {
        // Create or find the corresponding File record
        let fileRecord = await this.prisma.file.findFirst({
          where: {
            analysisRunId,
            path: file.path,
          },
        });

        if (!fileRecord) {
          fileRecord = await this.prisma.file.create({
            data: {
              analysisRunId,
              path: file.path,
              status: 'QUEUED',
            },
          });
        }

        // Update treeFile to link to the file record
        await this.prisma.treeFile.update({
          where: { id: treeFile.id },
          data: { fileId: fileRecord.id },
        });

        // Now create the deep file record
        await this.prisma.deepFile.create({
          data: {
            analysisRunId,
            fileId: fileRecord.id,
            score: file.priority,
            reason: file.reasons?.join(', ') || 'High priority file',
          },
        });

        consumed.deepFiles++;
      }
    }
  }
}