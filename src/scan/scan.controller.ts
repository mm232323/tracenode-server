import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScanService } from './scan.service';
import { StartScanDto } from './dtos/scan.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.gaurd';

@Controller('scan')
@UseGuards(JwtAuthGuard) // apply to whole controller, or per-route
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post('start')
  async startScan(
    @Body() scanData: StartScanDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.scanService.startScan(userId, scanData);
  }
}
