-- Souvenirs envoyés par la famille : en attente jusqu'à la relecture du propriétaire (25/09/2026).
-- Additif : tous les médias existants restent visibles (statut approved par défaut).

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('approved', 'pending', 'rejected');

-- AlterEnum
ALTER TYPE "ContributionEntityType" ADD VALUE 'media';

-- AlterTable
ALTER TABLE "media_items" ADD COLUMN     "contributionSessionId" TEXT,
ADD COLUMN     "status" "MediaStatus" NOT NULL DEFAULT 'approved';
