-- ==============================================================================
-- Migration: Unrestrict Character Lengths on All Vehicle Module Tables (NVARCHAR / TEXT)
-- Date: 2026-09-28
-- Module: Fleet Management (VEHICLE_DESK) & All Vehicle Domains
-- Description: Converts all bounded VARCHAR column types (VARCHAR(100), VARCHAR(50),
--              VARCHAR(150), VARCHAR(255), etc.) across all vehicle tables to TEXT
--              (PostgreSQL's unrestricted string type, equivalent to NVARCHAR(MAX) / no limit)
--              so that descriptions, notes, scopes, and specifications have no character length restrictions.
-- ==============================================================================

-- 1. Vehicles (Fleet Master) Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicles') THEN
    ALTER TABLE public.vehicles
      ALTER COLUMN make TYPE TEXT,
      ALTER COLUMN model TYPE TEXT,
      ALTER COLUMN variant TYPE TEXT,
      ALTER COLUMN vin_chassis_number TYPE TEXT,
      ALTER COLUMN engine_number TYPE TEXT,
      ALTER COLUMN registration_number TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN category TYPE TEXT,
      ALTER COLUMN paint_color TYPE TEXT,
      ALTER COLUMN ownership_type TYPE TEXT,
      ALTER COLUMN nickname TYPE TEXT,
      ALTER COLUMN rto_rmn TYPE TEXT;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'insurance_policy_number') THEN
      ALTER TABLE public.vehicles ALTER COLUMN insurance_policy_number TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'insurance_company') THEN
      ALTER TABLE public.vehicles ALTER COLUMN insurance_company TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'insurance_vendor') THEN
      ALTER TABLE public.vehicles ALTER COLUMN insurance_vendor TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'puc_certificate_number') THEN
      ALTER TABLE public.vehicles ALTER COLUMN puc_certificate_number TYPE TEXT;
    END IF;

    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS notes TEXT;
  END IF;
END $$;

-- 2. Service Records Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_records') THEN
    ALTER TABLE public.service_records
      ALTER COLUMN service_type TYPE TEXT,
      ALTER COLUMN service_center TYPE TEXT;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'service_records' AND column_name = 'technician_name') THEN
      ALTER TABLE public.service_records ALTER COLUMN technician_name TYPE TEXT;
    END IF;
  END IF;
END $$;

-- 3. Maintenance Schedules Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_schedules') THEN
    ALTER TABLE public.maintenance_schedules
      ALTER COLUMN title TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN notes TYPE TEXT;
  END IF;
END $$;

-- 4. Vehicle Parts & Accessories Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_parts') THEN
    ALTER TABLE public.vehicle_parts
      ALTER COLUMN item_type TYPE TEXT,
      ALTER COLUMN name TYPE TEXT,
      ALTER COLUMN part_number TYPE TEXT,
      ALTER COLUMN category TYPE TEXT,
      ALTER COLUMN brand TYPE TEXT,
      ALTER COLUMN vendor_name TYPE TEXT,
      ALTER COLUMN invoice_number TYPE TEXT,
      ALTER COLUMN warranty_type TYPE TEXT,
      ALTER COLUMN warranty_terms TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN installed_by TYPE TEXT,
      ALTER COLUMN condition TYPE TEXT,
      ALTER COLUMN serial_number TYPE TEXT,
      ALTER COLUMN notes TYPE TEXT;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_parts' AND column_name = 'renewal_policy_type') THEN
      ALTER TABLE public.vehicle_parts ALTER COLUMN renewal_policy_type TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_parts' AND column_name = 'renewal_policy_number') THEN
      ALTER TABLE public.vehicle_parts ALTER COLUMN renewal_policy_number TYPE TEXT;
    END IF;
  END IF;
END $$;

-- 5. Part Suppliers Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'part_suppliers') THEN
    ALTER TABLE public.part_suppliers
      ALTER COLUMN name TYPE TEXT,
      ALTER COLUMN contact_person TYPE TEXT,
      ALTER COLUMN phone TYPE TEXT,
      ALTER COLUMN email TYPE TEXT,
      ALTER COLUMN payment_terms TYPE TEXT,
      ALTER COLUMN gstin TYPE TEXT,
      ALTER COLUMN address TYPE TEXT;
  END IF;
END $$;

-- 6. Purchase Orders Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    ALTER TABLE public.purchase_orders
      ALTER COLUMN po_number TYPE TEXT,
      ALTER COLUMN supplier_name TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN notes TYPE TEXT;
  END IF;
