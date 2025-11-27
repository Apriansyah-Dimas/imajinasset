-- Add planned start/end window for SO sessions
ALTER TABLE "so_sessions"
ADD COLUMN "plan_start" DATETIME DEFAULT NULL;

ALTER TABLE "so_sessions"
ADD COLUMN "plan_end" DATETIME DEFAULT NULL;
