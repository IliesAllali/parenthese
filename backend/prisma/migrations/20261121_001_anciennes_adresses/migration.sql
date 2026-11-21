-- Anciennes adresses d'un arbre renommé, gardées pour que les liens déjà envoyés mènent encore à lui.
-- Migration additive : une table vide, rien n'est réécrit.
-- CreateTable
CREATE TABLE "tree_slug_aliases" (
    "slug" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_slug_aliases_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "tree_slug_aliases_treeId_idx" ON "tree_slug_aliases"("treeId");

-- AddForeignKey
ALTER TABLE "tree_slug_aliases" ADD CONSTRAINT "tree_slug_aliases_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
