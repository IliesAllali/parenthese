-- CreateTable
CREATE TABLE "tree_visits" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT,
    "accessKind" TEXT NOT NULL,
    "visitorName" TEXT,
    "visitorKey" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tree_visits_treeId_createdAt_idx" ON "tree_visits"("treeId", "createdAt");

-- CreateIndex
CREATE INDEX "tree_visits_treeId_visitorKey_createdAt_idx" ON "tree_visits"("treeId", "visitorKey", "createdAt");

-- AddForeignKey
ALTER TABLE "tree_visits" ADD CONSTRAINT "tree_visits_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_visits" ADD CONSTRAINT "tree_visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
