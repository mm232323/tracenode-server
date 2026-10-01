import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScanBudgetService } from './scan-budget.service';
import { AxiosInstance } from 'axios';
import * as axios from 'axios';
import { NodeType } from '@prisma/client';

interface AnalysisResult {
  nodes: Array<{ type: string; name: string; description?: string; lineStart?: number; lineEnd?: number; codeSnippet?: string }>;
  edges: Array<{ source: string; target: string; relation: string }>;
  apis: Array<{ nodeName?: string; method: string; path: string; requestSchema?: any; responseSchema?: any }>;
  estimatedTokens: number;
}

@Injectable()
export class AiAnalysisService {
  private readonly http: AxiosInstance;
  private readonly model = process.env.OPENROUTER_MODEL || 'inclusionai/ling-3.0-flash-fin:free';
  private readonly maxContentLength = 8000;

  constructor(
    private prisma: PrismaService,
    private scanBudgetService: ScanBudgetService,
  ) {
    this.http = axios.default.create({
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 120_000,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://tracenode-client.vercel.app/',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'TraceNode',
      },
    });
  }

  /**
   * Analyze a deep file to extract nodes, edges, and APIs
   */
  async analyzeDeepFile(deepFileId: string): Promise<{ nodes: number; edges: number; apis: number }> {
    const deepFile = await this.prisma.deepFile.findUnique({
      where: { id: deepFileId },
      include: {
        file: {
          include: {
            analysisRun: { include: { project: true } },
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

    if (deepFile.file.status === 'ANALYZED') {
      return { nodes: 0, edges: 0, apis: 0 };
    }

    // Never spend an AI request on empty content
    if (!deepFile.file.content?.trim()) {
      console.warn(`Skipping ${deepFile.file.path}: file has no content`);
      await this.prisma.file.update({
        where: { id: deepFile.file.id },
        data: { status: 'FAILED' },
      });
      return { nodes: 0, edges: 0, apis: 0 };
    }

    const analysisRun = deepFile.file.analysisRun;
    const projectId = analysisRun.projectId;
    const userId = analysisRun.userId;

    const budgetCheck = await this.scanBudgetService.canMakeAiRequest(userId, analysisRun.id, 4000);
    if (!budgetCheck.allowed) {
      throw new BadRequestException(`AI budget exceeded: ${budgetCheck.reason}`);
    }

    await this.prisma.file.update({
      where: { id: deepFile.file.id },
      data: { status: 'ANALYZING' },
    });

    try {
      const analysisResult = await this.analyzeFileContent(deepFile.file.content, deepFile.file.path);

      const { nodes, edges, apis } = await this.createAnalysisRecords(
        projectId,
        deepFile.file.id,
        deepFile.file.path,
        analysisResult,
      );

      await this.scanBudgetService.recordAiUsage(
        userId,
        analysisRun.id,
        analysisResult.estimatedTokens || 4000,
        1,
      );

      await this.prisma.file.update({
        where: { id: deepFile.file.id },
        data: { status: 'ANALYZED' },
      });

      return { nodes, edges, apis };
    } catch (error) {
      await this.prisma.file.update({
        where: { id: deepFile.file.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  /**
   * Parse JSON from a model response: strips ``` fences, falls back to the first {...} block
   */
  private parseJsonLoose(raw: string): any {
    const cleaned = raw.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new InternalServerErrorException('AI response did not contain valid JSON');
      }
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new InternalServerErrorException('Failed to parse AI response as JSON');
      }
    }
  }

  /**
   * POST to OpenRouter with retry on 429 / 5xx
   */
  private async postWithRetry(body: any, retries = 2): Promise<any> {
    let attempt = 0;
    while (true) {
      try {
        return await this.http.post('/chat/completions', body);
      } catch (error) {
        const status = (error as any)?.response?.status;
        const retryable = status === 429 || (status >= 500 && status < 600);
        if (!retryable || attempt >= retries) throw error;
        attempt++;
        const delay = 1000 * 2 ** attempt; // 2s, 4s
        console.warn(`OpenRouter ${status}, retry ${attempt}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private buildPrompt(content: string, filePath: string): string {
    const truncated =
      content.length > this.maxContentLength
        ? content.substring(0, this.maxContentLength) + '\n... [content truncated]'
        : content;

    // Number the lines so the model can report accurate lineStart / lineEnd
    const numbered = truncated
      .split('\n')
      .map((line, i) => `${i + 1}| ${line}`)
      .join('\n');

    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    return [
      `Analyze the following ${ext.toUpperCase()} file and extract:`,
      '1. NODES: classes, interfaces, functions, services, controllers, repositories, modules, entities, DTOs.',
      '2. EDGES: relationships between nodes (extends, implements, injects, uses, calls, depends on, contains).',
      '3. APIS: HTTP endpoints defined in this file (controllers, routes). Set "nodeName" to the name of the node that defines the endpoint.',
      '',
      `File: ${filePath}`,
      '',
      'Content (each line is prefixed with its line number and "| "; do not include these prefixes in codeSnippet):',
      '```',
      numbered,
      '```',
      '',
      'Return ONLY a valid JSON object with exactly this structure:',
      '{',
      '  "nodes": [',
      '    {',
      '      "type": "controller|service|repository|interface|class|function|module|entity|dto|other",',
      '      "name": "entity name",',
      '      "description": "brief description of what it does",',
      '      "lineStart": 10,',
      '      "lineEnd": 25,',
      '      "codeSnippet": "short code snippet or empty string"',
      '    }',
      '  ],',
      '  "edges": [',
      '    {',
      '      "source": "name of source node",',
      '      "target": "name of target node",',
      '      "relation": "EXTENDS|IMPLEMENTS|INJECTS|USES|CALLS|DEPENDS_ON|CONTAINS"',
      '    }',
      '  ],',
      '  "apis": [',
      '    {',
      '      "nodeName": "name of the controller/function node defining this endpoint",',
      '      "method": "GET|POST|PUT|DELETE|PATCH",',
      '      "path": "/api/endpoint",',
      '      "requestSchema": {},',
      '      "responseSchema": {}',
      '    }',
      '  ]',
      '}',
      '',
      'Rules: use empty arrays when nothing applies. Edge source/target must match node names from this file. Return ONLY the JSON object, no extra text.',
    ].join('\n');
  }

  /**
   * Analyze file content using AI to extract structural information
   */
  private async analyzeFileContent(content: string, filePath: string): Promise<AnalysisResult> {
    const prompt = this.buildPrompt(content, filePath);

    try {
      const response = await this.postWithRetry({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert software architect analyzing code to extract structural information for dependency graphs. You respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4000, // reasoning models spend part of this on their reasoning
      });

      const responseData = response.data;
      const choice = responseData?.choices?.[0];

      const rawContent: string | undefined = choice?.message?.content;
      console.log('Raw AI content:', rawContent,'===================$$$$$$$$$$$$$################');
      if (!rawContent) {
        throw new InternalServerErrorException(
          `AI returned empty content (finish_reason: ${choice?.finish_reason ?? 'unknown'})`,
        );
      }

      const analysisResult = this.parseJsonLoose(rawContent);

      analysisResult.nodes = Array.isArray(analysisResult.nodes) ? analysisResult.nodes : [];
      analysisResult.edges = Array.isArray(analysisResult.edges) ? analysisResult.edges : [];
      analysisResult.apis = Array.isArray(analysisResult.apis) ? analysisResult.apis : [];

      // Use real usage reported by OpenRouter, not the model's own guess
      analysisResult.estimatedTokens =
        responseData?.usage?.total_tokens ?? Math.ceil((prompt.length + rawContent.length) / 4);

      return analysisResult as AnalysisResult;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;

      const status = (error as any)?.response?.status;
      const body = (error as any)?.response?.data;
      console.error('OpenRouter error:', status, body ? JSON.stringify(body, null, 2) : (error as Error).message);

      throw new InternalServerErrorException(
        `Failed to analyze file with AI: ${body?.error?.message ?? (error as Error).message}`,
      );
    }
  }

  /**
   * Create node, edge, and api records in the database
   */
  private async createAnalysisRecords(
    projectId: bigint,
    fileId: string,
    filePath: string,
    analysisResult: Pick<AnalysisResult, 'nodes' | 'edges' | 'apis'>,
  ): Promise<{ nodes: number; edges: number; apis: number }> {
    let nodesCreated = 0;
    let edgesCreated = 0;
    let apisCreated = 0;

    // Create nodes
    const nodeMap = new Map<string, bigint>(); // name -> nodeId
    for (const nodeData of analysisResult.nodes) {
      if (!nodeData?.name) continue;
      try {
        const node = await this.prisma.node.create({
          data: {
            projectId,
            name: nodeData.name,
            type: this.mapNodeType(nodeData.type || 'other'),
            description: nodeData.description,
            filePath,
            codeSnippet: nodeData.codeSnippet || undefined,
            lineStart: Number.isInteger(nodeData.lineStart) ? nodeData.lineStart : undefined,
            lineEnd: Number.isInteger(nodeData.lineEnd) ? nodeData.lineEnd : undefined,
          },
        });
        nodeMap.set(nodeData.name, node.id);
        nodesCreated++;
      } catch (error) {
        console.error(`Failed to create node ${nodeData.name}:`, error);
      }
    }

    // Create edges
    for (const edgeData of analysisResult.edges) {
      try {
        const sourceNodeId = nodeMap.get(edgeData.source);
        const targetNodeId = nodeMap.get(edgeData.target);

        // Skip when either side isn't a node from this file, to avoid wrong relationships
        if (sourceNodeId === undefined || targetNodeId === undefined) continue;

        await this.prisma.edge.create({
          data: {
            sourceNodeId,
            targetNodeId,
            relation: edgeData.relation || 'RELATED_TO',
          },
        });
        edgesCreated++;
      } catch (error) {
        console.error(`Failed to create edge ${edgeData.source} -> ${edgeData.target}:`, error);
      }
    }

    // Create APIs, attached to the node that defines them
    const fallbackNodeId = this.pickFallbackApiNode(analysisResult.nodes, nodeMap);
    for (const apiData of analysisResult.apis) {
      try {
        const targetNodeId =
          (apiData.nodeName ? nodeMap.get(apiData.nodeName) : undefined) ?? fallbackNodeId;

        if (targetNodeId === undefined) continue;

        await this.prisma.api.create({
          data: {
            nodeId: targetNodeId,
            method: (apiData.method || 'GET').toUpperCase(),
            path: apiData.path || '/',
            requestSchema: apiData.requestSchema,
            responseSchema: apiData.responseSchema,
          },
        });
        apisCreated++;
      } catch (error) {
        console.error(`Failed to create API ${apiData.method} ${apiData.path}:`, error);
      }
    }

    return { nodes: nodesCreated, edges: edgesCreated, apis: apisCreated };
  }

  /**
   * If the model didn't say which node owns an API, prefer a controller, then any node
   */
  private pickFallbackApiNode(
    nodes: Array<{ type: string; name: string }>,
    nodeMap: Map<string, bigint>,
  ): bigint | undefined {
    const controller = nodes.find((n) => n?.type?.toLowerCase() === 'controller' && nodeMap.has(n.name));
    if (controller) return nodeMap.get(controller.name);
    return nodeMap.values().next().value;
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
   */
  async analyzeAllPendingDeepFiles(analysisRunId: string): Promise<{
    analyzed: number;
    failed: number;
    totalNodes: number;
    totalEdges: number;
    totalApis: number;
  }> {
    const deepFiles = await this.prisma.deepFile.findMany({
      where: {
        analysisRunId,
        file: { status: { in: ['QUEUED', 'ANALYZING'] } },
      },
      include: { file: true },
    });

    let analyzed = 0;
    let failed = 0;
    let totalNodes = 0;
    let totalEdges = 0;
    let totalApis = 0;

    for (const deepFile of deepFiles) {
      try {
        const result = await this.analyzeDeepFile(deepFile.id);
        analyzed++;
        totalNodes += result.nodes;
        totalEdges += result.edges;
        totalApis += result.apis;
      } catch (error) {
        failed++;
        console.error(`Failed to analyze deep file ${deepFile.id}:`, (error as Error).message);
      }
    }

    return { analyzed, failed, totalNodes, totalEdges, totalApis };
  }
}