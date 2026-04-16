-- Run this BEFORE starting the NestJS app
-- Step 1: Delete categories with null name (they are unusable)
DELETE FROM categories WHERE name IS NULL;

-- Step 2: Check available organizations
SELECT id, organization_name FROM organizations LIMIT 10;

-- Step 3: Backfill organization_id for remaining categories
-- Replace '<your-organization-uuid>' with a real UUID from Step 2
UPDATE categories
SET organization_id = '<your-organization-uuid>'
WHERE organization_id IS NULL;

-- Step 4: Verify no nulls remain
SELECT COUNT(*) FROM categories WHERE name IS NULL;
SELECT COUNT(*) FROM categories WHERE organization_id IS NULL;
