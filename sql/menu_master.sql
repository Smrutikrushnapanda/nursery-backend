-- =============================================================================
-- Menu Master Table for Sidebar Menu System
-- =============================================================================

-- 1. CREATE TABLE QUERY
-- =============================================================================
CREATE TABLE menu_master (
    id SERIAL PRIMARY KEY,
    menu_name VARCHAR(255) NOT NULL,
    path VARCHAR(500),
    parent_id INTEGER REFERENCES menu_master(id) ON DELETE SET NULL,
    icon VARCHAR(100),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add index for better query performance
CREATE INDEX idx_menu_master_parent_id ON menu_master(parent_id);
CREATE INDEX idx_menu_master_display_order ON menu_master(display_order);

-- 2. INSERT QUERIES - Initial Menu Data
-- =============================================================================

-- First, insert main menus (parent_id is NULL for main menus)
INSERT INTO menu_master (menu_name, path, parent_id, icon, display_order, is_visible, status)
VALUES 
    ('Dashboard', '/dashboard', NULL, 'dashboard-icon', 1, TRUE, TRUE),
    ('Master', '/master', NULL, 'master-icon', 2, TRUE, TRUE),
    ('Workflow', '/workflow', NULL, 'workflow-icon', 3, TRUE, TRUE),
    ('Report', '/report', NULL, 'report-icon', 4, TRUE, TRUE);

-- Insert submenus under Master using subquery to get parent_id
INSERT INTO menu_master (menu_name, path, parent_id, icon, display_order, is_visible, status)
VALUES 
    ('Plant Master', '/master/plant', (SELECT id FROM menu_master WHERE menu_name = 'Master'), 'plant-icon', 1, TRUE, TRUE),
    ('Category Master', '/master/category', (SELECT id FROM menu_master WHERE menu_name = 'Master'), 'category-icon', 2, TRUE, TRUE);

-- Insert submenus under Workflow using subquery to get parent_id
INSERT INTO menu_master (menu_name, path, parent_id, icon, display_order, is_visible, status)
VALUES 
    ('Add Inventory', '/workflow/add-inventory', (SELECT id FROM menu_master WHERE menu_name = 'Workflow'), 'add-inventory-icon', 1, TRUE, TRUE),
    ('Print QR', '/workflow/print-qr', (SELECT id FROM menu_master WHERE menu_name = 'Workflow'), 'print-qr-icon', 2, TRUE, TRUE),
    ('Scan & Sell', '/workflow/scan-sell', (SELECT id FROM menu_master WHERE menu_name = 'Workflow'), 'scan-sell-icon', 3, TRUE, TRUE),
    ('QR View', '/workflow/qr-view', (SELECT id FROM menu_master WHERE menu_name = 'Workflow'), 'qr-view-icon', 4, TRUE, TRUE);

-- Insert submenus under Report using subquery to get parent_id
INSERT INTO menu_master (menu_name, path, parent_id, icon, display_order, is_visible, status)
VALUES 
    ('Sales Report', '/report/sales', (SELECT id FROM menu_master WHERE menu_name = 'Report'), 'sales-icon', 1, TRUE, TRUE),
    ('Inventory Report', '/report/inventory', (SELECT id FROM menu_master WHERE menu_name = 'Report'), 'inventory-icon', 2, TRUE, TRUE);

-- 3. EXAMPLE SELECT QUERY - Fetch Menu in Hierarchical Order
-- =============================================================================

-- Query to fetch all menus with hierarchical structure (main menus first, then submenus sorted by parent and display_order)
SELECT 
    m.id,
    m.menu_name,
    m.path,
    m.parent_id,
    m.icon,
    m.display_order,
    m.is_visible,
    m.status,
    m.created_at,
    m.updated_at,
    CASE WHEN m.parent_id IS NULL THEN 0 ELSE 1 END AS menu_level,
    COALESCE(p.menu_name, 'ROOT') AS parent_name
FROM menu_master m
LEFT JOIN menu_master p ON m.parent_id = p.id
WHERE m.status = TRUE AND m.is_visible = TRUE
ORDER BY 
    CASE WHEN m.parent_id IS NULL THEN m.display_order ELSE (SELECT display_order FROM menu_master WHERE id = m.parent_id) END,
    m.menu_level,
    m.display_order;

-- Alternative: Recursive CTE for true hierarchical tree structure
WITH RECURSIVE menu_tree AS (
    -- Base case: Main menus (parent_id IS NULL)
    SELECT 
        id,
        menu_name,
        path,
        parent_id,
        icon,
        display_order,
        is_visible,
        status,
        created_at,
        updated_at,
        0 AS level,
        menu_name AS hierarchy_path
    FROM menu_master
    WHERE parent_id IS NULL AND status = TRUE
    
    UNION ALL
    
    -- Recursive case: Child menus
    SELECT 
        m.id,
        m.menu_name,
        m.path,
        m.parent_id,
        m.icon,
        m.display_order,
        m.is_visible,
        m.status,
        m.created_at,
        m.updated_at,
        mt.level + 1,
        mt.hierarchy_path || ' > ' || m.menu_name
    FROM menu_master m
    INNER JOIN menu_tree mt ON m.parent_id = mt.id
    WHERE m.status = TRUE
)
SELECT *
FROM menu_tree
ORDER BY level, (SELECT display_order FROM menu_master WHERE menu_name = SPLIT_PART(hierarchy_path, ' > ', 1)), display_order;

-- Simple flat list query for sidebar rendering
SELECT 
    id,
    menu_name,
    path,
    parent_id,
    icon,
    display_order,
    is_visible,
    status,
    created_at,
    updated_at
FROM menu_master
WHERE status = TRUE
ORDER BY 
    COALESCE(parent_id, 0), 
    display_order;