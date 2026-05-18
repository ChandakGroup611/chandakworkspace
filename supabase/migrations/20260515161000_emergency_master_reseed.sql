-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Emergency Master Data Recovery & Seeding (ID-AGNOSTIC)
-- Purpose: Forcefully re-populates master tables using 'code' as the unique key
-- ============================================================================

-- 1. Seed Departments
INSERT INTO departments (code, name, description) VALUES
    ('DEPT_ITSM_CORE', 'Enterprise Operations Command Center', 'Global resolution support queue division.')
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 2. Seed Master Priorities
INSERT INTO master_priorities (code, name, sla_target_minutes, description) VALUES
    ('PRIO_CRIT_P1', 'Critical Priority (P1 Blocker)', 15, 'Immediate response routing threshold for active platform down events.'),
    ('PRIO_HIGH_P2', 'High Priority (P2 Significant)', 60, 'Substantial business degradation requiring targeted task force.'),
    ('PRIO_MED_P3', 'Medium Priority (P3 Default)', 240, 'Non-blocking application operational bugs or configuration drift.')
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 3. Seed Ticket Categories
INSERT INTO ticket_categories (code, name, description) VALUES
    ('CAT_HARDWARE', 'Hardware Infrastructure', 'Physical assets, servers, and workstation diagnostics.'),
    ('CAT_SOFTWARE', 'Software Systems', 'Application defects, access issues, and feature requests.')
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 4. Seed Ticket Subcategories
INSERT INTO ticket_subcategories (category_id, code, name, description)
SELECT id, 'SUB_HW_FAILURE', 'Component Failure', 'Hardware malfunction requiring physical repair.'
FROM ticket_categories WHERE code = 'CAT_HARDWARE'
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

INSERT INTO ticket_subcategories (category_id, code, name, description)
SELECT id, 'SUB_SW_ACCESS', 'Access Management', 'IAM and role-based access permission requests.'
FROM ticket_categories WHERE code = 'CAT_SOFTWARE'
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 5. Seed Issue Types
INSERT INTO issue_types (code, name, description) VALUES
    ('TYPE_INCIDENT', 'Operational Incident', 'Unexpected interruption to an IT service.'),
    ('TYPE_REQUIREMENT', 'New Requirement', 'Formal request for new capability or configuration change.')
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 6. Seed Software Systems
INSERT INTO software_systems (code, name, description) VALUES
    ('SYS_SAP_ERP', 'SAP ERP S/4HANA', 'Core enterprise resource planning platform.'),
    ('SYS_CRM_SALES', 'Customer Relation Manager', 'Global sales and pipeline tracking system.')
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 7. Seed Software Modules
INSERT INTO software_modules (system_id, code, name)
SELECT id, 'MOD_FI', 'Financial Accounting (FI)'
FROM software_systems WHERE code = 'SYS_SAP_ERP'
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

INSERT INTO software_modules (system_id, code, name)
SELECT id, 'MOD_MM', 'Materials Management (MM)'
FROM software_systems WHERE code = 'SYS_SAP_ERP'
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 8. Workflow States
INSERT INTO workflow_states (code, name, module) VALUES
    ('ST_OPEN', 'Open State', 'tickets'),
    ('ST_IN_PROGRESS', 'In Progress', 'tickets'),
    ('ST_REVIEW', 'Under Review', 'tickets'),
    ('ST_RESOLVED', 'Resolved Final', 'tickets')
ON CONFLICT (code) DO UPDATE SET is_active = true;
