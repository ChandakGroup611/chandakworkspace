-- =========================================================================
-- UP MIGRATION: 20261119110000_wp3_tickets_requirements_integrity.sql
-- Master Programme WP3 (Item 3.5 & Decision D3, D6)
-- Data Audit & Remediation for Tickets and Requirements Status Consistency
-- =========================================================================

-- 1. Create backup tables before modifying live data
CREATE TABLE IF NOT EXISTS public.backup_tickets_wp3_20261119 AS
SELECT * FROM public.tickets
WHERE status_id = '122114fb-f0eb-416f-9ae9-92a182913764';

CREATE TABLE IF NOT EXISTS public.backup_requirements_wp3_20261119 AS
SELECT * FROM public.requirements
WHERE id IN (
  '64f29684-de50-45ca-a596-c39e9134713d',
  'e998a20e-b499-4c9c-9b4c-f051f6a7fbdf',
  '7884cf05-76a2-4cf2-b15c-7a7846414a86',
  'bf69b273-cb25-4238-9dc7-79747d506bac'
);

-- 2. Remediate tickets pointing to defunct/unregistered status ID
UPDATE public.tickets
SET status_id = 'ac064265-0cd6-4067-8d0c-dcfda392c9ef', updated_at = NOW()
WHERE status_id = '122114fb-f0eb-416f-9ae9-92a182913764';

-- 3. Remediate requirements whose approval_status contradicts status_id
-- Synchronize 'Approved' requirements to REQ_APPROVED status
UPDATE public.requirements
SET status_id = 'fc9894ae-cf69-4ccf-89aa-f421ad327e10', updated_at = NOW()
WHERE id IN ('64f29684-de50-45ca-a596-c39e9134713d', 'e998a20e-b499-4c9c-9b4c-f051f6a7fbdf')
  AND status_id = 'c04655b2-a4d9-40ae-88d8-22d570e7ecb8';

-- Synchronize 'Closed' requirements to REQ_CLOSED status
UPDATE public.requirements
SET status_id = '411ec061-72a9-41dc-923a-0002788f3229', updated_at = NOW()
WHERE id IN ('7884cf05-76a2-4cf2-b15c-7a7846414a86', 'bf69b273-cb25-4238-9dc7-79747d506bac')
  AND status_id = 'c04655b2-a4d9-40ae-88d8-22d570e7ecb8';
