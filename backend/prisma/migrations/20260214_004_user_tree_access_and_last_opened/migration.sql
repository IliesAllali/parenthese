-- Create enum for persisted shared access role
CREATE TYPE "SharedAccessRole" AS ENUM ('visitor', 'contributor');

-- Alter users table with last opened tree preference
ALTER TABLE "users"
ADD COLUMN "lastOpenedTreeId" TEXT,
ADD COLUMN "lastOpenedAccessMode" TEXT,
ADD COLUMN "lastOpenedRole" TEXT,
ADD COLUMN "lastOpenedAt" TIMESTAMP(3);

-- Create table to persist per-user shared tree access
CREATE TABLE "user_tree_accesses" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SharedAccessRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tree_accesses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_tree_accesses_treeId_userId_key" ON "user_tree_accesses"("treeId", "userId");
CREATE INDEX "user_tree_accesses_userId_updatedAt_idx" ON "user_tree_accesses"("userId", "updatedAt");
CREATE INDEX "users_lastOpenedAt_idx" ON "users"("lastOpenedAt");

ALTER TABLE "users"
ADD CONSTRAINT "users_lastOpenedTreeId_fkey"
FOREIGN KEY ("lastOpenedTreeId") REFERENCES "trees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_tree_accesses"
ADD CONSTRAINT "user_tree_accesses_treeId_fkey"
FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_tree_accesses"
ADD CONSTRAINT "user_tree_accesses_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
