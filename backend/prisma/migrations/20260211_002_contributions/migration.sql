-- Create enums for contribution workflow
CREATE TYPE "ContributionSessionStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ContributionActorMode" AS ENUM ('user', 'tree_access');
CREATE TYPE "ContributionEntityType" AS ENUM ('person', 'union', 'parent_child_link');
CREATE TYPE "ContributionAction" AS ENUM ('create', 'update', 'delete', 'reorder');
CREATE TYPE "ConflictState" AS ENUM ('none', 'needs_review');
CREATE TYPE "ContributionDecision" AS ENUM ('approved', 'rejected');

-- Create contribution sessions table
CREATE TABLE "contribution_sessions" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "submittedByLabel" TEXT NOT NULL,
    "mode" "ContributionActorMode" NOT NULL,
    "status" "ContributionSessionStatus" NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "contribution_sessions_pkey" PRIMARY KEY ("id")
);

-- Create contribution changes table
CREATE TABLE "contribution_changes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "entityType" "ContributionEntityType" NOT NULL,
    "entityId" TEXT,
    "action" "ContributionAction" NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "conflictState" "ConflictState" NOT NULL DEFAULT 'none',
    "decision" "ContributionDecision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_changes_pkey" PRIMARY KEY ("id")
);

-- Create audit log table
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "contribution_sessions_treeId_status_createdAt_idx" ON "contribution_sessions"("treeId", "status", "createdAt");
CREATE INDEX "contribution_sessions_submittedByUserId_idx" ON "contribution_sessions"("submittedByUserId");
CREATE INDEX "contribution_changes_sessionId_idx" ON "contribution_changes"("sessionId");
CREATE INDEX "audit_log_treeId_createdAt_idx" ON "audit_log"("treeId", "createdAt");

-- Add foreign keys
ALTER TABLE "contribution_sessions"
    ADD CONSTRAINT "contribution_sessions_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contribution_sessions"
    ADD CONSTRAINT "contribution_sessions_submittedByUserId_fkey"
    FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contribution_sessions"
    ADD CONSTRAINT "contribution_sessions_reviewedBy_fkey"
    FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contribution_changes"
    ADD CONSTRAINT "contribution_changes_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "contribution_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_log"
    ADD CONSTRAINT "audit_log_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