END $$;

-- 7. Insurance Policies Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insurance_policies') THEN
    ALTER TABLE public.insurance_policies
      ALTER COLUMN insurer_name TYPE TEXT,
      ALTER COLUMN policy_number TYPE TEXT,
      ALTER COLUMN policy_type TYPE TEXT;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insurance_policies' AND column_name = 'receipt_number') THEN
      ALTER TABLE public.insurance_policies ALTER COLUMN receipt_number TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insurance_policies' AND column_name = 'renewed_by') THEN
      ALTER TABLE public.insurance_policies ALTER COLUMN renewed_by TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insurance_policies' AND column_name = 'notes') THEN
      ALTER TABLE public.insurance_policies ALTER COLUMN notes TYPE TEXT;
    END IF;
  END IF;
END $$;

-- 8. PUC Certificates Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'puc_certificates') THEN
    ALTER TABLE public.puc_certificates
      ALTER COLUMN certificate_number TYPE TEXT;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'puc_certificates' AND column_name = 'testing_center_name') THEN
      ALTER TABLE public.puc_certificates ALTER COLUMN testing_center_name TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'puc_certificates' AND column_name = 'testing_center_code') THEN
      ALTER TABLE public.puc_certificates ALTER COLUMN testing_center_code TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'puc_certificates' AND column_name = 'receipt_number') THEN
      ALTER TABLE public.puc_certificates ALTER COLUMN receipt_number TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'puc_certificates' AND column_name = 'emission_norm') THEN
      ALTER TABLE public.puc_certificates ALTER COLUMN emission_norm TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'puc_certificates' AND column_name = 'test_result') THEN
      ALTER TABLE public.puc_certificates ALTER COLUMN test_result TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'puc_certificates' AND column_name = 'renewed_by') THEN
      ALTER TABLE public.puc_certificates ALTER COLUMN renewed_by TYPE TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'puc_certificates' AND column_name = 'notes') THEN
      ALTER TABLE public.puc_certificates ALTER COLUMN notes TYPE TEXT;
    END IF;
  END IF;
END $$;

-- 9. Road Tax Payments Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'road_tax_payments') THEN
    ALTER TABLE public.road_tax_payments ALTER COLUMN receipt_number TYPE TEXT;
  END IF;
END $$;

-- 10. Challans Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'challans') THEN
    ALTER TABLE public.challans
      ALTER COLUMN challan_number TYPE TEXT,
      ALTER COLUMN offense TYPE TEXT,
      ALTER COLUMN status TYPE TEXT;
  END IF;
END $$;

-- 11. Vehicle Documents Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_documents') THEN
    ALTER TABLE public.vehicle_documents
      ALTER COLUMN doc_type TYPE TEXT,
      ALTER COLUMN title TYPE TEXT,
      ALTER COLUMN file_name TYPE TEXT,
      ALTER COLUMN file_size TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN document_number TYPE TEXT;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_documents' AND column_name = 'file_type') THEN
      ALTER TABLE public.vehicle_documents ALTER COLUMN file_type TYPE TEXT;
    END IF;

    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS notes TEXT;
  END IF;
END $$;

-- 12. Drivers Master Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drivers') THEN
    ALTER TABLE public.drivers
      ALTER COLUMN full_name TYPE TEXT,
      ALTER COLUMN license_number TYPE TEXT,
      ALTER COLUMN phone TYPE TEXT,
      ALTER COLUMN aadhaar_number TYPE TEXT,
      ALTER COLUMN emergency_contact TYPE TEXT,
      ALTER COLUMN assigned_vehicle_id TYPE TEXT,
      ALTER COLUMN address TYPE TEXT,
      ALTER COLUMN blood_group TYPE TEXT,
      ALTER COLUMN notes TYPE TEXT;
  END IF;
END $$;

-- 13. Travelers / Passenger Manifest Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travelers') THEN
    ALTER TABLE public.travelers
      ALTER COLUMN full_name TYPE TEXT,
      ALTER COLUMN category TYPE TEXT,
      ALTER COLUMN employee_id TYPE TEXT,
      ALTER COLUMN phone TYPE TEXT,
      ALTER COLUMN email TYPE TEXT,
      ALTER COLUMN department TYPE TEXT,
      ALTER COLUMN designation TYPE TEXT,
      ALTER COLUMN id_proof_type TYPE TEXT,
      ALTER COLUMN id_proof_number TYPE TEXT,
      ALTER COLUMN emergency_contact_name TYPE TEXT,
      ALTER COLUMN emergency_contact_phone TYPE TEXT,
      ALTER COLUMN default_pickup_location TYPE TEXT,
      ALTER COLUMN default_drop_location TYPE TEXT,
      ALTER COLUMN special_preferences TYPE TEXT;
  END IF;
