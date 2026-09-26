-- =====================================================================
-- Pricelist import: Philippine auto-supply generic price list (89 items)
-- Run AFTER 001_schema.sql (and seed.sql, if used). Safe to re-run:
-- categories/products are matched by unique name/sku, so nothing duplicates.
-- Generated from auto_supplies_pricelist_philippines.pdf on 2026-09-26.
-- Notes:
--   * Source PDF gave no SKUs/barcodes -- SKUs here are generated as
--     <CATEGORY-SLUG>-<sequence>, e.g. ENGINE-OIL-01.
--   * products has no unit column, so unit (Liter/Set/Bottle/...) is folded
--     into the name where not already implied, e.g. "ATF ... (Liter)".
--   * Source PDF listed every item at Stock Qty = 5 (looks like a template
--     placeholder, not a real count) -- adjust via Inventory > Adjust Stock.
--   * reorder_level is set to 2 (below the imported qty of 5) so items
--     don't immediately show as LOW_STOCK on import.
--   * No brand or vehicle_compatibility data was in the source; left blank/empty.
-- =====================================================================

insert into public.categories (name) values
  ('Lubricants'), ('Filters'), ('Electrical'), ('Brakes'), ('Fluids'), ('Engine Parts'), ('Suspension'), ('Clutch'), ('Cooling System'), ('Air Conditioning'), ('Chemicals & Additives'), ('Car Care'), ('Accessories'), ('Shop Supplies')
on conflict (name) do nothing;

