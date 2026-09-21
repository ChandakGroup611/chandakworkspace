-- ==============================================================================
-- Migration: Fleet Parts & Accessories Enhanced Dates, Warranty & Renewal Policies
-- Date: 2026-09-21
-- Module: VEHICLE_DESK (Fleet Management)
-- ==============================================================================

-- 1. Ensure vehicle_parts table exists with all date, warranty & renewal columns
CREATE TABLE IF NOT EXISTS public.vehicle_parts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL DEFAULT 'UNASSIGNED_STOCK',
  assigned_vehicle_reg VARCHAR(50),
  item_type VARCHAR(50) NOT NULL DEFAULT 'SPARE_PART',
  name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  purchase_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  unit_price NUMERIC(10, 2) DEFAULT 0.00,
  quantity INTEGER NOT NULL DEFAULT 1,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100),
  manufacturing_date DATE,
  expiry_date DATE,
  warranty_type VARCHAR(50) NOT NULL DEFAULT 'WARRANTY',
  warranty_months INTEGER NOT NULL DEFAULT 12,
  warranty_expiry_date DATE,
  warranty_terms TEXT,
  has_renewal_policy BOOLEAN NOT NULL DEFAULT FALSE,
  renewal_policy_type VARCHAR(100),
  renewal_date DATE,
  renewal_cost NUMERIC(10, 2) DEFAULT 0.00,
  renewal_vendor VARCHAR(255),
  renewal_policy_number VARCHAR(100),
  renewal_reminder_days INTEGER DEFAULT 30,
  status VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
  installation_date DATE,
  installed_odometer_km INTEGER,
  installed_by VARCHAR(150),
  condition VARCHAR(50) NOT NULL DEFAULT 'NEW',
  serial_number VARCHAR(100),
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add any columns that might be missing in case table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'assigned_vehicle_reg') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN assigned_vehicle_reg VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'has_renewal_policy') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN has_renewal_policy BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'renewal_policy_type') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN renewal_policy_type VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'renewal_date') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN renewal_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'renewal_cost') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN renewal_cost NUMERIC(10, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'renewal_vendor') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN renewal_vendor VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'renewal_policy_number') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN renewal_policy_number VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'renewal_reminder_days') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN renewal_reminder_days INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_parts' AND column_name = 'is_deleted') THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 3. Indexes for high-speed date and status filtering
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_vehicle_id ON public.vehicle_parts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_status ON public.vehicle_parts(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_item_type ON public.vehicle_parts(item_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_warranty_expiry ON public.vehicle_parts(warranty_expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_renewal_date ON public.vehicle_parts(renewal_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_expiry_date ON public.vehicle_parts(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_purchase_date ON public.vehicle_parts(purchase_date);

-- 4. Enable Row Level Security
ALTER TABLE public.vehicle_parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access vehicle_parts" ON public.vehicle_parts;
CREATE POLICY "Public access vehicle_parts" ON public.vehicle_parts 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. Seed realistic sample parts with comprehensive date lifecycles
INSERT INTO public.vehicle_parts (
  id,
  vehicle_id,
  assigned_vehicle_reg,
  item_type,
  name,
  part_number,
  category,
  brand,
  purchase_amount,
  unit_price,
  quantity,
  purchase_date,
  vendor_name,
  invoice_number,
  manufacturing_date,
  expiry_date,
  warranty_type,
  warranty_months,
  warranty_expiry_date,
  warranty_terms,
  has_renewal_policy,
  renewal_policy_type,
  renewal_date,
  renewal_cost,
  renewal_vendor,
  renewal_policy_number,
  renewal_reminder_days,
  status,
  installation_date,
  installed_odometer_km,
  installed_by,
  condition,
  serial_number,
  notes
) VALUES
-- 1. GPS Dashcam with Active Warranty & GPS SIM Renewal Due in 15 days
(
  'part-seed-01',
  'UNASSIGNED_STOCK',
  'MH02FE4281',
  'DASHCAM',
  'Qubo 4K Dual Dashcam with AI GPS Tracker',
  'DSH-QUBO-4K-AI',
  'Electronics & Telematics',
  'Qubo (Hero Electronix)',
  14500.00,
  14500.00,
  1,
  CURRENT_DATE - INTERVAL '350 days',
  'Amazon Corporate Fleet Solutions',
  'INV-AMZ-2025-8821',
  CURRENT_DATE - INTERVAL '400 days',
  NULL,
  'WARRANTY',
  24,
  CURRENT_DATE + INTERVAL '380 days',
  '24 Months Comprehensive Replacement Warranty',
  TRUE,
  'GPS_SIM_RECHARGE',
  CURRENT_DATE + INTERVAL '15 days',
  1200.00,
  'Airtel IoT Fleet M2M Services',
  'AIR-M2M-991204',
  30,
  'INSTALLED',
  CURRENT_DATE - INTERVAL '340 days',
  14200,
  'Sharma Auto Electricals',
  'NEW',
  'QB-4K-99882103',
  'Installed on executive Innova Crysta for passenger safety and speed audit'
),

-- 2. Heavy-Duty AGM Battery with Warranty Expiring Soon (in 20 days)
(
  'part-seed-02',
  'UNASSIGNED_STOCK',
  'HR26CQ9999',
  'BATTERY',
  'Exide Matrix Red 65Ah Maintenance-Free Battery',
  'BAT-EXD-MT65-RED',
  'Electrical',
  'Exide Industries',
  7800.00,
  7800.00,
  1,
  CURRENT_DATE - INTERVAL '710 days',
  'Metro Exide Authorized Distributor',
  'INV-EXD-4109',
  CURRENT_DATE - INTERVAL '750 days',
  NULL,
  'WARRANTY',
  24,
  CURRENT_DATE + INTERVAL '20 days',
  '24 Months Full Replacement + 24 Months Pro-Rata',
  FALSE,
  NULL,
  NULL,
  0.00,
  NULL,
  NULL,
  30,
  'INSTALLED',
  CURRENT_DATE - INTERVAL '700 days',
  38000,
  'Lakozy Toyota Workshop',
  'NEW',
  'EXD-MT65-881290',
  'High-crank battery with paperless warranty card'
),

-- 3. Synthetic Engine Oil (Consumable with Shelf Expiry in 350 days)
(
  'part-seed-03',
  'UNASSIGNED_STOCK',
  NULL,
  'CONSUMABLE',
  'Mobil 1 ESP 5W-30 Advanced Synthetic Oil (5L Can)',
  'LUB-MOB-5W30-5L',
  'Fluids & Lubricants',
  'Mobil',
  4200.00,
  4200.00,
  8,
  CURRENT_DATE - INTERVAL '60 days',
  'Castrol & Mobil Petroleum Depot',
  'INV-PET-7712',
  CURRENT_DATE - INTERVAL '180 days',
  CURRENT_DATE + INTERVAL '350 days',
  'NO_WARRANTY',
  0,
  NULL,
  'OEM Factory Sealed Shelf Warranty',
  FALSE,
  NULL,
  NULL,
  0.00,
  NULL,
  NULL,
  30,
  'IN_STOCK',
  NULL,
  NULL,
  NULL,
  'NEW',
  'MOB-5W30-BATCH-99',
  'Stored in temperature-controlled lubricants locker'
),

-- 4. Ceramic Brake Pads (Installed, Active Warranty)
(
  'part-seed-04',
  'UNASSIGNED_STOCK',
  'MH04JK5521',
  'SPARE_PART',
  'Bosch QuietCast Front Ceramic Brake Pad Set',
  'BRK-BSH-QC-FRT',
  'Braking',
  'Bosch Automotive',
  3450.00,
  3450.00,
  2,
  CURRENT_DATE - INTERVAL '90 days',
  'Bosch Car Service Central',
  'INV-BSH-0029',
  CURRENT_DATE - INTERVAL '150 days',
  NULL,
  'WARRANTY',
  12,
  CURRENT_DATE + INTERVAL '275 days',
  '12 Months or 20,000 km against manufacturing defects',
  FALSE,
  NULL,
  NULL,
  0.00,
  NULL,
  NULL,
  30,
  'INSTALLED',
  CURRENT_DATE - INTERVAL '85 days',
  21500,
  'Bosch Authorized Center',
  'NEW',
  'BSH-PAD-44102',
  'Low dust and rotor friendly ceramic compound'
),

-- 5. All-Terrain Radial Tyre (Active Warranty & Pro-Rata 5 Years)
(
  'part-seed-05',
  'UNASSIGNED_STOCK',
  'MH02FE4281',
  'TYRE',
  'Apollo Apterra AT2 215/65 R16 Tubeless Tyre',
  'TYR-APL-215-65R16',
  'Tyres & Wheels',
  'Apollo Tyres',
  6800.00,
  6800.00,
  4,
  CURRENT_DATE - INTERVAL '120 days',
  'Apollo Tyres Authorized Zone',
  'INV-APL-8831',
  CURRENT_DATE - INTERVAL '180 days',
  CURRENT_DATE + INTERVAL '1645 days',
  'WARRANTY',
  60,
  CURRENT_DATE + INTERVAL '1705 days',
  '5 Years Unconditional Warranty (One-time free replacement)',
  FALSE,
  NULL,
  NULL,
  0.00,
  NULL,
  NULL,
  30,
  'INSTALLED',
  CURRENT_DATE - INTERVAL '115 days',
  18000,
  'Speedy Wheel Alignment & Tyres',
  'NEW',
  'DOT-APL-2025-0911',
  'Installed all 4 tyres with nitrogen inflation and high-speed balancing'
),

-- 6. GPS Tracker with Renewal Overdue (Expired 5 days ago)
(
  'part-seed-06',
  'UNASSIGNED_STOCK',
  'DL10CA1100',
  'GPS_DEVICE',
  'MapmyIndia RoadPulse AIS-140 GPS Device with Panic Button',
  'GPS-MMI-AIS140',
  'Electronics & Telematics',
  'MapmyIndia',
  9500.00,
  9500.00,
  1,
  CURRENT_DATE - INTERVAL '370 days',
  'MapmyIndia Enterprise Solutions',
  'INV-MMI-1094',
  CURRENT_DATE - INTERVAL '420 days',
  NULL,
  'WARRANTY',
  12,
  CURRENT_DATE - INTERVAL '5 days',
  '12 Months OEM Hardware Warranty (Expired)',
  TRUE,
  'ANNUAL_AMC',
  CURRENT_DATE - INTERVAL '5 days',
  1800.00,
  'MapmyIndia Cloud Subscription',
  'MMI-AMC-2025-01',
  30,
  'INSTALLED',
  CURRENT_DATE - INTERVAL '365 days',
  32000,
  'Fleet Logistics Workshop',
  'NEW',
  'MMI-AIS-882194',
  'Statutory government AIS-140 certificate renewal required immediately'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  has_renewal_policy = EXCLUDED.has_renewal_policy,
  renewal_policy_type = EXCLUDED.renewal_policy_type,
  renewal_date = EXCLUDED.renewal_date,
  renewal_cost = EXCLUDED.renewal_cost,
  renewal_vendor = EXCLUDED.renewal_vendor,
  renewal_policy_number = EXCLUDED.renewal_policy_number,
  renewal_reminder_days = EXCLUDED.renewal_reminder_days,
  manufacturing_date = EXCLUDED.manufacturing_date,
  expiry_date = EXCLUDED.expiry_date,
  warranty_expiry_date = EXCLUDED.warranty_expiry_date,
  purchase_date = EXCLUDED.purchase_date,
  installation_date = EXCLUDED.installation_date,
  assigned_vehicle_reg = EXCLUDED.assigned_vehicle_reg,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;