END $$;

-- 14. Vehicle Driver Assignments Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_driver_assignments') THEN
    ALTER TABLE public.vehicle_driver_assignments ALTER COLUMN assignment_type TYPE TEXT;
  END IF;
END $$;

-- 15. Trip Plans Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trip_plans') THEN
    ALTER TABLE public.trip_plans
      ALTER COLUMN traveler_name TYPE TEXT,
      ALTER COLUMN purpose TYPE TEXT,
      ALTER COLUMN planned_start_time TYPE TEXT,
      ALTER COLUMN planned_end_time TYPE TEXT,
      ALTER COLUMN origin TYPE TEXT,
      ALTER COLUMN destination TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN preferred_route_id TYPE TEXT;
  END IF;
END $$;

-- 16. Trip Logs Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trip_logs') THEN
    ALTER TABLE public.trip_logs
      ALTER COLUMN actual_start_time TYPE TEXT,
      ALTER COLUMN actual_end_time TYPE TEXT,
      ALTER COLUMN source TYPE TEXT,
      ALTER COLUMN traveler_name TYPE TEXT,
      ALTER COLUMN route_origin TYPE TEXT,
      ALTER COLUMN route_destination TYPE TEXT,
      ALTER COLUMN purpose TYPE TEXT,
      ALTER COLUMN parking_location TYPE TEXT,
      ALTER COLUMN parking_block_section_floor TYPE TEXT,
      ALTER COLUMN preferred_route_id TYPE TEXT,
      ALTER COLUMN expense_notes TYPE TEXT;
  END IF;
END $$;

-- 17. Preferred Routes Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preferred_routes') THEN
    ALTER TABLE public.preferred_routes
      ALTER COLUMN name TYPE TEXT,
      ALTER COLUMN origin TYPE TEXT,
      ALTER COLUMN destination TYPE TEXT;
  END IF;
END $$;

-- 18. Technicians Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'technicians') THEN
    ALTER TABLE public.technicians
      ALTER COLUMN name TYPE TEXT,
      ALTER COLUMN specialization TYPE TEXT,
      ALTER COLUMN skill_level TYPE TEXT,
      ALTER COLUMN phone TYPE TEXT,
      ALTER COLUMN email TYPE TEXT,
      ALTER COLUMN status TYPE TEXT;
  END IF;
END $$;

-- 19. Workshop Bays Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workshop_bays') THEN
    ALTER TABLE public.workshop_bays
      ALTER COLUMN bay_code TYPE TEXT,
      ALTER COLUMN name TYPE TEXT,
      ALTER COLUMN type TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN assigned_technician_name TYPE TEXT;
  END IF;
END $$;

-- 20. Job Cards Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_cards') THEN
    ALTER TABLE public.job_cards
      ALTER COLUMN job_card_number TYPE TEXT,
      ALTER COLUMN service_type TYPE TEXT,
      ALTER COLUMN priority TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN title TYPE TEXT,
      ALTER COLUMN assigned_technician_name TYPE TEXT,
      ALTER COLUMN bay_number TYPE TEXT,
      ALTER COLUMN created_by_type TYPE TEXT,
      ALTER COLUMN notes TYPE TEXT;
  END IF;
END $$;

-- 21. Inspection Checklists Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspection_checklists') THEN
    ALTER TABLE public.inspection_checklists
      ALTER COLUMN inspection_number TYPE TEXT,
      ALTER COLUMN inspected_by TYPE TEXT,
      ALTER COLUMN notes TYPE TEXT;
  END IF;
END $$;

-- 22. Preventive Intervals Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'preventive_intervals') THEN
    ALTER TABLE public.preventive_intervals
      ALTER COLUMN model TYPE TEXT,
      ALTER COLUMN service_title TYPE TEXT,
      ALTER COLUMN service_type TYPE TEXT;
  END IF;
END $$;

