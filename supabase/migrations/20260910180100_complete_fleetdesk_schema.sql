-- ==============================================================================
-- FleetDesk Enterprise Complete Production Database Schema
-- Target: Supabase / PostgreSQL 15+
-- Includes: All 35 FleetDesk domains (Vehicles, Compliance, Maintenance,
--           Job Cards, Parts, Travelers, Drivers, Trips, Sales, EMI, Documents)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. Custom Types & Enums
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE vehicle_category AS ENUM ('CAR', 'BIKE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_status AS ENUM (
    'IN_STOCK', 'RESERVED', 'SOLD', 'DELIVERED', 'IN_SERVICE', 'RESOLD', 'SCRAPPED', 'REPOSSESSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ownership_type AS ENUM ('PERSONAL', 'DEALERSHIP_STOCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE challan_status AS ENUM ('PENDING', 'PAID', 'DISPUTED', 'RESOLVED', 'WAIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hypothecation_status AS ENUM ('NONE', 'ACTIVE', 'RELEASE_PENDING', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 2. Core Entities
-- ==============================================================================

-- Dealers / Showrooms / Depots
CREATE TABLE IF NOT EXISTS public.dealers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  gstin VARCHAR(15),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  id_proof_type VARCHAR(50),
  id_proof_number VARCHAR(100),
  is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles (Fleet Master)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category VARCHAR(20) NOT NULL DEFAULT 'CAR',
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  variant VARCHAR(100) NOT NULL DEFAULT 'Standard',
  vin_chassis_number VARCHAR(100) UNIQUE NOT NULL,
  engine_number VARCHAR(100),
  registration_number VARCHAR(20) UNIQUE NOT NULL,
  registration_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
  odometer_km INTEGER NOT NULL DEFAULT 0,
  purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_landed_cost NUMERIC(12, 2) DEFAULT 0.00,
  sale_price NUMERIC(12, 2),
  paint_color VARCHAR(50) DEFAULT '#1e293b',
  image_url TEXT,
  owner_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  dealer_id TEXT,
  ownership_type VARCHAR(50) NOT NULL DEFAULT 'DEALERSHIP_STOCK',
  nickname VARCHAR(100),
  has_roadside_assistance BOOLEAN DEFAULT TRUE,
  has_hsrp_plate BOOLEAN DEFAULT TRUE,
  rto_rmn VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Status History
CREATE TABLE IF NOT EXISTS public.vehicle_status_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(100) DEFAULT 'System Admin',
  reason TEXT
);

-- Vehicle Ownership History
CREATE TABLE IF NOT EXISTS public.vehicle_ownership_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE RESTRICT,
  owner_serial_number INTEGER NOT NULL DEFAULT 1,
  from_date DATE NOT NULL,
  to_date DATE,
  sale_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. Compliance & Registration
-- ==============================================================================

-- Registrations (RC)
CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE UNIQUE,
  registration_number VARCHAR(20) NOT NULL,
  rto_office VARCHAR(150),
  registration_valid_upto DATE NOT NULL,
  registration_date DATE,
  owner_serial_number INTEGER NOT NULL DEFAULT 1,
  hypothecated_to VARCHAR(255),
  rto_rmn VARCHAR(50),
  has_hsrp_plate BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insurance Policies
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  insurer_name VARCHAR(150) NOT NULL,
  policy_number VARCHAR(100) NOT NULL,
  policy_type VARCHAR(100) NOT NULL,
  idv NUMERIC(12, 2) DEFAULT 0.00,
  premium_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  has_roadside_assistance BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PUC Certificates
CREATE TABLE IF NOT EXISTS public.puc_certificates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  certificate_number VARCHAR(100) NOT NULL,
  valid_from DATE NOT NULL,
  valid_upto DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Road Tax Payments
CREATE TABLE IF NOT EXISTS public.road_tax_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  receipt_number VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  paid_on DATE NOT NULL,
  valid_upto DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Traffic Challans
CREATE TABLE IF NOT EXISTS public.challans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  challan_number VARCHAR(100) NOT NULL,
  offense TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  challan_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Documents Vault
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size VARCHAR(50),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'VALID',
  document_number VARCHAR(100),
  file_url TEXT
);

-- ==============================================================================
-- 4. Drivers, Travelers & Trip Dispatch
-- ==============================================================================

-- Drivers Master
CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  license_expiry_date DATE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  aadhaar_number VARCHAR(50),
  emergency_contact VARCHAR(100),
  experience_years INTEGER DEFAULT 5,
  assigned_vehicle_id TEXT,
  address TEXT,
  blood_group VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Travelers / Passengers Manifest
