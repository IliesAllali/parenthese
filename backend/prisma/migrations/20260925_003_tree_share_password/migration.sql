-- CreateTable
CREATE TABLE "tree_share_passwords" (
    "treeId" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_share_passwords_pkey" PRIMARY KEY ("treeId")
);

-- AddForeignKey
ALTER TABLE "tree_share_passwords" ADD CONSTRAINT "tree_share_passwords_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

