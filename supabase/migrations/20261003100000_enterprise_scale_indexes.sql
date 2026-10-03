-- ==============================================================================
-- Enterprise High-Scale Indexes for High-Volume Search & Filter Acceleration
-- Supports millions of records with bounded O(log N) seeks and instant trigram search
-- ==============================================================================

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Vehicles: Instant Trigram Search & Status Filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_trgm
  ON public.vehicles USING gin (registration_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicles_make_model_trgm
  ON public.vehicles USING gin ((make || ' ' || model) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicles_status_created
  ON public.vehicles (status, created_at DESC);

-- 2. Vehicle Documents: Bounded Foreign Key & Category Lookup
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle_type
  ON public.vehicle_documents (vehicle_id, doc_type, uploaded_at DESC);

-- 3. Task Attachments: Bounded Workspace Task Lookup
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_created
  ON public.task_attachments (task_id, created_at DESC);

-- 4. Tasks: Instant Workspace Search & Bounded Status Filtering
CREATE INDEX IF NOT EXISTS idx_tasks_number_title_trgm
  ON public.tasks USING gin ((task_number || ' ' || title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_created
  ON public.tasks (workspace_id, status, created_at DESC);
