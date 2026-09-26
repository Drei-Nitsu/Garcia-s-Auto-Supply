-- Sample data for testing. Run AFTER 001_schema.sql.
-- Run in the SQL Editor (it runs as the postgres role, so RLS doesn't block it).

insert into public.categories (name) values
  ('Engine Parts'), ('Suspension'), ('Lubricants'), ('Electrical'), ('Brakes'), ('Filters')
on conflict (name) do nothing;

insert into public.products (sku, name, category_id, brand, vehicle_compatibility, cost_price, retail_price, stock_quantity, reorder_level)
select v.sku, v.name, c.id, v.brand, v.compat, v.cost, v.retail, v.stock, v.reorder
from (values
  ('4800123000011', 'Engine Oil 10W-40 Semi-Synthetic 1L', 'Lubricants', 'Petron',   array['Universal'],                                  210.00, 295.00, 48, 12),
  ('4800123000028', 'Engine Oil 5W-30 Fully Synthetic 4L', 'Lubricants', 'Shell',    array['Universal'],                                 1450.00,1890.00, 15,  5),
  ('90915-YZZE1',   'Oil Filter',                          'Filters',    'Toyota',   array['Toyota Wigo 2020-2025','Vios NCP93','Vios NCP150'],180.00, 265.00, 30, 10),
  ('17801-0Y040',   'Air Filter Element',                  'Filters',    'Toyota',   array['Vios NCP150','Yaris 2014-2020'],             320.00, 480.00,  4,  6),
  ('04465-0D130',   'Front Brake Pads Set',                'Brakes',     'Akebono',  array['Vios NCP93','Vios NCP150'],                  980.00,1450.00,  8,  4),
  ('BP-WIGO-F',     'Front Brake Pads Set',                'Brakes',     'Bendix',   array['Toyota Wigo 2020-2025'],                     850.00,1250.00,  3,  4),
  ('NGK-BKR6E',     'Spark Plug BKR6E',                    'Electrical', 'NGK',      array['Vios NCP93','Mitsubishi Mirage 2013-2023'],   95.00, 150.00, 60, 20),
  ('MT-NS40ZL',     'Car Battery NS40ZL Maintenance-Free', 'Electrical', 'Motolite', array['Toyota Wigo 2020-2025','Vios NCP93','Honda City 2009-2013'], 3100.00, 4150.00, 6, 3),
  ('KYB-334386',    'Shock Absorber Front Left',           'Suspension', 'KYB',      array['Vios NCP93'],                                1650.00,2350.00,  0,  2),
  ('555-SL2830',    'Stabilizer Link',                     'Suspension', '555',      array['Vios NCP150','Yaris 2014-2020'],             520.00, 780.00, 12,  4),
  ('GATES-6PK1210', 'Fan Belt 6PK1210',                    'Engine Parts','Gates',   array['Innova 2016-2024','Fortuner 2016-2024'],     690.00, 980.00,  9,  3),
  ('CLT-COOL-1L',   'Coolant Pre-mixed Green 1L',          'Lubricants', 'Prestone', array['Universal'],                                 160.00, 240.00, 25,  8)
) as v(sku, name, category, brand, compat, cost, retail, stock, reorder)
join public.categories c on c.name = v.category
on conflict (sku) do nothing;

insert into public.customers (name, contact_number, vehicle_plate_no, address) values
  ('Walk-in Customer', null, null, null),
  ('Juan Dela Cruz', '09171234567', 'NAB 1234', 'Lipa City, Batangas'),
  ('Maria Santos',   '09281234567', 'DAC 5678', 'Tanauan City, Batangas');
