import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectListResponseDto, ProjectResponseDto, ProjectDto } from './dtos/project.dto';

@Injectable()
export class ProjectService {
      db = new PrismaService();
    async GetByUserIdAsync(userId: string): Promise<ProjectListResponseDto> {
        const projects = await this.db.project.findMany({where:{userId:userId}});
        const transformedProjects = projects.map(project => ({
          ...project,
          id: Number(project.id),
          repositoryId: Number(project.repositoryId),
        }));
        return { projects: transformedProjects as ProjectDto[] };
    }
    async GetByIdAsync(projectId: number): Promise<ProjectResponseDto> {
        const project = await this.db.project.findUnique({where:{id:BigInt(projectId)}});
        if (!project) {
          return { project: null as any };
        }
        const transformedProject = {
          ...project,
          id: Number(project.id),
          repositoryId: Number(project.repositoryId),
        };
        return { project: transformedProject as ProjectDto };
    }

}
