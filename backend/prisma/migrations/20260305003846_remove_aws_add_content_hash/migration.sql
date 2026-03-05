/*
  Warnings:

  - You are about to drop the column `image_hash` on the `CachedMenu` table. All the data in the column will be lost.
  - You are about to drop the column `image_hash` on the `Scan` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `Scan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[content_hash]` on the table `CachedMenu` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content_hash` to the `CachedMenu` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_hash` to the `Scan` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CachedMenu_image_hash_idx";

-- DropIndex
DROP INDEX "CachedMenu_image_hash_key";

-- DropIndex
DROP INDEX "Scan_image_hash_idx";

-- AlterTable
ALTER TABLE "CachedMenu" DROP COLUMN "image_hash",
ADD COLUMN     "content_hash" VARCHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE "Scan" DROP COLUMN "image_hash",
DROP COLUMN "image_url",
ADD COLUMN     "content_hash" VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CachedMenu_content_hash_key" ON "CachedMenu"("content_hash");

-- CreateIndex
CREATE INDEX "CachedMenu_content_hash_idx" ON "CachedMenu"("content_hash");

-- CreateIndex
CREATE INDEX "Scan_content_hash_idx" ON "Scan"("content_hash");
