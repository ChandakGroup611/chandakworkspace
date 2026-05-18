-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Complete User Master & Identity Directory
-- Fields: Full Name, User Code, Registered Email, Department, Designation, 
--         Role, Manager, Password Hash, Profile photo, Session timestamps
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    user_code TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES user_master(id) ON DELETE SET NULL,
    password_hash TEXT NOT NULL,
    profile_photo TEXT,
    last_login_at TIMESTAMPTZ,
    last_logout_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure safe permissions
ALTER TABLE user_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_user_master_select ON user_master FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_user_master_mutate ON user_master FOR ALL USING (true);

-- Trigger for auto-updating timestamps
CREATE OR REPLACE TRIGGER update_user_master_modtime
    BEFORE UPDATE ON user_master
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Audit logging storage specifically tracking staff mutations
CREATE TABLE IF NOT EXISTS user_master_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_master(id) ON DELETE CASCADE,
    operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'PASSWORD_RESET', 'SESSION_STATE'
    performed_by TEXT NOT NULL DEFAULT 'System Operations Admin',
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_master_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_user_audit_select ON user_master_audit_logs FOR SELECT USING (true);
CREATE POLICY policy_user_audit_insert ON user_master_audit_logs FOR INSERT WITH CHECK (true);

-- Insert premium foundational active directory seeds
INSERT INTO user_master (full_name, user_code, email, password_hash, profile_photo, last_login_at, is_active) VALUES
    ('Alexander Vance', 'USR-EXEC-001', 'alexander.vance@enterprise.internal', 'argon2id$v=19$m=65536,t=3,p=4$simulatedHashTokenSecureString$Alex123', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', now() - INTERVAL '1 hour', true),
    ('Elena Rostova', 'USR-OPS-002', 'elena.rostova@enterprise.internal', 'argon2id$v=19$m=65536,t=3,p=4$simulatedHashTokenSecureString$Elena123', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', now() - INTERVAL '3 hours', true),
    ('Marcus Aurelius Sterling', 'USR-SRE-003', 'marcus.sterling@enterprise.internal', 'argon2id$v=19$m=65536,t=3,p=4$simulatedHashTokenSecureString$Marcus123', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', now() - INTERVAL '1 day', true)
ON CONFLICT (user_code) DO NOTHING;

-- Seed baseline initial audits
-- Seed baseline initial audits using generated IDs
INSERT INTO user_master_audit_logs (user_id, operation, payload) VALUES
    ((SELECT id FROM user_master WHERE user_code = 'USR-EXEC-001'), 'CREATE', '{"action": "Initial Directory Synchronization", "status": "ACTIVE"}'),
    ((SELECT id FROM user_master WHERE user_code = 'USR-OPS-002'),   'CREATE', '{"action": "Provision Staff Member",          "status": "ACTIVE"}')
ON CONFLICT DO NOTHING;
