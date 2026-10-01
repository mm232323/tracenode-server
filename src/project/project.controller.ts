import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.gaurd';
import { ProjectService } from './project.service';
import { ProjectListResponseDto, ProjectResponseDto } from './dtos/project.dto';
import { CreateProjectDto } from './dtos/create-project.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ProjectGraphResponseDto } from './dtos/project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getProjectsAsync(
    @CurrentUser('id') userId: string,
  ): Promise<ProjectListResponseDto> {
    return this.projectService.GetByUserIdAsync(userId);
  }

  @Get('/:projectId')
  async getProjectByIdAsync(
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    return this.projectService.GetByIdAsync(Number(projectId));
  }

  @Get('/:projectId/graph')
  async getProjectGraphAsync(
    @Param('projectId') projectId: string,
  ): Promise<ProjectGraphResponseDto> {
    return this.projectService.GetProjectGraphAsync(Number(projectId));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createProject(@Body() dto: CreateProjectDto, @Req() req) {
    const userId = req.user.userId || req.user.sub; // fallback
    const project = await this.projectService.createProject(dto, userId);
    // return { projectId: project.id };
  }
}