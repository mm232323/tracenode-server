import { Injectable, BadRequestException } from '@nestjs/common';
import * as axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScanBudgetService } from './scan-budget.service';
import { AiAnalysisService } from './ai-analysis.service';
import { StartScanDto, ScanProgressDto, ScanCompleteDto } from './dtos/scan.dto';

@Injectable()
export class ScanService {
  // Only source files are worth sending to the AI
  private static readonly ANALYZABLE_EXT = new Set([
    'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cs', 'go', 'php', 'rb', 'kt', 'rs',
  ]);
  private static readonly IGNORED_NAMES =
    /(^|\/)(nest-cli\.json|package(-lock)?\.json|tsconfig.*\.json|README\.md|Dockerfile=)$|\.(spec|test|d)\.ts$/i;

  constructor(
    private prisma: PrismaService,
    private scanBudgetService: ScanBudgetService,
    private aiAnalysisService: AiAnalysisService,
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

    const project = await this.findOrCreateProject(
      userId,
      scanData.repository.owner,
      scanData.repository.name,
    );
    console.log('Project found/created:', project.id);

    const userBudget = await this.scanBudgetService.getUserScanBudget(userId);
    console.log('User budget:', userBudget);

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

    const consumed = { folders: 0, files: 0, deepFiles: 0 };

    await this.processFolders(userId, analysisRun.id, scanData.folders, userBudget, consumed);
    await this.processFiles(userId, analysisRun.id, scanData.files, userBudget, consumed);

    await this.selectDeepAnalysisFiles(
      userId,
      analysisRun.id,
      scanData.files,
      userBudget,
      consumed,
      scanData.repository,
    );

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

  private async findOrCreateProject(userId: string, owner: string, repoName: string) {
    console.log('Finding or creating project for userId:', userId, 'owner:', owner, 'repoName:', repoName);

    let repository = await this.prisma.repository.findFirst({
      where: { userId, repoName, owner },
    });

    if (!repository) {
      console.log('Repository not found, creating new one');
      repository = await this.prisma.repository.create({
        data: { userId, repoName, owner, branch: 'main' },
      });
      console.log('Repository created:', repository.id);
    } else {
      console.log('Repository found:', repository.id);
    }

    let project = await this.prisma.project.findFirst({
      where: { userId, repositoryId: repository.id },
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
        data: { analysisRunId, path: folder.path, filesCount: 0, sizeBytes: 0 },
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
        data: { analysisRunId, path: file.path, size: file.size },
      });

      consumed.files++;
    }
  }

  // ---------- GitHub content fetching ----------

  private isAnalyzable(path: string): boolean {
    if (ScanService.IGNORED_NAMES.test(path)) return false;
    const ext = path.split('.').pop()?.toLowerCase() || '';
    return ScanService.ANALYZABLE_EXT.has(ext);
  }

  private async getGithubToken(userId: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // TODO: replace `githubAccessToken` with the field that stores the user's GitHub token
    return (user as any)?.githubAccessToken ?? process.env.GITHUB_TOKEN;
  }

  private async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
    token?: string,
  ): Promise<string> {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const res = await axios.default.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`,
      {
        params: { ref },
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        responseType: 'text',
        transformResponse: (r) => r, // keep raw text, don't JSON-parse
        timeout: 30_000,
      },
    );
    return res.data as string;
  }

  private async selectDeepAnalysisFiles(
    userId: string,
    analysisRunId: string,
    files: any[],
    budget: any,
    consumed: any,
    repository: { owner: string; name: string; branch: string },
  ) {
    const githubToken = await this.getGithubToken(userId);
    if (!githubToken) {
      console.warn('No GitHub token available: private repos will fail and public ones are rate-limited');
    }

    const candidates = [...files]
      .filter((f) => this.isAnalyzable(f.path))
      .sort((a, b) => b.priority - a.priority);

    for (const file of candidates) {
      if (consumed.deepFiles >= budget.maxDeepFiles) {
        console.log(`Deep analysis budget reached: ${consumed.deepFiles}/${budget.maxDeepFiles}`);
        break;
      }

      const treeFile = await this.prisma.treeFile.findFirst({
        where: { analysisRunId, path: file.path },
      });
      if (!treeFile) continue;

      // Fetch content BEFORE creating records so a failed fetch doesn't use up a slot
      let content: string;
      try {
        content = await this.fetchFileContent(
          repository.owner,
          repository.name,
          file.path,
          repository.branch,
          githubToken,
        );
      } catch (e) {
        const status = (e as any)?.response?.status;
        console.error(`Could not fetch ${file.path} (${status ?? (e as Error).message})`);
        continue;
      }
      if (!content.trim()) continue;

      let fileRecord = await this.prisma.file.findFirst({
        where: { analysisRunId, path: file.path },
      });

      if (!fileRecord) {
        fileRecord = await this.prisma.file.create({
          data: { analysisRunId, path: file.path, status: 'QUEUED', content },
        });
      } else if (!fileRecord.content) {
        fileRecord = await this.prisma.file.update({
          where: { id: fileRecord.id },
          data: { content },
        });
      }

      await this.prisma.treeFile.update({
        where: { id: treeFile.id },
        data: { fileId: fileRecord.id },
      });

      const deepFileRecord = await this.prisma.deepFile.create({
        data: {
          analysisRunId,
          fileId: fileRecord.id,
          score: file.priority,
          reason: file.reasons?.join(', ') || 'High priority file',
        },
      });

      consumed.deepFiles++;

      try {
        await this.aiAnalysisService.analyzeDeepFile(deepFileRecord.id);
      } catch (error) {
        console.error(`Failed to analyze deep file ${deepFileRecord.id}:`, (error as Error).message);
      }
    }
  }
}