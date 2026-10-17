-- Migration: 20250216000000_bonus_features
-- Add WebhookDelivery table and project_id to audit_logs

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "project_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "project_id" TEXT,
    "payload_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_deliveries_delivery_id_key" ON "webhook_deliveries"("delivery_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "webhook_deliveries_project_id_created_at_idx" ON "webhook_deliveries"("project_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_project_id_created_at_idx" ON "audit_logs"("project_id", "created_at");
