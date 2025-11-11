-- Add sort order columns
ALTER TABLE "sites" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "categories" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "departments" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Populate existing records with deterministic order based on creation time (fallback to name)
WITH ordered_sites AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE("createdat", datetime('now')), "name") - 1 AS rn
  FROM "sites"
)
UPDATE "sites"
SET "sort_order" = (
  SELECT rn FROM ordered_sites WHERE ordered_sites.id = "sites".id
);

WITH ordered_categories AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE("createdat", datetime('now')), "name") - 1 AS rn
  FROM "categories"
)
UPDATE "categories"
SET "sort_order" = (
  SELECT rn FROM ordered_categories WHERE ordered_categories.id = "categories".id
);

WITH ordered_departments AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE("createdat", datetime('now')), "name") - 1 AS rn
  FROM "departments"
)
UPDATE "departments"
SET "sort_order" = (
  SELECT rn FROM ordered_departments WHERE ordered_departments.id = "departments".id
);
