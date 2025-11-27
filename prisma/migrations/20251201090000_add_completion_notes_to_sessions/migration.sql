-- Add completion notes to SO sessions so we can capture required remarks
ALTER TABLE "so_sessions"
ADD COLUMN "completion_notes" TEXT;
