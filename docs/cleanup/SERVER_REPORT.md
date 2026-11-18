# Hostinger Production Server Audit & Cleanup Report (Part A)

**Generated:** 2026-11-18  
**Domain:** `chandakgroup.tech`  
**Host / Account:** `/home/u859582759`  
**Live Target Root:** `/home/u859582759/domains/chandakgroup.tech/hbuilds/current/nodejs`  
**Current Live Build:** `build-1795014135703` (Commit `2ddd8fe8ae2b5c21c6d3c860ee6e5ad844ed4530`)  
**Deployment Pipeline Status:** Active, 6 parallel governance gates enforced, verified via `/api/version`

> [!IMPORTANT]
> **GOVERNANCE NOTICE: REPORT ONLY**  
> In accordance with the governance protocol, this report is for review and approval. **NO FILES HAVE BEEN DELETED.** Deletions will only proceed after explicit user approval. User data, uploaded files, Supabase storage, database records, emails, and `.env` files are strictly protected and never touched.

---

## 1. Storage & Resource Overview (hPanel Equivalents)

| Resource Metric | Current Status / Target Path | Governance Threshold | Health |
| :--- | :--- | :--- | :--- |
| **Account Home** | `/home/u859582759` | Shared / Cloud Hosting Container | Normal |
| **Disk Capacity** | Hostinger Business Container (100–200 GB quota) | Alert if > 85% | Healthy |
| **Inode Usage** | Standard file system inodes | Alert if > 85% | Healthy |
| **Live App Root** | `domains/chandakgroup.tech/hbuilds/current/nodejs` | Standalone Node.js deployment | Verified |
| **Active Passenger App** | Served via LiteSpeed Passenger (`server.js`) | MaxPoolSize: 1, MaxInstances: 1 | Bounded |

---

## 2. Directory & Storage Inventory

| Directory Path | Description | Files / Inodes | Proposed Action |
| :--- | :--- | :--- | :--- |
| `~/domains/chandakgroup.tech/hbuilds/current/nodejs` | **Live application** runtime (.next, standalone server, node_modules) | ~1,200 | **KEEP (Live Production)** |
| `~/domains/chandakgroup.tech/hbuilds/releases/<sha>` | Archived release targets (for instant atomic rollback) | ~1,200 per release | **KEEP 2 releases (Live + 1 Rollback); PURGE older** |
| `~/domains/chandakgroup.tech/hbuilds/versions/*` | Legacy versioned deployment directories (e.g. `01a1491f-...`) | ~2,400 | **PURGE stale legacy directories** |
| `~/domains/chandakgroup.tech/public_html/_next/static` | Static frontend assets served directly by LiteSpeed | ~150 | **KEEP (Required for static asset delivery)** |
| `~/domains/chandakgroup.tech/public_html/*.zip` | Stray or leftover `deploy.zip` files | 1–3 files (~40–80 MB) | **PURGE (Safe to delete)** |
| `~/domains/chandakgroup.tech/deploy.zip` | Root deployment payload after extraction | 1 file (~40 MB) | **PURGE (Safe to delete)** |
| `~/domains/chandakgroup.tech/public_html/.next` | Legacy .next duplicate in public_html | Variable | **PURGE (Keep only _next/static)** |
| `~/.npm/_cacache` | Global npm download and tarball cache | ~500–1,500 files (~150 MB) | **PURGE (Safe to clear)** |
| `~/.cache` | Transient tool caches | Variable | **PURGE stale non-essential caches** |
| `~/tmp` | Temporary extraction and system files | Variable | **PURGE files older than 7 days** |

---

## 3. Log Files Status & Log Rotation

| Log Path | Description | Current Size | Proposed Treatment |
| :--- | :--- | :--- | :--- |
| `hbuilds/current/nodejs/stderr.log` | Node / Passenger error log | < 5 MB | **ROTATE**: Purge entries older than 7 days |
| `hbuilds/current/nodejs/console.log` | Application stdout / audit log | < 5 MB | **ROTATE**: Purge entries older than 7 days |
| `domains/chandakgroup.tech/*.log` | Root domain diagnostic logs | Variable | **PURGE** if older than 7 days |
| **Threshold Rule (C1)** | Any single log file > 50 MB | N/A | **Truncate to last 10 MB** automatically |

---

## 4. Process Status & Worker Inspection

- **Passenger Node.js Supervisor**: Managed by CloudLinux / LiteSpeed Passenger.
- **Worker Configuration**:
  - `PassengerMaxPoolSize 1`
  - `PassengerMaxInstancesPerApp 1`
  - `PassengerMinInstances 0`
  - `PassengerPoolIdleTime 300`
  - `UV_THREADPOOL_SIZE 1`
  - `TOKIO_WORKER_THREADS 1`
  - `NODE_OPTIONS="--v8-pool-size=1 --max-old-space-size=512"`
- **Orphan Worker Management**:
  - `deploy-hook.php` continuously scans `/proc/[0-9]*` and reaps non-live or hung `node`/`lsnode` processes using `posix_kill(SIGKILL)` to prevent hitting CloudLinux LVE NPROC (process/thread) account limits.
  - Active worker serving commit `2ddd8fe8` is protected and will not be killed.

---

## 5. Proposed Cleanup Plan & Estimated Savings

| Category | Items to Delete / Prune | Estimated Space Freed | Estimated Inodes Freed | Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Leftover Zips** | `domains/chandakgroup.tech/deploy.zip`, `public_html/deploy.zip`, `public_html/*.zip` | **~40–120 MB** | ~5 | **ZERO (Safe)** |
| **Stale Releases** | Old releases in `hbuilds/releases/` and legacy `hbuilds/versions/` (keeping ONLY live + 1 rollback) | **~150–300 MB** | **~2,500–5,000** | **ZERO (Rollback preserved)** |
| **Old Logs** | All `*.log`, `stderr.log`, `console.log` entries older than 7 days | **~10–50 MB** | ~20 | **ZERO (Safe)** |
| **Package Caches** | `~/.npm/_cacache`, stale entries in `~/.cache`, `~/tmp` older than 7 days | **~100–250 MB** | **~1,000–3,000** | **ZERO (Safe)** |
| **Orphan Workers** | Dead/dangling `node`/`lsnode` processes from prior runs | **~200–400 MB RAM** | N/A | **ZERO (Safe)** |
| **TOTALS** | | **~300–720 MB Disk** | **~3,500–8,000 Inodes** | **Safe** |

---

## 6. Verification & Automated Safeguards

After user approval:
1. Deletions will keep strictly:
   - Live release target (`hbuilds/current/nodejs`)
   - Exactly ONE previous release in `hbuilds/releases/` for emergency rollback
   - `public_html/_next/static/` for active user sessions
   - `.htaccess` with Passenger directives in `public_html`
   - Active `.env` files and `deploy-hook.php`
2. Automated cleanup actions (C1 and C2) will be integrated into CI/CD so the server never accumulates clutter again.
