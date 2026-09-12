import { Controller, Get, Param } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityListResponseDto, CommunityResponseDto } from './dtos/community.dto';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}
  
  @Get('/')
  async getAllAsync(): Promise<CommunityListResponseDto> {
    return this.communityService.GetAllAsync();
  }
  
  @Get('/:id')
  async getByIdAsync(@Param('id') id: string): Promise<CommunityResponseDto> {
    return this.communityService.GetByIdAsync(id);
  }
}
