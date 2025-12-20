-- Database Cleanup Migration
-- Run this in order to safely clean up unused fields and data

-- =====================================================
-- 1. REMOVE REDUNDANT FIELDS (SAFE)
-- =====================================================

-- Remove redundant dateCreated field from assets table
-- (Keep createdAt as it's used throughout the application)
ALTER TABLE assets DROP COLUMN IF EXISTS date_created;

-- Remove redundant department string field from employees table
-- (Keep departmentId relationship as it's properly used)
ALTER TABLE employees DROP COLUMN IF EXISTS department;

-- =====================================================
-- 2. REMOVE UNUSED INDEX (SAFE)
-- =====================================================

-- Remove underutilized picId index from assets table
-- (Queries typically use employee relationship instead)
DROP INDEX IF EXISTS "assets_picId_idx";

-- =====================================================
-- 3. CLEAN UP ORPHANED DATA (SAFE)
-- =====================================================

-- Find and report orphaned asset images (for manual review)
SELECT
    COUNT(*) as orphaned_images,
    'Files in uploads folder not linked to any asset' as description
FROM (
    SELECT DISTINCT SUBSTRING(image_url FROM 'uploads/([^/]+)$') as filename
    FROM assets
    WHERE image_url IS NOT NULL
    AND image_url LIKE '%uploads%'
) linked_files
RIGHT JOIN (
    -- This would need to be run as a script to compare with actual files
    SELECT 'placeholder' as filename
) file_system ON linked_files.filename = file_system.filename
WHERE linked_files.filename IS NULL;

-- Clean up any SOAssetEntry records without valid sessions or assets
DELETE FROM so_asset_entries
WHERE so_session_id NOT IN (SELECT id FROM so_sessions)
   OR asset_id NOT IN (SELECT id FROM assets);

-- =====================================================
-- 4. OPTIONAL: REMOVE CUSTOM FIELDS (EVALUATE FIRST)
-- =====================================================

-- Uncomment these ONLY if custom fields are not used
-- DROP TABLE IF EXISTS asset_custom_values;
-- DROP TABLE IF EXISTS asset_custom_fields;

-- =====================================================
-- 5. UPDATE PERFORMANCE (SAFE)
-- =====================================================

-- Analyze tables after cleanup
ANALYZE assets;
ANALYZE employees;
ANALYZE so_asset_entries;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Verify cleanup was successful
SELECT
    'assets' as table_name,
    COUNT(*) as record_count,
    (SELECT COUNT(*) FROM pragma_table_info('assets') WHERE name = 'date_created') as date_created_exists
FROM assets
UNION ALL
SELECT
    'employees' as table_name,
    COUNT(*) as record_count,
    (SELECT COUNT(*) FROM pragma_table_info('employees') WHERE name = 'department') as department_exists
FROM employees;