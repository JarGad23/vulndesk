-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "VulnerabilityStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED', 'RISK_ACCEPTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdCount" INTEGER NOT NULL,
    "reopenedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vulnerability" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "packageName" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "severity" "Severity" NOT NULL,
    "affectedRange" TEXT NOT NULL,
    "status" "VulnerabilityStatus" NOT NULL DEFAULT 'NEW',
    "detectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMPTZ,

    CONSTRAINT "Vulnerability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryEntry" (
    "id" UUID NOT NULL,
    "vulnerabilityId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "importId" UUID,
    "fromStatus" "VulnerabilityStatus",
    "toStatus" "VulnerabilityStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Import_projectId_createdAt_idx" ON "Import"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Vulnerability_status_dueAt_idx" ON "Vulnerability"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Vulnerability_projectId_status_severity_idx" ON "Vulnerability"("projectId", "status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "Vulnerability_projectId_packageName_advisoryId_key" ON "Vulnerability"("projectId", "packageName", "advisoryId");

-- CreateIndex
CREATE INDEX "HistoryEntry_vulnerabilityId_createdAt_idx" ON "HistoryEntry"("vulnerabilityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vulnerability" ADD CONSTRAINT "Vulnerability_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