insert into public.products (sku, name, category_id, brand, vehicle_compatibility, cost_price, retail_price, stock_quantity, reorder_level)
select v.sku, v.name, c.id, null, '{}', v.cost, v.retail, v.stock, v.reorder
from (values
  ('ENGINE-OIL-01', 'Engine Oil 5W-30 Full Synthetic (Liter)', 'Lubricants', 'Liter', 550.00, 700.00, 5, 2),
  ('ENGINE-OIL-02', 'Engine Oil 5W-40 Full Synthetic (Liter)', 'Lubricants', 'Liter', 500.00, 650.00, 5, 2),
  ('ENGINE-OIL-03', 'Engine Oil 10W-30 Semi Synthetic (Liter)', 'Lubricants', 'Liter', 350.00, 450.00, 5, 2),
  ('ENGINE-OIL-04', 'Engine Oil 10W-40 Semi Synthetic (Liter)', 'Lubricants', 'Liter', 330.00, 430.00, 5, 2),
  ('ENGINE-OIL-05', 'Engine Oil 15W-40 Diesel (Liter)', 'Lubricants', 'Liter', 300.00, 400.00, 5, 2),
  ('ENGINE-OIL-06', 'Engine Oil 20W-50 Mineral (Liter)', 'Lubricants', 'Liter', 250.00, 350.00, 5, 2),
  ('OIL-FILTER-01', 'Oil Filter Universal/Standard Spin-on', 'Filters', 'Piece', 150.00, 250.00, 5, 2),
  ('OIL-FILTER-02', 'Oil Filter Cartridge Type', 'Filters', 'Piece', 180.00, 350.00, 5, 2),
  ('AIR-FILTER-01', 'Air Filter Sedan/Compact', 'Filters', 'Piece', 350.00, 550.00, 5, 2),
  ('AIR-FILTER-02', 'Air Filter SUV/MPV', 'Filters', 'Piece', 450.00, 750.00, 5, 2),
  ('CABIN-FILTER-01', 'Cabin Filter Standard', 'Filters', 'Piece', 300.00, 500.00, 5, 2),
  ('CABIN-FILTER-02', 'Cabin Filter Carbon/Activated', 'Filters', 'Piece', 450.00, 750.00, 5, 2),
  ('FUEL-FILTER-01', 'Fuel Filter Gasoline', 'Filters', 'Piece', 300.00, 600.00, 5, 2),
  ('FUEL-FILTER-02', 'Fuel Filter Diesel', 'Filters', 'Piece', 500.00, 1200.00, 5, 2),
  ('SPARK-PLUG-01', 'Spark Plug Standard Nickel', 'Electrical', 'Piece', 100.00, 180.00, 5, 2),
  ('SPARK-PLUG-02', 'Spark Plug Iridium', 'Electrical', 'Piece', 450.00, 900.00, 5, 2),
  ('GLOW-PLUG-01', 'Glow Plug Diesel', 'Electrical', 'Piece', 300.00, 700.00, 5, 2),
  ('BRAKE-PAD-01', 'Brake Pad Front Set', 'Brakes', 'Set', 700.00, 1800.00, 5, 2),
  ('BRAKE-PAD-02', 'Brake Pad Rear Set', 'Brakes', 'Set', 600.00, 1600.00, 5, 2),
  ('BRAKE-SHOE-01', 'Brake Shoe Rear Set', 'Brakes', 'Set', 700.00, 1800.00, 5, 2),
  ('BRAKE-DISC-ROTOR-01', 'Brake Disc/Rotor Front', 'Brakes', 'Piece', 1200.00, 3500.00, 5, 2),
  ('BRAKE-DRUM-01', 'Brake Drum Rear', 'Brakes', 'Piece', 1200.00, 3500.00, 5, 2),
  ('BRAKE-FLUID-01', 'Brake Fluid DOT 3 (Bottle)', 'Brakes', 'Bottle', 150.00, 300.00, 5, 2),
  ('BRAKE-FLUID-02', 'Brake Fluid DOT 4 (Bottle)', 'Brakes', 'Bottle', 200.00, 400.00, 5, 2),
  ('ATF-01', 'ATF Automatic Transmission Fluid (Liter)', 'Fluids', 'Liter', 300.00, 600.00, 5, 2),
  ('CVT-FLUID-01', 'CVT Fluid CVT Transmission Fluid (Liter)', 'Fluids', 'Liter', 450.00, 800.00, 5, 2),
  ('GEAR-OIL-01', 'Gear Oil 75W-90 (Liter)', 'Lubricants', 'Liter', 350.00, 650.00, 5, 2),
  ('GEAR-OIL-02', 'Gear Oil 80W-90 (Liter)', 'Lubricants', 'Liter', 250.00, 450.00, 5, 2),
  ('COOLANT-01', 'Coolant Premixed (Liter)', 'Fluids', 'Liter', 200.00, 400.00, 5, 2),
  ('COOLANT-02', 'Coolant Concentrate (Liter)', 'Fluids', 'Liter', 300.00, 600.00, 5, 2),
  ('POWER-STEERING-FLUID-01', 'Power Steering Fluid Universal (Bottle)', 'Fluids', 'Bottle', 250.00, 450.00, 5, 2),
  ('WIPER-BLADE-01', 'Wiper Blade 14-18 inch', 'Accessories', 'Piece', 150.00, 300.00, 5, 2),
  ('WIPER-BLADE-02', 'Wiper Blade 20-24 inch', 'Accessories', 'Piece', 200.00, 400.00, 5, 2),
  ('WIPER-BLADE-03', 'Wiper Blade 26 inch', 'Accessories', 'Piece', 250.00, 500.00, 5, 2),
  ('BATTERY-01', 'Battery NS40', 'Electrical', 'Piece', 3000.00, 4500.00, 5, 2),
  ('BATTERY-02', 'Battery NS60', 'Electrical', 'Piece', 3500.00, 5500.00, 5, 2),
  ('BATTERY-03', 'Battery DIN Type', 'Electrical', 'Piece', 4500.00, 8000.00, 5, 2),
  ('SERPENTINE-BELT-01', 'Serpentine Belt Standard', 'Engine Parts', 'Piece', 500.00, 1500.00, 5, 2),
  ('V-BELT-01', 'V-Belt Standard', 'Engine Parts', 'Piece', 200.00, 700.00, 5, 2),
  ('TIMING-BELT-01', 'Timing Belt Application Specific', 'Engine Parts', 'Piece', 1000.00, 3500.00, 5, 2),
  ('TIMING-BELT-KIT-01', 'Timing Belt Kit With Tensioner/Idler', 'Engine Parts', 'Kit', 2500.00, 7000.00, 5, 2),
  ('SHOCK-ABSORBER-01', 'Shock Absorber Front', 'Suspension', 'Piece', 1500.00, 4500.00, 5, 2),
  ('SHOCK-ABSORBER-02', 'Shock Absorber Rear', 'Suspension', 'Piece', 1200.00, 4000.00, 5, 2),
  ('BALL-JOINT-01', 'Ball Joint Lower/Upper', 'Suspension', 'Piece', 500.00, 1800.00, 5, 2),
  ('TIE-ROD-END-01', 'Tie Rod End Outer', 'Suspension', 'Piece', 400.00, 1500.00, 5, 2),
  ('RACK-END-01', 'Rack End Steering', 'Suspension', 'Piece', 500.00, 1800.00, 5, 2),
  ('WHEEL-BEARING-01', 'Wheel Bearing Front/Rear', 'Suspension', 'Piece', 500.00, 2500.00, 5, 2),
  ('WHEEL-HUB-01', 'Wheel Hub With Bearing', 'Suspension', 'Piece', 1500.00, 5000.00, 5, 2),
  ('CLUTCH-DISC-01', 'Clutch Disc Application Specific', 'Clutch', 'Piece', 1500.00, 5000.00, 5, 2),
  ('CLUTCH-PRESSURE-PLATE-01', 'Clutch Pressure Plate Application Specific', 'Clutch', 'Piece', 2000.00, 6000.00, 5, 2),
  ('RELEASE-BEARING-01', 'Release Bearing Application Specific', 'Clutch', 'Piece', 500.00, 1800.00, 5, 2),
  ('RADIATOR-01', 'Radiator Application Specific', 'Cooling System', 'Piece', 3000.00, 10000.00, 5, 2),
  ('WATER-PUMP-01', 'Water Pump Application Specific', 'Cooling System', 'Piece', 1000.00, 4000.00, 5, 2),
  ('THERMOSTAT-01', 'Thermostat Application Specific', 'Cooling System', 'Piece', 300.00, 1200.00, 5, 2),
  ('RADIATOR-HOSE-01', 'Radiator Hose Upper/Lower', 'Cooling System', 'Piece', 300.00, 1200.00, 5, 2),
  ('RADIATOR-CAP-01', 'Radiator Cap Standard', 'Cooling System', 'Piece', 100.00, 400.00, 5, 2),
  ('HEADLIGHT-BULB-01', 'Headlight Bulb Halogen', 'Electrical', 'Piece', 100.00, 400.00, 5, 2),
  ('LED-HEADLIGHT-BULB-01', 'LED Headlight Bulb Pair', 'Electrical', 'Pair', 500.00, 2000.00, 5, 2),
  ('FOG-LIGHT-01', 'Fog Light LED (Pair)', 'Electrical', 'Pair', 700.00, 3000.00, 5, 2),
  ('FUSE-01', 'Fuse Blade Assorted (Pack)', 'Electrical', 'Pack', 50.00, 250.00, 5, 2),
  ('RELAY-01', 'Relay Automotive', 'Electrical', 'Piece', 80.00, 300.00, 5, 2),
  ('BATTERY-TERMINAL-01', 'Battery Terminal Standard (Pair)', 'Electrical', 'Pair', 100.00, 400.00, 5, 2),
  ('IGNITION-COIL-01', 'Ignition Coil Application Specific', 'Electrical', 'Piece', 1000.00, 4000.00, 5, 2),
  ('SPARK-PLUG-WIRE-SET-01', 'Spark Plug Wire Set Application Specific', 'Electrical', 'Set', 800.00, 2500.00, 5, 2),
  ('AC-COMPRESSOR-01', 'AC Compressor Application Specific', 'Air Conditioning', 'Piece', 8000.00, 25000.00, 5, 2),
  ('AC-CONDENSER-01', 'AC Condenser Application Specific', 'Air Conditioning', 'Piece', 3000.00, 10000.00, 5, 2),
  ('AC-REFRIGERANT-01', 'AC Refrigerant R134a (Can)', 'Air Conditioning', 'Can', 250.00, 600.00, 5, 2),
  ('BRAKE-CLEANER-01', 'Brake Cleaner Aerosol (Can)', 'Brakes', 'Can', 150.00, 300.00, 5, 2),
  ('ENGINE-DEGREASER-01', 'Engine Degreaser Aerosol/Liquid (Bottle)', 'Chemicals & Additives', 'Bottle', 150.00, 350.00, 5, 2),
  ('INJECTOR-CLEANER-01', 'Injector Cleaner Fuel System (Bottle)', 'Chemicals & Additives', 'Bottle', 200.00, 500.00, 5, 2),
  ('ENGINE-FLUSH-01', 'Engine Flush Engine Treatment (Bottle)', 'Chemicals & Additives', 'Bottle', 150.00, 400.00, 5, 2),
  ('PENETRATING-OIL-01', 'Penetrating Oil Multi-purpose (Can)', 'Lubricants', 'Can', 150.00, 350.00, 5, 2),
  ('GREASE-01', 'Grease Multi-purpose (Tube)', 'Lubricants', 'Tube', 100.00, 300.00, 5, 2),
  ('CAR-SHAMPOO-01', 'Car Shampoo Standard (Bottle)', 'Car Care', 'Bottle', 150.00, 400.00, 5, 2),
  ('CAR-WAX-01', 'Car Wax Paste/Liquid (Bottle)', 'Car Care', 'Bottle', 200.00, 700.00, 5, 2),
  ('TIRE-DRESSING-01', 'Tire Dressing Liquid/Gel (Bottle)', 'Car Care', 'Bottle', 150.00, 400.00, 5, 2),
  ('GLASS-CLEANER-01', 'Glass Cleaner Automotive (Bottle)', 'Car Care', 'Bottle', 120.00, 300.00, 5, 2),
  ('MICROFIBER-CLOTH-01', 'Microfiber Cloth Automotive', 'Car Care', 'Piece', 50.00, 150.00, 5, 2),
  ('FLOOR-MAT-01', 'Floor Mat Universal (Set)', 'Accessories', 'Set', 500.00, 1500.00, 5, 2),
  ('SEAT-COVER-01', 'Seat Cover Universal (Set)', 'Accessories', 'Set', 800.00, 2500.00, 5, 2),
  ('PHONE-HOLDER-01', 'Phone Holder Dashboard/AC Mount', 'Accessories', 'Piece', 150.00, 600.00, 5, 2),
  ('USB-CAR-CHARGER-01', 'USB Car Charger 12V', 'Accessories', 'Piece', 150.00, 600.00, 5, 2),
  ('TIRE-PRESSURE-GAUGE-01', 'Tire Pressure Gauge Analog/Digital', 'Accessories', 'Piece', 200.00, 800.00, 5, 2),
  ('JUMPER-CABLE-01', 'Jumper Cable Standard (Set)', 'Accessories', 'Set', 300.00, 1200.00, 5, 2),
  ('FUNNEL-01', 'Funnel Automotive', 'Shop Supplies', 'Piece', 50.00, 200.00, 5, 2),
  ('OIL-DRAIN-PAN-01', 'Oil Drain Pan Workshop', 'Shop Supplies', 'Piece', 300.00, 1000.00, 5, 2),
  ('MECHANIC-GLOVES-01', 'Mechanic Gloves Disposable/Reusable (Pair)', 'Shop Supplies', 'Pair', 30.00, 200.00, 5, 2),
  ('SHOP-RAG-01', 'Shop Rag Cotton (Pack)', 'Shop Supplies', 'Pack', 100.00, 300.00, 5, 2),
  ('SANDPAPER-01', 'Sandpaper Assorted Grit (Pack)', 'Shop Supplies', 'Pack', 100.00, 300.00, 5, 2)
) as v(sku, name, category, unit, cost, retail, stock, reorder)
join public.categories c on c.name = v.category
on conflict (sku) do nothing;
