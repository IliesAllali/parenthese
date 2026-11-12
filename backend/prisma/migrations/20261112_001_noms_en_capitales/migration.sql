-- Noms de famille affichés en capitales (« Bertrand GAUTHIER »), réglage de l'arbre choisi par ses gestionnaires.
-- Migration additive : une colonne à false par défaut, les arbres existants ne changent pas.
-- AlterTable
ALTER TABLE "tree_settings" ADD COLUMN "surnameUppercase" BOOLEAN NOT NULL DEFAULT false;
