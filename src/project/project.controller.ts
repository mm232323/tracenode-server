import { Controller, Get, Param } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectListResponseDto, ProjectResponseDto } from './dtos/project.dto';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}
  @Get('/user/:userId')
  async getProjectsAsync(@Param('userId') userId: string): Promise<ProjectListResponseDto> {
    return this.projectService.GetByUserIdAsync(userId);
  }
  @Get('/:projectId')
  async getProjectByIdAsync(@Param('projectId') projectId: string): Promise<ProjectResponseDto> {
    return this.projectService.GetByIdAsync(Number(projectId));
  }
}
