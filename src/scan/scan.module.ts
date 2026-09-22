import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { ScanBudgetService } from './scan-budget.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScanController],
  providers: [ScanService, ScanBudgetService]
})
export class ScanModule {}
