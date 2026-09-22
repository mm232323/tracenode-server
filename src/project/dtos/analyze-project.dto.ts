export class AnalyzeProjectDto {
  files: Array<{
    path: string;
    content: string;
  }>;
}