-- Add is_crucial flag to so_asset_entries
ALTER TABLE "so_asset_entries"
ADD COLUMN "is_crucial" BOOLEAN NOT NULL DEFAULT false;
