-- Forme des portraits choisie pour tout l'arbre : varied (aujourd'hui, une forme par personne), round, square ou polaroid.
-- Migration additive : une colonne à varied par défaut, les arbres existants ne changent pas.
-- AlterTable
ALTER TABLE "tree_settings" ADD COLUMN "portraitShape" TEXT NOT NULL DEFAULT 'varied';
