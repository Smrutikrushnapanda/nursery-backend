-- =============================================================================
-- Enable organization scoping for tenant-owned tables
-- =============================================================================
-- Safe to run multiple times.
--
-- Tables covered:
--  - categories        (already tenant-scoped in code)
--  - subcategories     (new tenant scope)
--  - menu_master       (new tenant scope)
--
-- Global/reference tables that should NOT get organization_id:
--  - organizations
--  - business_types
-- =============================================================================

BEGIN;

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE subcategories
ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE menu_master
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- If this is a single-organization DB, auto-backfill NULL organization_id.
DO $$
DECLARE
  single_org_id UUID;
  org_count INT;
BEGIN
  SELECT COUNT(*), MIN(id)
  INTO org_count, single_org_id
  FROM organizations;

  IF org_count = 1 THEN
    UPDATE categories
    SET organization_id = single_org_id
    WHERE organization_id IS NULL;

    -- Derive subcategory org from linked category first.
    UPDATE subcategories sc
    SET organization_id = c.organization_id
    FROM categories c
    WHERE sc.category_id = c.id
      AND sc.organization_id IS NULL;

    -- If still NULL, fallback to the only organization.
    UPDATE subcategories
    SET organization_id = single_org_id
    WHERE organization_id IS NULL;

    UPDATE menu_master
    SET organization_id = single_org_id
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- Add foreign keys (idempotent pattern).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_categories_organization_id'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT fk_categories_organization_id
      FOREIGN KEY (organization_id)
      REFERENCES organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_subcategories_organization_id'
  ) THEN
    ALTER TABLE subcategories
      ADD CONSTRAINT fk_subcategories_organization_id
      FOREIGN KEY (organization_id)
      REFERENCES organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_menu_master_organization_id'
  ) THEN
    ALTER TABLE menu_master
      ADD CONSTRAINT fk_menu_master_organization_id
      FOREIGN KEY (organization_id)
      REFERENCES organizations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_organization_id
  ON categories (organization_id);

CREATE INDEX IF NOT EXISTS idx_subcategories_organization_id
  ON subcategories (organization_id);

CREATE INDEX IF NOT EXISTS idx_menu_master_organization_id
  ON menu_master (organization_id);

COMMIT;

-- Post-checks
SELECT 'categories' AS table_name, COUNT(*) AS null_org_rows
FROM categories
WHERE organization_id IS NULL
UNION ALL
SELECT 'subcategories', COUNT(*)
FROM subcategories
WHERE organization_id IS NULL
UNION ALL
SELECT 'menu_master', COUNT(*)
FROM menu_master
WHERE organization_id IS NULL;
