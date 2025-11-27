-- Add crucial_notes column to track the reason behind crucial flag
ALTER TABLE "so_asset_entries"
ADD COLUMN "crucial_notes" TEXT;
