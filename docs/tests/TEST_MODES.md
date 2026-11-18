# Isolated UAT / Test Environment Setup Guide (`UAT_SETUP.md`)

This guide specifies the protocol for configuring an isolated UAT Supabase instance and running the Chandak Workspace application against it. Under permanent development governance, **test users and baseline automation must never run against the production database**.

---

## 1. Project Inactivity Notice (Free Tier)

> [!WARNING]
> Free-tier Supabase projects automatically **pause after 7 days of inactivity**.
> Always verify in the [Supabase Dashboard](https://supabase.com/dashboard) that the UAT project is active, and click **Resume** if paused, prior to executing seed scripts or test suites.

---

## 2. Project Provisioning & Credentials

> [!IMPORTANT]
> The AI agent will **never** automatically provision external cloud infrastructure. The project owner must manually create the project via the Supabase dashboard.

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard) and click **New project**.
2. Set the project name (e.g. `chandak-workspace-uat`).
3. Select region: `ap-south-1` (Mumbai) to mirror production network characteristics.
4. Record credentials from **Project Settings** → **API**:
   - **Project URL**: `https://<uat-project-ref>.supabase.co`
   - **anon / public key**: Client anon key
   - **service_role key**: Secret service role JWT

---

## 3. Schema Structure Replication (Production Schema-Only Dump)

The UAT schema must accurately reflect the live database structure rather than legacy migrations.

### A. Tooling & Secret Security Rules
- **Explicit Permission Required**: Any CLI tool (`pg_dump`, `psql`, Supabase CLI) requires user confirmation before installing or executing.
- **Zero Passwords in Commands**: Never pass plaintext passwords in shell command lines or scripts. Use environment variables (e.g. `PGPASSWORD`) or a standard `.pgpass` credential file with restricted permissions (`chmod 0600`):
  ```text
  # .pgpass format: hostname:port:database:username:password
  aws-0-ap-south-1.pooler.supabase.com:5432:postgres:postgres.tkovzymkubxtpcgynkgd:[PROD_DB_PASSWORD]
  aws-0-ap-south-1.pooler.supabase.com:5432:postgres:postgres.[UAT_PROJECT_REF]:[UAT_DB_PASSWORD]
  ```

### B. Schema-Only Export (No Data)
Extract structural objects only:
- Tables, foreign key constraints, and check constraints
- Row Level Security (RLS) configurations and policies
- Postgres functions, stored procedures, and triggers
- Custom database enum types
- Storage bucket configurations and storage RLS policies

```bash
# Example schema extraction using PGPASSWORD (no password in command)
export PGPASSWORD="[PROD_DB_PASSWORD]"
pg_dump --host="aws-0-ap-south-1.pooler.supabase.com" \
        --port="5432" \
        --username="postgres.tkovzymkubxtpcgynkgd" \
        --dbname="postgres" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --file="uat_schema_dump.sql"
unset PGPASSWORD
```

---

## 4. Reference & Master Data Migration (Strict Whitelist)

Only static lookup and reference data may be transferred to UAT. **Zero live user profiles, business records, or attachments are permitted.**

### Authorized Whitelist Tables
The export script exclusively copies rows from these tables:
1. `modules_master` — Registered workspace module codes and descriptors
2. `roles` — System role codes and names
3. `permissions` — Atomic permission actions
4. `role_permissions` — System role-to-permission mappings
5. `status_master` — Status definitions across all modules
6. `priority_master` — Task and ticket priority configurations
7. `departments` — Organization department master
8. `designations` — Organization designation master
9. `company_master` — Corporate legal entity references
10. `email_events` / `email_templates` — Transactional email templates (branding/structure only)
11. `number_series` / `app_settings` — System numbering configurations

### Strictly Forbidden Tables (Zero Data Copied)
`user_master`, `auth.users`, `tasks`, `tickets`, `requirements`, `vehicles`, `amc_contracts`, `meeting_rooms`, `meetings`, `budgets`, `documents`, `audit_logs`, `notifications`, `email_queue`, and all file storage objects.

---

## 5. Run the Application Against UAT (`.env.uat`)

A dedicated environment configuration isolates local server execution from production.

### A. Create `.env.uat` (Gitignored)
Create `.env.uat` in the repository root. This file is gitignored via the `.gitignore` rule `.env.*` and must **never** be committed.

```ini
# .env.uat — Dedicated UAT Application Configuration
NODE_ENV=development
PORT=3000

# UAT Supabase Project
NEXT_PUBLIC_SUPABASE_URL="https://<uat-project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<uat-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<uat-service-role-key>"
DATABASE_URL="postgresql://postgres.[uat-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# Test Authentication & Security
TEST_USER_PASSWORD="<Your-Chosen-Secure-Test-Password>"
CRON_SECRET="<uat-cron-secret-2026>"

# Email Safety Gate (Prevent outbound emails to real recipients)
ENABLE_EMAIL_SENDING=false
SMTP_HOST=localhost
SMTP_PORT=1025
```

### B. Launch Script
Start the Next.js development server strictly isolated to `.env.uat`:

```bash
npm run dev:uat
```

---

## 6. Active Host Verification (`/api/version`)

To prevent accidental execution against production, the application endpoint `/api/version` exposes the connected Supabase hostname:

```json
{
  "status": "online",
  "serverBootTime": "2026-11-18T18:00:00.000Z",
  "version": "2.4.0",
  "commit": "abc12345",
  "supabaseHost": "<uat-project-ref>.supabase.co",
  "timestamp": 1763488800000
}
```

### Baseline Runner Verification Gate
Prior to executing tests, the test runner queries `${STAGING_URL}/api/version`:
1. It validates `response.supabaseHost`.
2. If `response.supabaseHost === "tkovzymkubxtpcgynkgd.supabase.co"`, it immediately exits with `FATAL SECURITY GUARD: Target application is connected to production database!`.
3. It proceeds only when `response.supabaseHost` matches the hostname of `TEST_SUPABASE_URL`.

---

## 7. Execution Sequence

Once the UAT instance is seeded and the app is running:

```bash
# 1. Start application with UAT configuration
npm run dev:uat

# 2. In a separate terminal, seed the 28 test users and fixed test entities
export TEST_SUPABASE_URL="https://<uat-project-ref>.supabase.co"
export TEST_SUPABASE_SERVICE_ROLE_KEY="<uat-service-role-key>"
export TEST_USER_PASSWORD="<Your-Chosen-Secure-Test-Password>"
export STAGING_URL="http://localhost:3000"

npx tsx scripts/seed-test-users.ts

# 3. Execute baseline test suite
npm run test:baseline
```
