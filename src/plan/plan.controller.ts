import { Controller, Get, Param } from '@nestjs/common';
import { PlanService } from './plan.service';
import { UserService } from 'src/user/user.service';
import { PlanListResponseDto, PlanResponseDto } from './dtos/plan.dto';

@Controller('plan')
export class PlanController {
  constructor(private planService: PlanService, private userService: UserService) {}
  @Get('/')
  async getAllAsync(): Promise<PlanListResponseDto> {
    return this.planService.GetAllAsync();
  }
  @Get('/user/:id')
  async findByUserId(@Param('id') userId: string): Promise<PlanResponseDto> {
    return await this.planService.GetByUserIdAsync(userId);
  }
  @Get('/id/:id')
  async findById(@Param('id') planId: number): Promise<PlanResponseDto> {
    return await this.planService.GetByIdAsync(planId);
  }
}