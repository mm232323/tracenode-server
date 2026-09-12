import { Module } from '@nestjs/common';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [PlanController],
  providers: [PlanService],
  imports: [UserModule],
  exports:[PlanService]
})
export class PlanModule {}
