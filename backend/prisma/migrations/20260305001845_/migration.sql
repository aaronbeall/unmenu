-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "scans_remaining" INTEGER NOT NULL DEFAULT 5,
    "scans_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "image_hash" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "ocr_text" TEXT,
    "processed_menu" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedMenu" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "menu_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedMenu" (
    "id" TEXT NOT NULL,
    "image_hash" TEXT NOT NULL,
    "processed_menu" JSONB NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedMenu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Scan_user_id_idx" ON "Scan"("user_id");

-- CreateIndex
CREATE INDEX "Scan_image_hash_idx" ON "Scan"("image_hash");

-- CreateIndex
CREATE INDEX "Scan_status_idx" ON "Scan"("status");

-- CreateIndex
CREATE INDEX "SavedMenu_user_id_idx" ON "SavedMenu"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CachedMenu_image_hash_key" ON "CachedMenu"("image_hash");

-- CreateIndex
CREATE INDEX "CachedMenu_image_hash_idx" ON "CachedMenu"("image_hash");

-- CreateIndex
CREATE INDEX "CachedMenu_expires_at_idx" ON "CachedMenu"("expires_at");

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMenu" ADD CONSTRAINT "SavedMenu_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
