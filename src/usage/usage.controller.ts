import { Controller, Get, Param } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageResponseDto } from './dtos/usage.dto';

@Controller('usage')
export class UsageController {
    constructor(private readonly usageService: UsageService) {}
    @Get('/:userId')
    async getUserUsagesAsync(@Param('userId') userId: string): Promise<UsageResponseDto> {
        return await this.usageService.GetByUserIdAsync(userId);
    }
}
