-- Repair categories.name safely for existing databases.
-- This script is idempotent and works whether `name` is missing or contains NULLs.

BEGIN;

-- 1) Ensure `name` column exists as nullable first.
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS name VARCHAR(50);

-- 2) Backfill rows where name is NULL.
--    Uses a deterministic fallback so no rows are lost.
UPDATE categories
SET name = CONCAT('Category-', id)
WHERE name IS NULL;

-- 3) Verify data quality.
SELECT COUNT(*) AS null_name_count
FROM categories
WHERE name IS NULL;

COMMIT;