CREATE TABLE IF NOT EXISTS public.travelers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
  employee_id VARCHAR(50),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  department VARCHAR(100),
  designation VARCHAR(100),
  id_proof_type VARCHAR(50),
  id_proof_number VARCHAR(100),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(50),
  default_pickup_location TEXT,
  default_drop_location TEXT,
  special_preferences TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Driver Assignments
CREATE TABLE IF NOT EXISTS public.vehicle_driver_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES public.drivers(id) ON DELETE CASCADE,
  assigned_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_to TIMESTAMP WITH TIME ZONE,
  assignment_type VARCHAR(100) NOT NULL DEFAULT 'PERSONAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trip Plans
CREATE TABLE IF NOT EXISTS public.trip_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES public.drivers(id) ON DELETE RESTRICT,
  passenger_id TEXT,
  traveler_name VARCHAR(255),
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose VARCHAR(255) NOT NULL,
  planned_start_time VARCHAR(20) NOT NULL,
  planned_end_time VARCHAR(20) NOT NULL,
  origin VARCHAR(255),
  destination VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
  preferred_route_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trip Logs (Telemetry & Completed Trips)
CREATE TABLE IF NOT EXISTS public.trip_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  trip_plan_id TEXT,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES public.drivers(id) ON DELETE RESTRICT,
  passenger_id TEXT,
  date DATE DEFAULT CURRENT_DATE,
  actual_start_time VARCHAR(20) NOT NULL,
  actual_end_time VARCHAR(20),
  start_odometer_km INTEGER NOT NULL,
  end_odometer_km INTEGER,
  distance_km NUMERIC(8, 2),
  source VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  traveler_name VARCHAR(255),
  start_fuel_level NUMERIC(5, 2),
  end_fuel_level NUMERIC(5, 2),
  route_origin VARCHAR(255),
  route_destination VARCHAR(255),
  purpose VARCHAR(255),
  parking_location VARCHAR(255),
  parking_block_section_floor VARCHAR(150),
  key_handed_over_to_guard BOOLEAN NOT NULL DEFAULT FALSE,
  gps_trace JSONB,
  google_maps_url TEXT,
  preferred_route_id VARCHAR(100),
  toll_expenses NUMERIC(10, 2) DEFAULT 0.00,
  fuel_expenses NUMERIC(10, 2) DEFAULT 0.00,
  parking_expenses NUMERIC(10, 2) DEFAULT 0.00,
  other_expenses NUMERIC(10, 2) DEFAULT 0.00,
  expense_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fuel Logs
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  filled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  odometer_km INTEGER NOT NULL,
  liters NUMERIC(8, 2) NOT NULL,
  cost NUMERIC(10, 2) NOT NULL,
  calculated_kmpl NUMERIC(6, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Preferred Routes Master
CREATE TABLE IF NOT EXISTS public.preferred_routes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  estimated_distance_km NUMERIC(8, 2),
  estimated_duration_mins INTEGER,
  waypoints JSONB,
  google_maps_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. Maintenance & Workshop Suite v2.0
-- ==============================================================================

-- Service Records (Completed)
CREATE TABLE IF NOT EXISTS public.service_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_type VARCHAR(100) NOT NULL,
  service_center VARCHAR(255) NOT NULL,
  service_date DATE NOT NULL,
  odometer_km INTEGER NOT NULL,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  parts_replaced JSONB,
  next_service_due_date DATE,
  next_service_due_odometer INTEGER,
  technician_name VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Schedules (Planned)
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  scheduled_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workshop Technicians
CREATE TABLE IF NOT EXISTS public.technicians (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255) NOT NULL,
  skill_level VARCHAR(50) NOT NULL DEFAULT 'SENIOR',
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  active_jobs_count INTEGER NOT NULL DEFAULT 0,
  efficiency_rating NUMERIC(3, 2) NOT NULL DEFAULT 4.50,
  status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workshop Service Bays
CREATE TABLE IF NOT EXISTS public.workshop_bays (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bay_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'TWO_POST_LIFT',
  status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  current_vehicle_id TEXT,
  current_job_card_id TEXT,
  assigned_technician_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job Cards
CREATE TABLE IF NOT EXISTS public.job_cards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_card_number VARCHAR(100) NOT NULL UNIQUE,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  title VARCHAR(255) NOT NULL,
  scheduled_date DATE NOT NULL,
  start_date DATE,
  completed_date DATE,
  assigned_technician_id TEXT,
  assigned_technician_name VARCHAR(255) NOT NULL,
  bay_number VARCHAR(50) NOT NULL,
  odometer_at_service INTEGER NOT NULL DEFAULT 0,
  tasks JSONB DEFAULT '[]'::jsonb,
  parts_allocated JSONB DEFAULT '[]'::jsonb,
  labor_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  parts_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  customer_approval BOOLEAN NOT NULL DEFAULT TRUE,
  qc_passed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inspection Checklists
CREATE TABLE IF NOT EXISTS public.inspection_checklists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inspection_number VARCHAR(100) NOT NULL UNIQUE,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspected_by VARCHAR(255) NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  odometer_km INTEGER NOT NULL DEFAULT 0,
  overall_score INTEGER NOT NULL DEFAULT 100,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  failed_items_count INTEGER NOT NULL DEFAULT 0,
  attention_items_count INTEGER NOT NULL DEFAULT 0,
  converted_to_job_card_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Preventive Service Intervals
CREATE TABLE IF NOT EXISTS public.preventive_intervals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  model VARCHAR(100) NOT NULL,
  interval_km INTEGER NOT NULL,
  interval_months INTEGER NOT NULL,
  service_title VARCHAR(255) NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  recommended_tasks JSONB DEFAULT '[]'::jsonb,
  recommended_parts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. Parts & Inventory Automation Suite
-- ==============================================================================

-- Vehicle Parts & Accessories Master
CREATE TABLE IF NOT EXISTS public.vehicle_parts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT NOT NULL DEFAULT 'UNASSIGNED_STOCK',
  item_type VARCHAR(50) NOT NULL DEFAULT 'SPARE_PART',
  name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  purchase_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  purchase_date DATE NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100),
  manufacturing_date DATE,
  expiry_date DATE,
  warranty_type VARCHAR(50) NOT NULL DEFAULT 'WARRANTY',
  warranty_months INTEGER NOT NULL DEFAULT 12,
  warranty_expiry_date DATE,
  warranty_terms TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
  installation_date DATE,
  installed_odometer_km INTEGER,
  installed_by VARCHAR(150),
  condition VARCHAR(50) NOT NULL DEFAULT 'NEW',
  serial_number VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Part Suppliers
CREATE TABLE IF NOT EXISTS public.part_suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  categories_supplied JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC(3, 2) DEFAULT 4.5,
  lead_time_days INTEGER DEFAULT 3,
  payment_terms VARCHAR(100),
  gstin VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders (PO)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_number VARCHAR(100) NOT NULL UNIQUE,
  supplier_id TEXT REFERENCES public.part_suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255) NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation Rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_condition TEXT,
  auto_action TEXT,
  last_triggered TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  threshold_value NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation Logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rule_code VARCHAR(100) NOT NULL,
  rule_title VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  target_entity VARCHAR(255),
  vehicle_plate VARCHAR(50),
  action_taken TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
  details TEXT
);

