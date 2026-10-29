# Dashboards MSSQL Instance Migration & Handover Record

**Date & Time:** 29 October 2026, 20:16 IST  
**Environment:** Dashboards Analytics Engine (Host: `CG-DB-01`)  
**Status:** Successfully Migrated, Validated & Live  

---

## 1. Instance & Database Configuration

| Parameter | Previous Configuration | Current Active Configuration |
| :--- | :--- | :--- |
| **Database Host / IP** | `10.0.1.46` | `10.9.0.4` (`CG-DB-01`) |
| **SQL Server Instance** | `localhost\MSSQLSERVERNEW` | `10.9.0.4\MSSQLSERVER_INT` |
| **Target Database** | `DASHBOARD` | `INTERNAL_WORK` (Full IN4 copy, read-write, created 29 Oct 20:16) |
| **Authentication User** | `sa` | `sa` (Dedicated instance for dashboards analytics) |
| **Reader Script (Prepared)** | N/A | `dashboard_reader` (prepared per-table `GRANT SELECT` for `INTERNAL_WORK`, held in reserve) |

---

## 2. Authentication & Credential Management

* **User Decision**: The instance is dedicated to dashboards reporting, operating under `sa`.
* **Credential Storage**: The `sa` password is stored within the three analytics engines' `backend\.env` files, secured via Windows ACL restricted strictly to `SYSTEM` and `Administrators`.
* **Password Rotation**: If the `sa` password is updated or rotated:
  1. Execute `C:\dashboards-deploy\SWITCH_SQL_SOURCE.ps1` with the new password.
  2. Failure to execute the switch script upon password rotation will disrupt dashboard data refresh cycles.
* **Rollback Procedure**:
  - To revert to the previous database source, copy each `.env.before-switch` over `.env` in the engine directories.
  - Restart the three dashboard background services/tasks.

---

## 3. Migration Procedure & Operational Nuances

### Execution Steps
1. Executed `C:\dashboards-deploy\SWITCH_SQL_SOURCE.ps1` configured for target `INTERNAL_WORK`.
2. Verified database connection and query execution with the engine's native connection adapter (`TEST OK`).
3. Rewrote `MSSQL_*` connection parameters across the three engine `.env` files.
4. Restarted the engine tasks.

### Critical Operational Nuance: Cache Retention
* **Gotcha Identified**: Upon service restart, the analytics engines retain their persisted cache if it is younger than `REFRESH_MINUTES` (`60` minutes). Consequently, the services initially continued serving data from the old instance.
* **Remediation**: Executed a forced `cache.refresh()` within the Python virtual environment (`venv`) for each of the three engines, followed by a task restart (refreshed at 08:25 server clock).
* **Future Recommendation**: Add an automated step to `C:\dashboards-deploy\SWITCH_SQL_SOURCE.ps1` that forces `cache.refresh()` immediately following service restarts.

---

## 4. Validation & Reconciliation Results

### Full Check Integrity: 32 / 33 Checks Matching (97.0%)
* **Single Known Variance**: Asset certificates, IT gross across all statuses (₹25,134).
  * **Cause**: Cancelled certificate #14537, which the dashboard intentionally retains within the all-status extract.
* **Financial Metric Alignment**:
  * **FY 2026–27**: Budget, Billed, and Paid KPIs match 100% across Expense, Asset, and Combined categories.
  * **FY 2025–26**: Budget, Billed, and Paid KPIs match 100% across Expense, Asset, and Combined categories.
* **Service Health Checks (`/healthz`)**:
  * **Port 8080**: `HTTP 200 OK` (`data_ready=true`)
  * **Port 8081**: `HTTP 200 OK` (`data_ready=true`)
  * **Port 8083**: `HTTP 200 OK` (`data_ready=true`)

---

## 5. Disaster Recovery & Restores

* **Database Restore with `sa`**: If `INTERNAL_WORK` is re-created or restored from backup, zero credential reconfiguration or grant script execution is required when authenticating as `sa`.
* **Database Restore with `dashboard_reader`**: If the architecture transitions to the scoped `dashboard_reader` user in the future, the reader grant script must be executed against the newly restored database.

