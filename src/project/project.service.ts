import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectListResponseDto, ProjectResponseDto, ProjectDto } from './dtos/project.dto';
import { CreateProjectDto } from './dtos/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async GetByUserIdAsync(userId: string): Promise<ProjectListResponseDto> {
    try {
      const projects = await this.prisma.project.findMany({
        where: { userId },
      });
      const transformedProjects = projects.map((project) => ({
        ...project,
        id: Number(project.id),
        repositoryId: Number(project.repositoryId),
      }));
      return { projects: transformedProjects as ProjectDto[] };
    } catch (error) {
      console.error('Error in GetByUserIdAsync:', error);
      return { projects: [] };
    }
  }

  async GetByIdAsync(projectId: number): Promise<ProjectResponseDto> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: BigInt(projectId) },
      });
      if (!project) {
        return { project: null as any };
      }
      const transformedProject = {
        ...project,
        id: Number(project.id),
        repositoryId: Number(project.repositoryId),
      };
      return { project: transformedProject as ProjectDto };
    } catch (error) {
      console.error('Error in GetByIdAsync:', error);
      return { project: null as any };
    }
  }

  async createProject(dto: CreateProjectDto, userId: string) {
    // return await this.prisma.project.create();
  }

}