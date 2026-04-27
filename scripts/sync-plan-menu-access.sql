DO $$
DECLARE
  basic_plan_id uuid;
  standard_plan_id uuid;
  premium_plan_id uuid;

  dashboard_id int;
  master_id int;
  workflow_id int;
  report_id int;
  plant_master_id int;
  plant_variant_id int;
  category_master_id int;
  sub_category_id int;
  inventory_id int;
  payments_id int;
  print_qr_id int;
  scan_sell_id int;
  sales_report_id int;
  log_reports_id int;
  inventory_report_id int;
BEGIN
  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Dashboard', '/dashboard', NULL, 1, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO dashboard_id FROM menu_master WHERE path = '/dashboard' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Dashboard',
         path = '/dashboard',
         parent_id = NULL,
         display_order = 1,
         is_visible = true,
         status = true
   WHERE id = dashboard_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Master', '/master', NULL, 2, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO master_id FROM menu_master WHERE path = '/master' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Master',
         path = '/master',
         parent_id = NULL,
         display_order = 2,
         is_visible = true,
         status = true
   WHERE id = master_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Workflow', '/workflow', NULL, 3, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO workflow_id FROM menu_master WHERE path = '/workflow' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Workflow',
         path = '/workflow',
         parent_id = NULL,
         display_order = 3,
         is_visible = true,
         status = true
   WHERE id = workflow_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Report', '/report', NULL, 4, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO report_id FROM menu_master WHERE path = '/report' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Report',
         path = '/report',
         parent_id = NULL,
         display_order = 4,
         is_visible = true,
         status = true
   WHERE id = report_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Plant Master', '/master/plant', master_id, 1, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO plant_master_id FROM menu_master WHERE path = '/master/plant' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Plant Master',
         path = '/master/plant',
         parent_id = master_id,
         display_order = 1,
         is_visible = true,
         status = true
   WHERE id = plant_master_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Plant Variant', '/master/plant-variant', master_id, 2, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO plant_variant_id FROM menu_master WHERE path = '/master/plant-variant' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Plant Variant',
         path = '/master/plant-variant',
         parent_id = master_id,
         display_order = 2,
         is_visible = true,
         status = true
   WHERE id = plant_variant_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Category Master', '/master/category', master_id, 3, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO category_master_id FROM menu_master WHERE path = '/master/category' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Category Master',
         path = '/master/category',
         parent_id = master_id,
         display_order = 3,
         is_visible = true,
         status = true
   WHERE id = category_master_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Sub Category', '/master/sub-category', master_id, 4, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO sub_category_id FROM menu_master WHERE path = '/master/sub-category' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Sub Category',
         path = '/master/sub-category',
         parent_id = master_id,
         display_order = 4,
         is_visible = true,
         status = true
   WHERE id = sub_category_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Inventory', '/workflow/inventory', workflow_id, 1, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO inventory_id FROM menu_master WHERE path = '/workflow/inventory' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Inventory',
         path = '/workflow/inventory',
         parent_id = workflow_id,
         display_order = 1,
         is_visible = true,
         status = true
   WHERE id = inventory_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Payments', '/workflow/payment', workflow_id, 2, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO payments_id FROM menu_master WHERE path = '/workflow/payment' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Payments',
         path = '/workflow/payment',
         parent_id = workflow_id,
         display_order = 2,
         is_visible = true,
         status = true
   WHERE id = payments_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Print QR', '/workflow/print-qr', workflow_id, 3, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO print_qr_id FROM menu_master WHERE path = '/workflow/print-qr' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Print QR',
         path = '/workflow/print-qr',
         parent_id = workflow_id,
         display_order = 3,
         is_visible = true,
         status = true
   WHERE id = print_qr_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Scan & Sell', '/workflow/scan-sell', workflow_id, 4, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO scan_sell_id FROM menu_master WHERE path = '/workflow/scan-sell' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Scan & Sell',
         path = '/workflow/scan-sell',
         parent_id = workflow_id,
         display_order = 4,
         is_visible = true,
         status = true
   WHERE id = scan_sell_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Sales Report', '/report/sales', report_id, 1, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO sales_report_id FROM menu_master WHERE path = '/report/sales' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Sales Report',
         path = '/report/sales',
         parent_id = report_id,
         display_order = 1,
         is_visible = true,
         status = true
   WHERE id = sales_report_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Log Reports', '/report/log-report', report_id, 2, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO log_reports_id FROM menu_master WHERE path = '/report/log-report' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Log Reports',
         path = '/report/log-report',
         parent_id = report_id,
         display_order = 2,
         is_visible = true,
         status = true
   WHERE id = log_reports_id;

  INSERT INTO menu_master ("menuName", path, parent_id, display_order, is_visible, status)
  VALUES ('Inventory Reports', '/report/inventory', report_id, 3, true, true)
  ON CONFLICT DO NOTHING;
  SELECT id INTO inventory_report_id FROM menu_master WHERE path = '/report/inventory' ORDER BY id LIMIT 1;
  UPDATE menu_master
     SET "menuName" = 'Inventory Reports',
         path = '/report/inventory',
         parent_id = report_id,
         display_order = 3,
         is_visible = true,
         status = true
   WHERE id = inventory_report_id;

  DELETE FROM menu_master m
  USING (
    SELECT path, MIN(id) AS keep_id
    FROM menu_master
    WHERE path IN (
      '/dashboard',
      '/master',
      '/workflow',
      '/report',
      '/master/plant',
      '/master/plant-variant',
      '/master/category',
      '/master/sub-category',
      '/workflow/inventory',
      '/workflow/payment',
      '/workflow/print-qr',
      '/workflow/scan-sell',
      '/report/sales',
      '/report/log-report',
      '/report/inventory'
    )
    GROUP BY path
    HAVING COUNT(*) > 1
  ) d
  WHERE m.path = d.path
    AND m.id <> d.keep_id;

  SELECT id INTO basic_plan_id FROM plans WHERE name = 'BASIC' ORDER BY price ASC LIMIT 1;
  SELECT id INTO standard_plan_id FROM plans WHERE name = 'STANDARD' ORDER BY price ASC LIMIT 1;
  SELECT id INTO premium_plan_id FROM plans WHERE name = 'PREMIUM' ORDER BY price ASC LIMIT 1;

  IF basic_plan_id IS NOT NULL THEN
    UPDATE plans
       SET features = '["INVENTORY","BILLING","PAYMENTS"]'::json,
           "isActive" = true
     WHERE id = basic_plan_id;
  END IF;

  IF standard_plan_id IS NOT NULL THEN
    UPDATE plans
       SET features = '["INVENTORY","BILLING","POS","REPORTS","PAYMENTS","QR"]'::json,
           "isActive" = true
     WHERE id = standard_plan_id;
  END IF;

  IF premium_plan_id IS NOT NULL THEN
    UPDATE plans
       SET features = '["INVENTORY","BILLING","POS","REPORTS","PAYMENTS","QR","ANALYTICS"]'::json,
           "isActive" = true
     WHERE id = premium_plan_id;
  END IF;

  UPDATE plan_menu_access
     SET status = false
   WHERE "planId" IN (basic_plan_id, standard_plan_id, premium_plan_id);

  INSERT INTO plan_menu_access ("planId", "menuId", status)
  SELECT v.plan_id, v.menu_id, true
  FROM (
    VALUES
      (basic_plan_id, dashboard_id),
      (basic_plan_id, master_id),
      (basic_plan_id, plant_master_id),
      (basic_plan_id, plant_variant_id),
      (basic_plan_id, category_master_id),
      (basic_plan_id, sub_category_id),
      (basic_plan_id, workflow_id),
      (basic_plan_id, inventory_id),
      (basic_plan_id, payments_id),
      (basic_plan_id, report_id),
      (basic_plan_id, log_reports_id),

      (standard_plan_id, dashboard_id),
      (standard_plan_id, master_id),
      (standard_plan_id, plant_master_id),
      (standard_plan_id, plant_variant_id),
      (standard_plan_id, category_master_id),
      (standard_plan_id, sub_category_id),
      (standard_plan_id, workflow_id),
      (standard_plan_id, inventory_id),
      (standard_plan_id, payments_id),
      (standard_plan_id, print_qr_id),
      (standard_plan_id, scan_sell_id),
      (standard_plan_id, report_id),
      (standard_plan_id, sales_report_id),
      (standard_plan_id, log_reports_id),
      (standard_plan_id, inventory_report_id),

      (premium_plan_id, dashboard_id),
      (premium_plan_id, master_id),
      (premium_plan_id, plant_master_id),
      (premium_plan_id, plant_variant_id),
      (premium_plan_id, category_master_id),
      (premium_plan_id, sub_category_id),
      (premium_plan_id, workflow_id),
      (premium_plan_id, inventory_id),
      (premium_plan_id, payments_id),
      (premium_plan_id, print_qr_id),
      (premium_plan_id, scan_sell_id),
      (premium_plan_id, report_id),
      (premium_plan_id, sales_report_id),
      (premium_plan_id, log_reports_id),
      (premium_plan_id, inventory_report_id)
  ) AS v(plan_id, menu_id)
  WHERE v.plan_id IS NOT NULL AND v.menu_id IS NOT NULL
  ON CONFLICT ("planId", "menuId")
  DO UPDATE
    SET status = EXCLUDED.status,
        updated_at = NOW();
END;
$$;
