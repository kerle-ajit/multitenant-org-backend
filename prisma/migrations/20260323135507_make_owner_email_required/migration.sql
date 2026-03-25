/*
  Warnings:

  - A unique constraint covering the columns `[ownerEmail]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Made the column `ownerEmail` on table `Tenant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "ownerEmail" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_ownerEmail_key" ON "Tenant"("ownerEmail");
