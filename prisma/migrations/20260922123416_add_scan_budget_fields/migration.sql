-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "max_ai_requests" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "max_ai_tokens" INTEGER NOT NULL DEFAULT 500000,
ADD COLUMN     "max_deep_files" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "max_files" INTEGER NOT NULL DEFAULT 3000,
ADD COLUMN     "max_folders" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "max_repo_size_mb" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" UUID NOT NULL,
    "projectId" BIGINT NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "budget" JSONB NOT NULL,
    "consumed" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "tree_sha" TEXT,
    "branch" TEXT,
    "total_size" INTEGER NOT NULL DEFAULT 0,
    "total_files" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "filesCount" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deep_files" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,

    CONSTRAINT "deep_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tree_files" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER,
    "fileId" UUID,

    CONSTRAINT "tree_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deep_files" ADD CONSTRAINT "deep_files_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deep_files" ADD CONSTRAINT "deep_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_files" ADD CONSTRAINT "tree_files_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "analysis_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_files" ADD CONSTRAINT "tree_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
