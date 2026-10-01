import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectListResponseDto, ProjectResponseDto, ProjectDto } from './dtos/project.dto';
import { CreateProjectDto } from './dtos/create-project.dto';
import { NodeDto, EdgeDto, ProjectGraphResponseDto } from './dtos/project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) { }

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

  async GetProjectGraphAsync(projectId: number): Promise<ProjectGraphResponseDto> {
    try {
      // First, find the project
      const project = await this.prisma.project.findUnique({
        where: { id: BigInt(projectId) },
      });

      if (!project) {
        return { project: null as any, nodes: [], edges: [] };
      }

      // Fetch nodes and edges in parallel
      const [nodes, edges] = await Promise.all([
        this.prisma.node.findMany({
          where: { projectId: BigInt(projectId) },
        }),
        this.prisma.edge.findMany({
          where: {
            OR: [
              { sourceNode: { projectId: BigInt(projectId) } },
              { targetNode: { projectId: BigInt(projectId) } }
            ]
          }
        })
      ]);

      // Transform the project
      const transformedProject = {
        ...project,
        id: Number(project.id),
        repositoryId: Number(project.repositoryId),
      } as ProjectDto;

      // Transform nodes
      const transformedNodes = nodes.map((node) => ({
        id: String(node.id),
        name: node.name,
        type: node.type,
        filePath: node.filePath,
        description: node.description,
        codeSnippet: node.codeSnippet,
        lineStart: node.lineStart,
        lineEnd: node.lineEnd,
        data: JSON.stringify({
          ...(node.description && { description: node.description }),
          ...(node.codeSnippet && { codeSnippet: node.codeSnippet }),
        }),
      })) as NodeDto[];

      // Transform edges
      const transformedEdges = edges.map((edge) => ({
        id: String(edge.id),
        source: String(edge.sourceNodeId),
        target: String(edge.targetNodeId),
        relation: edge.relation,
        animated: true,
      })) as EdgeDto[];

      return {
        project: transformedProject,
        nodes: transformedNodes,
        edges: transformedEdges,
      };
    } catch (error) {
      console.error('Error in GetProjectGraphAsync:', error);
      return { project: null as any, nodes: [], edges: [] };
    }
  }

  async createProject(dto: CreateProjectDto, userId: string) {
    // return await this.prisma.project.create();
  }
}