-- Les 30 jours d'un compte provisoire partent de sa dernière visite. Colonne vide au départ : la date de création
-- tient lieu de dernière visite pour les comptes déjà là.
-- AlterTable
ALTER TABLE "users" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
