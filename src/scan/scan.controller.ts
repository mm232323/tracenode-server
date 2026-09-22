import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ScanService } from './scan.service';
import { ScanBudgetService } from './scan-budget.service';
import { StartScanDto, ScanProgressDto, ScanCompleteDto } from './dtos/scan.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.gaurd';

@Controller('scan')
@UseGuards(JwtAuthGuard)
export class ScanController {
  constructor(
    private readonly scanService: ScanService,
    private readonly scanBudgetService: ScanBudgetService,
  ) {}

  @Post('/start')
  async startScan(
    @Body() scanData: StartScanDto,
    @CurrentUser() user: any,
  ): Promise<{ analysisRunId: string; message: string }> {
    // Check repository size against plan
    const repoSizeCheck = await this.scanBudgetService.canScanRepository(
      user.id,
      scanData.stats.totalEntries / 1024 / 1024, // Approximate size in MB
    );

    if (!repoSizeCheck.allowed) {
      throw new Error(repoSizeCheck.reason);
    }

    return this.scanService.startScan(user.id, scanData);
  }

  @Get('/progress/:analysisRunId')
  async getScanProgress(
    @Param('analysisRunId') analysisRunId: string,
  ): Promise<ScanProgressDto> {
    return this.scanService.getScanProgress(analysisRunId);
  }

  @Post('/complete/:analysisRunId')
  async completeScan(
    @Param('analysisRunId') analysisRunId: string,
  ): Promise<ScanCompleteDto> {
    return this.scanService.completeScan(analysisRunId);
  }
}
