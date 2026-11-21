-- Photo de l'arbre : colonnes vides au départ, rien à reprendre. Choisir une icône ou la lettre la retire.
ALTER TABLE "trees" ADD COLUMN "imagePath" TEXT;
ALTER TABLE "trees" ADD COLUMN "imageMimeType" TEXT;
ALTER TABLE "trees" ADD COLUMN "imageCrop" JSONB;
ALTER TABLE "trees" ADD COLUMN "imageUpdatedAt" TIMESTAMP(3);
