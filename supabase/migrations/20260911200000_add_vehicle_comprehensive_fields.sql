-- Add comprehensive vehicle fields to vehicles master
ALTER TABLE public.vehicles 
  ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50) DEFAULT 'Petrol',
  ADD COLUMN IF NOT EXISTS rto_office VARCHAR(150),
  ADD COLUMN IF NOT EXISTS registered_owner VARCHAR(255),
  ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS puc_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS fitness_expiry_date DATE;
