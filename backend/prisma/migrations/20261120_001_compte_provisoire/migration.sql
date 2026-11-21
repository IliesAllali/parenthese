-- Compte provisoire (#251) : l'arbre se fait avant le compte, sous un compte sans email.
-- L'index unique reste : PostgreSQL ne compare pas les NULL entre eux.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
