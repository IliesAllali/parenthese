-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('drawing', 'sticker', 'text');

-- AlterEnum
ALTER TYPE "ContributionEntityType" ADD VALUE 'annotation';

-- CreateTable
CREATE TABLE "annotations" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "type" "AnnotationType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "content" TEXT NOT NULL,
    "style" JSONB NOT NULL DEFAULT '{}',
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "annotations_treeId_idx" ON "annotations"("treeId");

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