-- 23. Automation Rules & Logs Tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_rules') THEN
    ALTER TABLE public.automation_rules
      ALTER COLUMN code TYPE TEXT,
      ALTER COLUMN title TYPE TEXT,
      ALTER COLUMN category TYPE TEXT,
      ALTER COLUMN description TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_logs') THEN
    ALTER TABLE public.automation_logs
      ALTER COLUMN rule_code TYPE TEXT,
      ALTER COLUMN rule_title TYPE TEXT,
      ALTER COLUMN target_entity TYPE TEXT,
      ALTER COLUMN vehicle_plate TYPE TEXT,
      ALTER COLUMN action_taken TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN details TYPE TEXT;
  END IF;
END $$;

-- 24. Vehicle Purchases, Sales, Estimates & Loans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_purchases') THEN
    ALTER TABLE public.vehicle_purchases
      ALTER COLUMN supplier_name TYPE TEXT,
      ALTER COLUMN invoice_number TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_sales') THEN
    ALTER TABLE public.vehicle_sales
      ALTER COLUMN financier_name TYPE TEXT,
      ALTER COLUMN override_reason TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loan_installments') THEN
    ALTER TABLE public.loan_installments ALTER COLUMN status TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_market_estimates') THEN
    ALTER TABLE public.vehicle_market_estimates ALTER COLUMN source TYPE TEXT;
  END IF;
END $$;

-- 25. Dealers & Customers Tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dealers') THEN
    ALTER TABLE public.dealers
      ALTER COLUMN name TYPE TEXT,
      ALTER COLUMN code TYPE TEXT,
      ALTER COLUMN city TYPE TEXT,
      ALTER COLUMN state TYPE TEXT,
      ALTER COLUMN gstin TYPE TEXT,
      ALTER COLUMN address TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    ALTER TABLE public.customers
      ALTER COLUMN full_name TYPE TEXT,
      ALTER COLUMN phone TYPE TEXT,
      ALTER COLUMN email TYPE TEXT,
      ALTER COLUMN id_proof_type TYPE TEXT,
      ALTER COLUMN id_proof_number TYPE TEXT,
      ALTER COLUMN address TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_status_history') THEN
    ALTER TABLE public.vehicle_status_history
      ALTER COLUMN previous_status TYPE TEXT,
      ALTER COLUMN new_status TYPE TEXT,
      ALTER COLUMN changed_by TYPE TEXT,
      ALTER COLUMN reason TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_ownership_history') THEN
    ALTER TABLE public.vehicle_ownership_history ALTER COLUMN sale_id TYPE TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registrations') THEN
    ALTER TABLE public.registrations
      ALTER COLUMN registration_number TYPE TEXT,
      ALTER COLUMN rto_office TYPE TEXT,
      ALTER COLUMN hypothecated_to TYPE TEXT,
      ALTER COLUMN rto_rmn TYPE TEXT;
  END IF;
END $$;

-- 26. Fleet Insurance Vendors Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fleet_insurance_vendors') THEN
    ALTER TABLE public.fleet_insurance_vendors
      ALTER COLUMN name TYPE TEXT,
      ALTER COLUMN code TYPE TEXT,
      ALTER COLUMN contact_person TYPE TEXT,
      ALTER COLUMN contact_email TYPE TEXT,
      ALTER COLUMN contact_phone TYPE TEXT,
      ALTER COLUMN toll_free_number TYPE TEXT,
      ALTER COLUMN claim_portal_url TYPE TEXT,
      ALTER COLUMN website TYPE TEXT,
      ALTER COLUMN address TYPE TEXT,
      ALTER COLUMN gst_number TYPE TEXT;

    ALTER TABLE public.fleet_insurance_vendors ADD COLUMN IF NOT EXISTS description TEXT;
  END IF;
END $$;

-- 27. Vehicle Service Entitlements Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_service_entitlements') THEN
    ALTER TABLE public.vehicle_service_entitlements
      ALTER COLUMN voucher_number TYPE TEXT,
      ALTER COLUMN service_title TYPE TEXT,
      ALTER COLUMN service_type TYPE TEXT,
      ALTER COLUMN coverage_scope TYPE TEXT,
      ALTER COLUMN provider_vendor TYPE TEXT,
      ALTER COLUMN status TYPE TEXT,
      ALTER COLUMN workshop_center TYPE TEXT,
      ALTER COLUMN invoice_number TYPE TEXT,
      ALTER COLUMN terms_conditions TYPE TEXT,
      ALTER COLUMN notes TYPE TEXT,
      ALTER COLUMN renewed_by TYPE TEXT;
  END IF;
END $$;

-- 28. Vehicle Specification History Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_specification_history') THEN
    ALTER TABLE public.vehicle_specification_history
      ALTER COLUMN changed_by_name TYPE TEXT,
      ALTER COLUMN changed_by_email TYPE TEXT,
      ALTER COLUMN change_summary TYPE TEXT;
  END IF;