-- ==============================================================================
-- 7. Sales, Financing & Margin Engine
-- ==============================================================================

-- Vehicle Purchases (Stock Intake Accounting)
CREATE TABLE IF NOT EXISTS public.vehicle_purchases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE UNIQUE,
  supplier_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  transport_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  registration_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  insurance_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  accessory_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  preparation_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  reconditioning_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  other_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_landed_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Sales
CREATE TABLE IF NOT EXISTS public.vehicle_sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE UNIQUE,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE RESTRICT,
  sale_date DATE NOT NULL,
  sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  processing_fee NUMERIC(12, 2) DEFAULT 0.00,
  financed BOOLEAN NOT NULL DEFAULT FALSE,
  financier_name VARCHAR(255),
  loan_amount NUMERIC(12, 2) DEFAULT 0.00,
  loan_tenure_months INTEGER,
  annual_interest_rate NUMERIC(5, 2),
  is_resale BOOLEAN NOT NULL DEFAULT FALSE,
  override_compliance_check BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loan Installments (EMI Repayment Schedule)
CREATE TABLE IF NOT EXISTS public.loan_installments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_sale_id TEXT REFERENCES public.vehicle_sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  interest_component NUMERIC(12, 2) DEFAULT 0.00,
  principal_component NUMERIC(12, 2) DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'UPCOMING',
  paid_date DATE,
  paid_amount NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Market Resale Estimates
CREATE TABLE IF NOT EXISTS public.vehicle_market_estimates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  estimated_value NUMERIC(12, 2) NOT NULL,
  estimated_on DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 8. Permissive RLS Policies for Web Anon Access
