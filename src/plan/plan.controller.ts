import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { UserService } from 'src/user/user.service';
import { PlanListResponseDto, PlanResponseDto } from './dtos/plan.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.gaurd';

@Controller('plan')
export class PlanController {
  constructor(
    private planService: PlanService,
    private userService: UserService,
  ) {}
  @Get('/')
  async getAllAsync(): Promise<PlanListResponseDto> {
    return this.planService.GetAllAsync();
  }
  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserPlan(@CurrentUser() user: any): Promise<PlanResponseDto> {
    console.log('Current user in plan controller:', user);
    if (!user || !user.id) {
      console.error('User authentication failed. User object:', user);
      throw new Error('User authentication required');
    }
    return await this.planService.GetByUserIdAsync(user.id);
  }

  @Get('/:id')
  async findById(@Param('id') planId: number): Promise<PlanResponseDto> {
    return await this.planService.GetByIdAsync(planId);
  }
}