END $$;

-- 29. Recreate Unified Renewal History View (to refresh column types)
CREATE OR REPLACE VIEW public.v_vehicle_renewal_history 
WITH (security_invoker = true) AS
  -- 1. Insurance Policies Stream
  SELECT 
    ip.id AS record_id,
    ip.vehicle_id,
    'INSURANCE'::text AS renewal_type,
    ip.policy_number::text AS certificate_or_policy_number,
    ip.insurer_name::text AS provider_or_vendor,
    ip.start_date AS valid_from,
    ip.end_date AS valid_upto,
    COALESCE(ip.premium_amount, 0.00) AS cost_or_fee,
    ip.is_active,
    ip.policy_document_url::text AS document_url,
    ip.renewed_by::text AS renewed_by,
    ip.created_at AS recorded_at,
    jsonb_build_object(
      'idv', COALESCE(ip.idv, 0.00),
      'ncb_percent', COALESCE(ip.ncb_discount_percentage, 0.00),
      'policy_type', ip.policy_type,
      'has_rsa', ip.has_roadside_assistance,
      'has_zero_dep', ip.has_zero_depreciation,
      'has_engine_protect', ip.has_engine_protect,
      'receipt_number', ip.receipt_number,
      'notes', ip.notes
    ) AS metadata
  FROM public.insurance_policies ip
  WHERE ip.is_deleted = false

  UNION ALL

  -- 2. PUC Certificates Stream
  SELECT 
    puc.id AS record_id,
    puc.vehicle_id,
    'PUC'::text AS renewal_type,
    puc.certificate_number::text AS certificate_or_policy_number,
    COALESCE(puc.testing_center_name, 'RTO Emission Center')::text AS provider_or_vendor,
    puc.valid_from,
    puc.valid_upto,
    COALESCE(puc.test_fee, 0.00) AS cost_or_fee,
    puc.is_active,
    puc.document_url::text AS document_url,
    puc.renewed_by::text AS renewed_by,
    puc.created_at AS recorded_at,
    jsonb_build_object(
      'emission_norm', puc.emission_norm,
      'test_result', puc.test_result,
      'carbon_monoxide_co', puc.carbon_monoxide_co,
      'hydrocarbon_hc', puc.hydrocarbon_hc,
      'smoke_density_k', puc.smoke_density_k,
      'receipt_number', puc.receipt_number,
      'notes', puc.notes
    ) AS metadata
  FROM public.puc_certificates puc
  WHERE puc.is_deleted = false

  UNION ALL

  -- 3. Maintenance, Free Services & AMC Packages Stream
  SELECT 
    vse.id AS record_id,
    vse.vehicle_id,
    'MAINTENANCE_AMC'::text AS renewal_type,
    COALESCE(vse.voucher_number, 'VOUCHER-' || UPPER(SUBSTRING(vse.id, 1, 8)))::text AS certificate_or_policy_number,
    COALESCE(vse.provider_vendor, 'Authorized Workshop')::text AS provider_or_vendor,
    vse.valid_from_date AS valid_from,
    vse.valid_to_date AS valid_upto,
    COALESCE(vse.labor_waived_amount, 0.00) + COALESCE(vse.parts_waived_amount, 0.00) AS cost_or_fee,
    (vse.status = 'AVAILABLE') AS is_active,
    vse.document_url::text AS document_url,
    vse.renewed_by::text AS renewed_by,
    vse.created_at AS recorded_at,
    jsonb_build_object(
      'service_title', vse.service_title,
      'service_type', vse.service_type,
      'coverage_scope', vse.coverage_scope,
      'status', vse.status,
      'min_odometer_km', vse.min_odometer_km,
      'max_odometer_km', vse.max_odometer_km,
      'redeemed_at', vse.redeemed_at,
      'redeemed_odometer_km', vse.redeemed_odometer_km,
      'workshop_center', vse.workshop_center,
      'invoice_number', vse.invoice_number,
      'labor_waived', vse.labor_waived_amount,
      'parts_waived', vse.parts_waived_amount,
      'terms_conditions', vse.terms_conditions,
      'notes', vse.notes
    ) AS metadata
  FROM public.vehicle_service_entitlements vse
  WHERE vse.is_deleted = false;

GRANT SELECT ON public.v_vehicle_renewal_history TO authenticated, anon;