-- ==============================================================================

-- Enable Row-Level Security on all tables
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puc_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_tax_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferred_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventive_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_market_estimates ENABLE ROW LEVEL SECURITY;

-- Grant Full CRUD Access to anon and authenticated roles
-- (Allows the FleetDesk SPA using the anon public key to read/write seamlessly)
DROP POLICY IF EXISTS "Public full access dealers" ON public.dealers;
CREATE POLICY "Public full access dealers" ON public.dealers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access customers" ON public.customers;
CREATE POLICY "Public full access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicles" ON public.vehicles;
CREATE POLICY "Public full access vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_status_history" ON public.vehicle_status_history;
CREATE POLICY "Public full access vehicle_status_history" ON public.vehicle_status_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_ownership_history" ON public.vehicle_ownership_history;
CREATE POLICY "Public full access vehicle_ownership_history" ON public.vehicle_ownership_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access registrations" ON public.registrations;
CREATE POLICY "Public full access registrations" ON public.registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access insurance_policies" ON public.insurance_policies;
CREATE POLICY "Public full access insurance_policies" ON public.insurance_policies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access puc_certificates" ON public.puc_certificates;
CREATE POLICY "Public full access puc_certificates" ON public.puc_certificates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access road_tax_payments" ON public.road_tax_payments;
CREATE POLICY "Public full access road_tax_payments" ON public.road_tax_payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access challans" ON public.challans;
CREATE POLICY "Public full access challans" ON public.challans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "Public full access vehicle_documents" ON public.vehicle_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access drivers" ON public.drivers;
CREATE POLICY "Public full access drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access travelers" ON public.travelers;
CREATE POLICY "Public full access travelers" ON public.travelers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_driver_assignments" ON public.vehicle_driver_assignments;
CREATE POLICY "Public full access vehicle_driver_assignments" ON public.vehicle_driver_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access trip_plans" ON public.trip_plans;
CREATE POLICY "Public full access trip_plans" ON public.trip_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access trip_logs" ON public.trip_logs;
CREATE POLICY "Public full access trip_logs" ON public.trip_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access fuel_logs" ON public.fuel_logs;
CREATE POLICY "Public full access fuel_logs" ON public.fuel_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access preferred_routes" ON public.preferred_routes;
CREATE POLICY "Public full access preferred_routes" ON public.preferred_routes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access service_records" ON public.service_records;
CREATE POLICY "Public full access service_records" ON public.service_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access maintenance_schedules" ON public.maintenance_schedules;
CREATE POLICY "Public full access maintenance_schedules" ON public.maintenance_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access technicians" ON public.technicians;
CREATE POLICY "Public full access technicians" ON public.technicians FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access workshop_bays" ON public.workshop_bays;
CREATE POLICY "Public full access workshop_bays" ON public.workshop_bays FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access job_cards" ON public.job_cards;
CREATE POLICY "Public full access job_cards" ON public.job_cards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access inspection_checklists" ON public.inspection_checklists;
CREATE POLICY "Public full access inspection_checklists" ON public.inspection_checklists FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access preventive_intervals" ON public.preventive_intervals;
CREATE POLICY "Public full access preventive_intervals" ON public.preventive_intervals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_parts" ON public.vehicle_parts;
CREATE POLICY "Public full access vehicle_parts" ON public.vehicle_parts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access part_suppliers" ON public.part_suppliers;
CREATE POLICY "Public full access part_suppliers" ON public.part_suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access purchase_orders" ON public.purchase_orders;
CREATE POLICY "Public full access purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access automation_rules" ON public.automation_rules;
CREATE POLICY "Public full access automation_rules" ON public.automation_rules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access automation_logs" ON public.automation_logs;
CREATE POLICY "Public full access automation_logs" ON public.automation_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_purchases" ON public.vehicle_purchases;
CREATE POLICY "Public full access vehicle_purchases" ON public.vehicle_purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_sales" ON public.vehicle_sales;
CREATE POLICY "Public full access vehicle_sales" ON public.vehicle_sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access loan_installments" ON public.loan_installments;
CREATE POLICY "Public full access loan_installments" ON public.loan_installments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access vehicle_market_estimates" ON public.vehicle_market_estimates;
CREATE POLICY "Public full access vehicle_market_estimates" ON public.vehicle_market_estimates FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 9. Supabase Realtime Publication
-- ==============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.job_cards;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_plans;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_parts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_records;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
