import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScanBudgetService } from './scan-budget.service';
import { DeepFile, File, AnalysisRun } from '@prisma/client';
import { AxiosInstance } from 'axios';
import * as axios from 'axios';
import { NodeType } from '@prisma/client';

@Injectable()
export class AiAnalysisService {
  private readonly http: AxiosInstance;

  constructor(
    private prisma: PrismaService,
    private scanBudgetService: ScanBudgetService,
  ) {
    this.http = axios.default.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://tracenode.app',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'TraceNode',
      },
    });
  }

  /**
   * Analyze a deep file to extract nodes, edges, and APIs
   * @param deepFileId The ID of the deep file to analyze
   * @returns Object with counts of created nodes, edges, and APIs
   */
  async analyzeDeepFile(deepFileId: string): Promise<{ nodes: number; edges: number; apis: number }> {
    // Get the deep file with related file and analysis run
    const deepFile = await this.prisma.deepFile.findUnique({
      where: { id: deepFileId },
      include: {
        file: {
          include: {
            analysisRun: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!deepFile) {
      throw new BadRequestException(`Deep file not found: ${deepFileId}`);
    }

    if (!deepFile.file) {
      throw new BadRequestException(`Associated file not found for deep file: ${deepFileId}`);
    }

    // Check if already analyzed
    if (deepFile.file.status === 'ANALYZED') {
      return { nodes: 0, edges: 0, apis: 0 }; // Already analyzed
    }

    const analysisRun = deepFile.file.analysisRun;
    const projectId = analysisRun.projectId;
    const userId = analysisRun.userId;

    // Check AI budget
    const budgetCheck = await this.scanBudgetService.canMakeAiRequest(
      userId,
      analysisRun.id,
      4000, // Estimated tokens for analysis (adjust as needed)
    );

    if (!budgetCheck.allowed) {
      throw new BadRequestException(`AI budget exceeded: ${budgetCheck.reason}`);
    }

    // Update file status to ANALYZING
    await this.prisma.file.update({
      where: { id: deepFile.file.id },
      data: { status: 'ANALYZING' },
    });

    try {
      // Analyze the file content
      const analysisResult = await this.analyzeFileContent(
        deepFile.file.content || '',
        deepFile.file.path,
      );

      // Create nodes, edges, and APIs in database
      const { nodes, edges, apis } = await this.createAnalysisRecords(
        projectId,
        deepFile.file.id,
        deepFile.file.path,
        analysisResult,
      );

      // Update AI budget consumption
      await this.scanBudgetService.recordAiUsage(
        userId,
        analysisRun.id,
        analysisResult.estimatedTokens || 4000,
        1, // One AI request
      );

      // Update file status to ANALYZED
      await this.prisma.file.update({
        where: { id: deepFile.file.id },
        data: { status: 'ANALYZED' },
      });

      return { nodes, edges, apis };
    } catch (error) {
      // Update file status to FAILED on error
      await this.prisma.file.update({
        where: { id: deepFile.file.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  /**
   * Analyze file content using AI to extract structural information
   * @param content The file content to analyze
   * @param filePath The file path (for context)
   * @returns Analysis result with nodes, edges, and APIs
   */
  private async analyzeFileContent(content: string, filePath: string): Promise<{
    nodes: Array<{ type: string; name: string; description?: string; lineStart?: number; lineEnd?: number; codeSnippet?: string }>;
    edges: Array<{ source: string; target: string; relation: string }>;
    apis: Array<{ method: string; path: string; requestSchema?: any; responseSchema?: any }>;
    estimatedTokens: number;
  }> {
    // Truncate content if too long (to manage token usage)
    const maxContentLength = 8000; // Adjust based on model limits
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '\n... [content truncated]' 
      : content;

    // Determine file type for better prompting
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    // const isTsOrJs = ['ts', 'tsx', 'js', 'jsx'].includes(ext);
    // const isPy = ext === 'py';
    // const isJava = ext === 'java';
    // const isCs = ext === 'cs';
    // const isGo = ext === 'go';
    // const isPhp = ext === 'php';
    // const isRuby = ext === 'rb';

    // Create prompt based on file type
    let prompt = `Analyze the following ${ext.toUpperCase()} file and extract:\n`;
    prompt += '1. NODES: Classes, interfaces, functions, services, controllers, repositories, modules, etc.\n';
    prompt += '2. EDGES: Relationships between nodes (inheritance, implementation, composition, usage, etc.)\n';
    prompt += '3. APIS: If this file contains API endpoints (controllers, routes, etc.), extract them.\n\n';
    prompt += `File: ${filePath}\n\n`;
    prompt += 'Content:\n```\n';
    prompt += truncatedContent;
    prompt += '\n```\n\n';
    prompt += 'Return ONLY a valid JSON object with this structure:\n';
    prompt += '{\n';
    prompt += '  "nodes": [\n';
    prompt += '    {\n';
    prompt += '      "type": "controller|service|repository|interface|class|function|module|entity|dto|other",\n';
    prompt += '      "name": "entity name",\n';
    prompt += '      "description": "brief description of what it does",\n';
    prompt += '      "lineStart": 10,\n';
    prompt += '      "lineEnd": 25,\n';
    prompt += '      "codeSnippet": "optional short code snippet"\n';
    prompt += '    }\n';
    prompt += '  ],\n';
    prompt += '  "edges": [\n';
    prompt += '    {\n';
    prompt += '      "source": "name of source node",\n';
    prompt += '      "target": "name of target node",\n';
    prompt += '      "relation": "EXTENDS|IMPLEMENTS|INJECTS|USES|CALLS|DEPENDS_ON|CONTAINS|etc."\n';
    prompt += '    }\n';
    prompt += '  ],\n';
    prompt += '  "apis": [\n';
    prompt += '    {\n';
    prompt += '      "method": "GET|POST|PUT|DELETE|PATCH",\n';
    prompt += '      "path": "/api/endpoint",\n';
    prompt += '      "requestSchema": {}, // optional JSON schema\n';
    prompt += '      "responseSchema": {} // optional JSON schema\n';
    prompt += '    }\n';
    prompt += '  ],\n';
    prompt += '  "estimatedTokens": 1500\n';
    prompt += '}\n\n';
    prompt += 'IMPORTANT: Return ONLY the JSON object, no additional text.';

    try {
      const response = await this.http.post('/chat/completions', {
        model: 'nvidia/nemotron-3-super-120b-a12b:free', // Using the free model from reference
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect analyzing code to extract structural information for dependency graphs. You respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent output
        max_tokens: 2000,
        response_format: { type: 'json_object' }, // Ensure JSON output
      });

      const responseData = response.data;
      const aiResponse = responseData.choices[0].message.content;

      // Parse the JSON response
      let analysisResult;
      try {
        analysisResult = JSON.parse(aiResponse);
      } catch (parseError) {
        // If the AI didn't return valid JSON, try to extract JSON from the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysisResult = JSON.parse(jsonMatch[0]);
          } catch (e) {
            throw new InternalServerErrorException('Failed to parse AI response as JSON');
          }
        } else {
          throw new InternalServerErrorException('AI response did not contain valid JSON');
        }
      }

      // Validate and set defaults
      analysisResult.nodes = analysisResult.nodes || [];
      analysisResult.edges = analysisResult.edges || [];
      analysisResult.apis = analysisResult.apis || [];
      analysisResult.estimatedTokens = analysisResult.estimatedTokens || 
        Math.ceil((prompt.length + aiResponse.length) / 4); // Rough token estimate

      return analysisResult;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to analyze file with AI: ${(error as Error).message}`);
    }
  }

  /**
   * Create node, edge, and api records in the database
   * @param projectId The project ID (to associate nodes with the project)
   * @param fileId The file ID
   * @param filePath The file path (to set on nodes)
   * @param analysisResult The analysis result from AI
   * @returns Object with counts of created records
   */
  private async createAnalysisRecords(
    projectId: bigint,
    fileId: string,
    filePath: string,
    analysisResult: {
      nodes: Array<any>;
      edges: Array<any>;
      apis: Array<any>;
    }
  ): Promise<{ nodes: number; edges: number; apis: number }> {
    let nodesCreated = 0;
    let edgesCreated = 0;
    let apisCreated = 0;

    // Create nodes
    const nodeMap = new Map<string, bigint>(); // name -> nodeId
    for (const nodeData of analysisResult.nodes) {
      try {
        const node = await this.prisma.node.create({
          data: {
            projectId,
            name: nodeData.name || 'unnamed',
            type: this.mapNodeType(nodeData.type || 'other'),
            description: nodeData.description,
            filePath: filePath, // Set the file path here
            codeSnippet: nodeData.codeSnippet,
            lineStart: nodeData.lineStart,
            lineEnd: nodeData.lineEnd,
          },
        });
        nodeMap.set(nodeData.name, node.id);
        nodesCreated++;
      } catch (error) {
        // Log but continue - don't let one bad node break the whole analysis
        console.error(`Failed to create node ${nodeData.name}:`, error);
      }
    }

    // Create edges
    for (const edgeData of analysisResult.edges) {
      try {
        // Find source and target nodes by name
        const sourceNodeId = nodeMap.get(edgeData.source);
        const targetNodeId = nodeMap.get(edgeData.target);

        if (sourceNodeId !== undefined && targetNodeId !== undefined) {
          await this.prisma.edge.create({
            data: {
              sourceNodeId,
              targetNodeId,
              relation: edgeData.relation || 'RELATED_TO',
            },
          });
          edgesCreated++;
        }
        // If nodes not found, we skip to avoid creating incorrect relationships
      } catch (error) {
        console.error(`Failed to create edge ${edgeData.source} -> ${edgeData.target}:`, error);
      }
    }

    // Create APIs
    for (const apiData of analysisResult.apis) {
      try {
        // Find a node to attach this API to (preferably a controller or service)
        // For simplicity, we'll attach to the first node we find (could be improved)
        let targetNodeId: bigint | undefined;
        for (const [name, nodeId] of nodeMap) {
          targetNodeId = nodeId;
          break; // Just take the first node
        }

        if (targetNodeId !== undefined) {
          await this.prisma.api.create({
            data: {
              nodeId: targetNodeId,
              method: apiData.method || 'GET',
              path: apiData.path || '/',
              requestSchema: apiData.requestSchema,
              responseSchema: apiData.responseSchema,
            },
          });
          apisCreated++;
        }
      } catch (error) {
        console.error(`Failed to create API ${apiData.method} ${apiData.path}:`, error);
      }
    }

    return { nodes: nodesCreated, edges: edgesCreated, apis: apisCreated };
  }

  /**
   * Map AI node types to Prisma NodeType enum
   */
  private mapNodeType(aiType: string): NodeType {
    switch (aiType.toLowerCase()) {
      case 'controller': return NodeType.CONTROLLER;
      case 'service': return NodeType.SERVICE;
      case 'repository': return NodeType.ENTITY; // Map repository to ENTITY
      case 'interface': return NodeType.INTERFACE;
      case 'class': return NodeType.CLASS;
      case 'function': return NodeType.FUNCTION;
      case 'module': return NodeType.MODULE;
      case 'entity': return NodeType.ENTITY;
      case 'dto': return NodeType.DTO;
      default: return NodeType.OTHER;
    }
  }

  /**
   * Analyze all pending deep files for an analysis run
   * @param analysisRunId The analysis run ID
   * @returns Summary of analysis results
   */
  async analyzeAllPendingDeepFiles(analysisRunId: string): Promise<{
    analyzed: number;
    failed: number;
    totalNodes: number;
    totalEdges: number;
    totalApis: number;
  }> {
    // Get all deep files for this analysis run that are queued or analyzing
    const deepFiles = await this.prisma.deepFile.findMany({
      where: {
        analysisRunId,
        file: {
          status: {
            in: ['QUEUED', 'ANALYZING'],
          },
        },
      },
      include: {
        file: true,
      },
    });

    let analyzedCount = 0;
    let failedCount = 0;
    let totalNodes = 0;
    let totalEdges = 0;
    let totalApis = 0;

    for (const deepFile of deepFiles) {
      try {
        const result = await this.analyzeDeepFile(deepFile.id);
        analyzedCount++;
        totalNodes += result.nodes;
        totalEdges += result.edges;
        totalApis += result.apis;
      } catch (error) {
        failedCount++;
        console.error(`Failed to analyze deep file ${deepFile.id}:`, error);
        // Continue with other files
      }
    }

    return {
      analyzed: analyzedCount,
      failed: failedCount,
      totalNodes,
      totalEdges,
      totalApis,
    };
  }
}