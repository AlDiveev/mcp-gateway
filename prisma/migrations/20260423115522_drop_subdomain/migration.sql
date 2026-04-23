/*
  Warnings:

  - You are about to drop the column `subdomain` on the `Tunnel` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Tunnel_subdomain_key";

-- AlterTable
ALTER TABLE "Tunnel" DROP COLUMN "subdomain";
