-- Create enums
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'member');
CREATE TYPE "ContributionPolicy" AS ENUM ('direct', 'pending');
CREATE TYPE "VisitorPolicy" AS ENUM ('read_only');

-- Create tables
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trees" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rootPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "trees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tree_access_passwords" (
    "treeId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "contributorHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_access_passwords_pkey" PRIMARY KEY ("treeId")
);

CREATE TABLE "tree_memberships" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "contributionModeOverride" "ContributionPolicy",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tree_settings" (
    "treeId" TEXT NOT NULL,
    "memberContributionPolicy" "ContributionPolicy" NOT NULL DEFAULT 'pending',
    "visitorPolicy" "VisitorPolicy" NOT NULL DEFAULT 'read_only',
    "contributorPolicy" "ContributionPolicy" NOT NULL DEFAULT 'pending',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_settings_pkey" PRIMARY KEY ("treeId")
);

CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "deathDate" TIMESTAMP(3),
    "sex" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unions" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "partner1PersonId" TEXT NOT NULL,
    "partner2PersonId" TEXT,
    "unionType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "unions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parent_child_links" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "parentPersonId" TEXT NOT NULL,
    "childPersonId" TEXT NOT NULL,
    "viaUnionId" TEXT,
    "parentageType" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "parent_child_links_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "trees_slug_key" ON "trees"("slug");
CREATE INDEX "trees_ownerUserId_idx" ON "trees"("ownerUserId");
CREATE UNIQUE INDEX "tree_memberships_treeId_userId_key" ON "tree_memberships"("treeId", "userId");
CREATE INDEX "tree_memberships_userId_idx" ON "tree_memberships"("userId");
CREATE INDEX "persons_treeId_idx" ON "persons"("treeId");
CREATE INDEX "unions_treeId_idx" ON "unions"("treeId");
CREATE INDEX "parent_child_links_treeId_idx" ON "parent_child_links"("treeId");

-- Foreign keys
ALTER TABLE "trees"
    ADD CONSTRAINT "trees_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tree_access_passwords"
    ADD CONSTRAINT "tree_access_passwords_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tree_memberships"
    ADD CONSTRAINT "tree_memberships_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tree_memberships"
    ADD CONSTRAINT "tree_memberships_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tree_settings"
    ADD CONSTRAINT "tree_settings_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "persons"
    ADD CONSTRAINT "persons_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unions"
    ADD CONSTRAINT "unions_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parent_child_links"
    ADD CONSTRAINT "parent_child_links_treeId_fkey"
    FOREIGN KEY ("treeId") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;