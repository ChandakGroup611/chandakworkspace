# Isolated UAT / Test Environment Setup Guide (`UAT_SETUP.md`)

This guide outlines the procedure for configuring a dedicated, isolated UAT Supabase instance. Under permanent development governance, **test users and baseline automation must never run against the production database**.

---

## 1. Create a Dedicated UAT Supabase Project

> [!IMPORTANT]
> The AI agent will **never** create cloud infrastructure or projects automatically. The project owner must manually create the project via the Supabase dashboard.

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Name the project (e.g. `chandak-workspace-uat`).
4. Select the organization and region (recommended: `ap-south-1` Mumbai to match production latency).
5. Generate and securely store a database password.

---

## 2. Retrieve Project Credentials

Navigate to **Project Settings** → **API**:
- **Project URL**: e.g. `https://<uat-project-ref>.supabase.co`
- **service_role (secret)**: The secret backend service role JWT.

---

## 3. Apply Schema Migrations to UAT

Execute all authoritative schema migrations against the new UAT database:

```bash
# Using Supabase CLI linked to the UAT project:
npx supabase db push --db-url "postgresql://postgres:[YOUR-UAT-PASSWORD]@db.[UAT-PROJECT-REF].supabase.co:5432/postgres"

# Or execute migration files in supabase/migrations/ in chronological order via Supabase SQL Editor
```

---

## 4. Local Environment Configuration

Add the following variables to your local test environment (or export them in your shell):

```bash
# Mandatory UAT Test Database Credentials
export TEST_SUPABASE_URL="https://<uat-project-ref>.supabase.co"
export TEST_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
export TEST_USER_PASSWORD="<Your-Chosen-Secure-Test-Password>"

# Local / Staging Application URL (NEVER chandakgroup.tech)
export STAGING_URL="http://localhost:3000"
```

> [!CAUTION]
> The test runner and seed scripts feature a hard fail-safe:
> 1. They immediately exit if `TEST_SUPABASE_URL` matches the production host (`tkovzymkubxtpcgynkgd.supabase.co`).
> 2. They immediately exit if `STAGING_URL` or `BASE_URL` contains `chandakgroup.tech`.
> 3. They immediately exit if `TEST_USER_PASSWORD` is omitted.

---

## 5. Configure GitHub Secrets (for CI/CD Safety Gate)

In your GitHub repository (**Settings** → **Secrets and variables** → **Actions**), add:
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_SERVICE_ROLE_KEY`
- `TEST_USER_PASSWORD`
- `CRON_SECRET`

---

## 6. Seed Test Users & Execute Baseline Suite

Once the UAT database is configured, seed the 28 test users and fixed entities, then execute the baseline suite:

```bash
# 1. Seed UAT Test Users and Entities (Idempotent, test-tagged)
npx tsx scripts/seed-test-users.ts

# 2. Run P1 Baseline Automated Suite
npm run test:baseline
```
