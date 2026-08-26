# 🚨 ANTIGRAVITY — KRA & DEPLOYMENT GOVERNANCE RULES

## Chandak Workspace — AI Development Governance & Change-Control Protocol

**Document Purpose & KRA:**
This single document contains all the non-negotiable rules (all 28 rules) that constitute the AI Agent's **Key Result Area (KRA)**. 

**MANDATORY DEPLOYMENT GATE:**
When going to deploy or finalizing any feature, the AI Agent **MUST** check these rules. The agent may **ONLY DEPLOY IF 100% CLEAR** on every rule listed here. If there is any doubt or incomplete verification, the agent MUST STOP and not deploy.

These rules are **NON-NEGOTIABLE**.

The primary objective is:

> **ADD NEW FUNCTIONALITY WITHOUT DESTROYING, MODIFYING, REGRESSING, OR LOSING ANY EXISTING FUNCTIONALITY, DATA, LOGIC, SECURITY, UI/UX, CONFIGURATION, OR BUSINESS RULE.**

---

# 1. CORE PRINCIPLE — NEVER DESTROY EXISTING WORK

* [ ] Never assume existing code, functionality, fields, database structures, business logic, API behavior, UI behavior, RBAC rules, validations, or workflows are obsolete.
* [ ] Never remove existing functionality merely because it appears unused.
* [ ] Never overwrite existing logic without first understanding why it exists.
* [ ] Never replace an existing implementation simply because a new implementation appears cleaner.
* [ ] Never rename, remove, alter, or restructure existing fields, APIs, database objects, components, functions, workflows, or permissions without impact analysis and explicit approval.
* [ ] Never modify unrelated modules while implementing a requested feature.
* [ ] Never introduce a "quick fix" that silently changes existing behavior.
* [ ] Never assume that a change is isolated just because the changed file appears isolated.
* [ ] Treat every existing feature as **protected functionality** unless explicitly approved for modification.

### Golden Rule

> **NEW CHANGE MUST NOT BREAK OLD FUNCTIONALITY.**

---

# 2. BEFORE MAKING ANY CHANGE — MANDATORY DISCOVERY

Before writing or modifying code, the AI Agent MUST inspect the existing system.

The agent must identify:

* [ ] Relevant frontend components
* [ ] Backend/API logic
* [ ] Database tables
* [ ] Database relationships
* [ ] Stored procedures/functions if applicable
* [ ] Existing validations
* [ ] Existing business rules
* [ ] Authentication
* [ ] IAM
* [ ] RBAC
* [ ] User scope rules
* [ ] Workspace scope
* [ ] API dependencies
* [ ] Related modules
* [ ] Shared components
* [ ] Shared utilities
* [ ] Global UI/theme configuration
* [ ] Environment/configuration dependencies
* [ ] Existing tests
* [ ] Existing deployment configuration
* [ ] Existing security controls
* [ ] Existing audit logging
* [ ] Existing SLA logic
* [ ] Existing notification/email rules

The agent MUST NOT begin implementation until it understands the likely impact area.

---

# 3. IMPACT ANALYSIS IS MANDATORY

Before changing anything, generate an internal impact analysis.

The agent must determine:

### Direct Impact

What files, components, APIs, tables, functions, workflows, and screens are directly affected?

### Indirect Impact

What other modules depend on the changed functionality?

### Data Impact

Could the change affect:

* Existing records?
* Existing fields?
* Relationships?
* Foreign keys?
* Historical data?
* Audit logs?
* Reports?
* Dashboard calculations?

### Permission Impact

Could the change affect:

* IAM?
* RBAC?
* User scopes?
* Workspace scopes?
* Department scopes?
* Admin permissions?

### UI Impact

Could the change affect:

* Shared components?
* Global theme?
* Responsive behavior?
* Existing screens?
* Navigation?
* Forms?
* Validation messages?

### Performance Impact

Could the change introduce:

* Additional database queries?
* N+1 queries?
* Large data loading?
* Unnecessary API calls?
* Expensive joins?
* Missing indexes?
* Excessive client-side processing?
* Memory consumption?
* Slow rendering?

### Security Impact

Could the change introduce:

* Unauthorized data access?
* Privilege escalation?
* Broken access control?
* Injection vulnerabilities?
* Exposed sensitive information?
* Insecure API endpoints?
* Authentication bypass?

If the agent detects significant risk, it MUST STOP and report the risk before proceeding.

---

# 4. APPROVAL REQUIRED FOR DESTRUCTIVE CHANGES

The AI Agent MUST NOT automatically perform destructive changes.

The following require explicit human approval:

* [ ] Delete functionality
* [ ] Delete database tables
* [ ] Delete columns
* [ ] Rename important database columns
* [ ] Remove APIs
* [ ] Remove permissions
* [ ] Remove RBAC rules
* [ ] Change authentication behavior
* [ ] Change IAM architecture
* [ ] Change business-critical workflows
* [ ] Change existing calculations
* [ ] Change SLA rules
* [ ] Change audit behavior
* [ ] Change production configuration
* [ ] Major refactoring
* [ ] Data migration
* [ ] Data transformation
* [ ] Breaking API changes

Before approval, the agent MUST explain:

### Proposed Change

What will change?

### Reason

Why is the change required?

### Advantages

What improves?

### Risks

What can break?

### Affected Modules

Which existing functionality may be affected?

### Data Impact

Could existing data be affected?

### Security Impact

Could access control or security change?

### Performance Impact

Could performance improve or degrade?

### Rollback

How can the change be reverted?

---

# 5. NEVER LOSE EXISTING DATA

Data preservation is a highest-priority requirement.

Before any database modification:

* [ ] Verify existing schema.
* [ ] Verify relationships.
* [ ] Verify constraints.
* [ ] Verify existing records.
* [ ] Verify dependent queries.
* [ ] Verify reports.
* [ ] Verify dashboards.
* [ ] Verify APIs.
* [ ] Verify application logic.
* [ ] Create/confirm backup or rollback strategy.
* [ ] Prefer additive migrations over destructive migrations.
* [ ] Never silently overwrite existing records.
* [ ] Never truncate production data.
* [ ] Never delete historical data without explicit approval.

If the agent cannot prove that existing data will remain safe:

> **STOP. DO NOT DEPLOY.**

---

# 6. AUTOMATIC CHANGE TRACKING

Every development activity MUST be documented.

Maintain a permanent project file:

`/docs/CHANGELOG.md`

Every change must record:

* Date
* Change ID
* Requested functionality
* Reason
* Modules affected
* Files changed
* Database changes
* API changes
* UI changes
* Business logic changes
* Security impact
* RBAC impact
* Performance impact
* Testing performed
* Regression testing performed
* Deployment status
* Rollback information

Nothing should be considered complete until it is recorded.

---

# 7. MAINTAIN A SYSTEM INVENTORY

Maintain:

`/docs/SYSTEM_INVENTORY.md`

This file must contain the known application structure:

* Modules
* Pages
* Components
* APIs
* Database tables
* Database relationships
* Functions
* Workflows
* Roles
* Permissions
* User scopes
* Workspace scopes
* Integrations
* Background jobs
* Notifications
* Reports
* Dashboards
* Security mechanisms
* Configuration dependencies

Whenever the architecture changes, this inventory must be updated.

---

# 8. MAINTAIN A BUSINESS LOGIC REGISTRY

Maintain:

`/docs/BUSINESS_RULES.md`

Every important business rule must be recorded.

Examples:

* Who can create a workspace?
* Who can assign a task?
* Who can see a ticket?
* Which users can access department tickets?
* Which roles can approve requirements?
* How are SLA deadlines calculated?
* How are escalations triggered?
* Which users can access reports?
* Which actions require approval?
* Which actions generate audit logs?

The AI MUST check this file before changing business logic.

---

# 9. MAINTAIN AN RBAC/IAM REGISTRY

Maintain:

`/docs/IAM_RBAC_MATRIX.md`

The system must track:

* Users
* Roles
* Permissions
* Scope
* Workspace access
* Department access
* Module access
* Action-level permissions
* Admin privileges
* Restricted operations

Every new feature must be checked against IAM/RBAC.

### Mandatory Rule

> **A feature is NOT complete if its authorization model is incomplete.**

Authentication alone is not considered security.

---

# 10. REGRESSION PROTECTION

Every new feature must trigger regression testing.

The agent MUST identify existing functionality that could potentially be affected.

At minimum test:

* [ ] Authentication
* [ ] Authorization
* [ ] IAM
* [ ] RBAC
* [ ] User scope
* [ ] Workspace scope
* [ ] Existing modules
* [ ] Existing workflows
* [ ] Existing forms
* [ ] Existing validations
* [ ] Existing reports
* [ ] Existing dashboards
* [ ] Existing notifications
* [ ] Audit logging
* [ ] SLA logic
* [ ] Existing APIs
* [ ] Database operations

A feature cannot be marked "complete" simply because the new functionality works.

---

# 11. TEST CASE GENERATION IS MANDATORY

For every new functionality or modification, the AI MUST create/update test cases.

Maintain:

`/docs/TEST_CASES.md`

Every feature must contain:

### Positive Tests

Expected valid behavior.

### Negative Tests

Invalid inputs and invalid operations.

### Boundary Tests

Minimum/maximum values and unusual conditions.

### Permission Tests

Unauthorized users must be denied.

### Scope Tests

Users must only see data permitted by their scope.

### Regression Tests

Existing functionality must continue working.

### Data Tests

Existing data must remain correct.

### Performance Tests

Large data scenarios must be considered.

### Security Tests

Unauthorized access and common vulnerabilities must be checked.

---

# 12. SELF-VERIFICATION BEFORE COMPLETION

After implementation, the AI MUST NOT immediately claim:

> "Done."

Instead perform a mandatory verification process.

Check:

1. Was the requested functionality implemented?
2. Were all requested fields created?
3. Were all validations implemented?
4. Was frontend logic implemented?
5. Was backend logic implemented?
6. Was database logic implemented?
7. Were API changes completed?
8. Were permissions implemented?
9. Were RBAC rules implemented?
10. Were user scopes implemented?
11. Were audit logs implemented where required?
12. Were notifications implemented where required?
13. Were reports/dashboard calculations updated?
14. Were existing workflows preserved?
15. Were existing modules regression-tested?
16. Were security checks performed?
17. Was performance impact checked?
18. Was documentation updated?
19. Was the changelog updated?
20. Was deployment verification completed?

If ANY required item is incomplete:

> **DO NOT MARK THE TASK COMPLETE.**

---

# 13. DEPLOYMENT GATE

Production deployment MUST be treated as a controlled operation.

Before deployment:

### Code

* [ ] Build succeeds.
* [ ] No compilation errors.
* [ ] No critical lint/type errors.
* [ ] No unresolved imports.
* [ ] No broken references.
* [ ] No accidental debug code.

### Database

* [ ] Migration validated.
* [ ] Existing data protected.
* [ ] Relationships verified.
* [ ] Rollback strategy available.

### Backend

* [ ] APIs tested.
* [ ] Authorization tested.
* [ ] Error handling tested.
* [ ] Validation tested.

### Frontend

* [ ] Main pages load.
* [ ] Forms work.
* [ ] Existing navigation works.
* [ ] Responsive behavior checked.
* [ ] Theme behavior checked.

### Security

* [ ] Authentication verified.
* [ ] RBAC verified.
* [ ] Scope restrictions verified.
* [ ] Unauthorized access tested.
* [ ] Sensitive data exposure checked.
* [ ] Security warnings reviewed.

### Performance

* [ ] Query performance checked.
* [ ] API response performance checked.
* [ ] Large-data scenarios considered.
* [ ] Unnecessary queries identified.
* [ ] Expensive operations reviewed.

### Regression

* [ ] Existing critical functionality tested.
* [ ] Related modules tested.
* [ ] New functionality tested.

Only after passing the deployment gate may deployment proceed.

---

# 14. PRODUCTION VERIFICATION

Deployment success does NOT mean feature success.

After deployment:

* [ ] Verify application starts correctly.
* [ ] Verify authentication.
* [ ] Verify critical workflows.
* [ ] Verify database connectivity.
* [ ] Verify APIs.
* [ ] Verify permissions.
* [ ] Verify newly implemented functionality.
* [ ] Verify existing critical functionality.
* [ ] Verify logs.
* [ ] Verify notifications.
* [ ] Verify audit records.
* [ ] Check production errors.
* [ ] Check performance.
* [ ] Check security warnings.

The agent must report:

**DEPLOYMENT STATUS**

* Build: PASS/FAIL
* Database: PASS/FAIL
* Backend: PASS/FAIL
* Frontend: PASS/FAIL
* Security: PASS/FAIL
* RBAC: PASS/FAIL
* Regression: PASS/FAIL
* Performance: PASS/FAIL
* Production verification: PASS/FAIL

---

# 15. GLOBAL UI/UX RULE

UI/UX changes must respect the application's global design architecture.

Never create isolated styling when a global design system exists.

Whenever UI/UX is changed:

* [ ] Respect selected theme.
* [ ] Respect dark/light mode.
* [ ] Respect global typography.
* [ ] Respect global spacing.
* [ ] Respect global components.
* [ ] Respect responsive behavior.
* [ ] Reuse shared components where appropriate.
* [ ] Ensure dynamic theme behavior.
* [ ] Avoid hardcoded colors when theme variables exist.
* [ ] Avoid breaking existing screens.

If a new global UI component is introduced, verify all existing screens that use the same design system.

---

# 16. PERFORMANCE-FIRST DEVELOPMENT

Every change must consider future scale.

The current dataset may be small, but the architecture must be evaluated for:

* Thousands of records
* Millions of records
* Large user counts
* Concurrent users
* Large workspaces
* Large ticket volumes
* Large audit logs
* Large reporting datasets

The agent must identify:

* Missing indexes
* N+1 queries
* Full-table scans
* Excessive joins
* Unnecessary API calls
* Excessive data fetching
* Large client-side processing
* Unnecessary re-renders
* Inefficient pagination
* Missing caching opportunities

Never sacrifice production performance for convenience.

---

# 17. SECURITY & VULNERABILITY MONITORING

The system must continuously consider security.

Check for:

* Authentication vulnerabilities
* Authorization bypass
* RBAC weaknesses
* Scope bypass
* Injection vulnerabilities
* XSS
* CSRF where applicable
* Sensitive data exposure
* Insecure API endpoints
* Weak validation
* Exposed environment variables
* Incorrect storage policies
* Database access policy problems
* Dependency vulnerabilities
* Host/security warnings

If Hostinger, Supabase, deployment infrastructure, security scanners, or other infrastructure reports a warning:

> **Do not ignore the warning. Investigate it, classify it, and report the recommended action.**

Target:

> **ZERO UNEXPLAINED CRITICAL/HIGH SECURITY WARNINGS.**

---

# 18. EMAIL & ALERT RULES

Existing email/notification rules must NEVER be silently removed or modified.

Whenever notification logic changes:

* [ ] Identify existing triggers.
* [ ] Identify recipients.
* [ ] Identify conditions.
* [ ] Identify templates.
* [ ] Identify escalation rules.
* [ ] Test successful delivery path.
* [ ] Test failure path.
* [ ] Test duplicate notification prevention.
* [ ] Test permission/privacy implications.

Every critical notification must have traceable logic.

---

# 19. AUDIT LOG REQUIREMENT

Business-critical activities must be auditable.

Where applicable, record:

* Who performed the action
* What action was performed
* When it happened
* Which record was affected
* Previous value
* New value
* Source/context
* Relevant workspace
* Relevant module

Audit logs must not be casually deleted or modified.

---

# 20. NO SILENT AUTO-CHANGES

The AI Agent MUST NOT silently change:

* Business rules
* Database design
* RBAC
* IAM
* Existing UI behavior
* Existing workflows
* Existing API behavior
* Existing calculations
* Existing validations
* Security policies
* Notifications
* SLA rules

If an improvement is discovered while implementing another task:

> **REPORT IT AS A RECOMMENDATION.**

Do not implement it automatically unless explicitly approved.

---

# 21. DISCOVERED PROBLEM REPORTING

If the AI discovers something unrelated to the current task:

Do NOT automatically modify it.

Create a finding:

`/docs/TECHNICAL_FINDINGS.md`

Record:

* Finding
* Severity
* Affected module
* Potential impact
* Security impact
* Performance impact
* Recommended solution
* Whether approval is required

Severity:

* CRITICAL
* HIGH
* MEDIUM
* LOW
* INFORMATIONAL

---

# 22. CHANGE ISOLATION

Each development task must be isolated conceptually.

The AI must identify:

**REQUESTED CHANGE**

versus

**UNRELATED EXISTING FUNCTIONALITY**

The agent must avoid scope creep.

If implementation requires modification outside the expected scope:

> STOP → EXPLAIN → REQUEST APPROVAL.

---

# 23. BACKWARD COMPATIBILITY

Whenever possible:

> **Prefer additive changes over destructive changes.**

Examples:

Instead of immediately removing an old field:

1. Add new field.
2. Migrate/validate data.
3. Update dependent logic.
4. Test.
5. Monitor.
6. Obtain approval.
7. Remove old field only after confirmation.

The same principle applies to:

* APIs
* Database structures
* UI components
* Workflows
* Permissions
* Business rules.

---

# 24. RECOVERY & ROLLBACK

Every significant production change must have a rollback strategy.

Before deployment identify:

* What changed?
* How can it be reverted?
* Can database changes be reversed?
* Can application code be reverted?
* Can configuration be reverted?
* Is backup available?
* What happens to data created after deployment?

If rollback is impossible or unsafe:

> **Flag this before deployment.**

---

# 25. NEVER TRUST ASSUMPTIONS

The AI must verify rather than assume.

Do NOT assume:

* A field exists.
* A table exists.
* An API works.
* A permission exists.
* A user has access.
* A component is unused.
* A function is unused.
* A business rule is obsolete.
* A database migration succeeded.
* A deployment succeeded.
* A notification was delivered.

Inspect and verify.

---

# 26. DEFINITION OF "DONE"

A task is NOT DONE when code has been generated.

A task is DONE only when:

**Requirement → Analysis → Implementation → Validation → Testing → Regression → Security → Performance → Documentation → Deployment → Production Verification**

has been completed.

---

# 27. AI AGENT FINAL RESPONSE FORMAT

For every completed development task, provide:

## CHANGE SUMMARY

What was requested and implemented.

## FILES CHANGED

List all modified/created files.

## DATABASE CHANGES

List schema/migration changes.

## FRONTEND CHANGES

List UI/UX changes.

## BACKEND CHANGES

List APIs/business logic changes.

## IAM/RBAC CHANGES

List access-control changes.

## BUSINESS RULES

List new/modified rules.

## TESTING

List tests performed.

## REGRESSION TESTING

List existing functionality verified.

## SECURITY CHECK

List security checks performed.

## PERFORMANCE CHECK

List performance considerations/tests.

## DOCUMENTATION

List documentation updated.

## DEPLOYMENT

Deployment result.

## PRODUCTION VERIFICATION

Production verification result.

## WARNINGS / FINDINGS

Anything discovered but not changed.

## ROLLBACK

Explain rollback procedure if applicable.

## FINAL STATUS

Use exactly one:

**✅ COMPLETE — VERIFIED**

or

**⚠️ COMPLETE WITH WARNINGS — APPROVAL REQUIRED**

or

**❌ NOT COMPLETE — DO NOT DEPLOY**

Never claim 100% completion if any required verification remains incomplete.

---

# 28. MOST IMPORTANT RULE

> **PRESERVE FIRST. CHANGE SECOND. VERIFY THIRD. DEPLOY LAST.**

The AI Agent's responsibility is not merely to generate code.

Its responsibility is to protect the integrity of the entire application while implementing approved changes.

Existing functionality, existing data, existing business logic, security, RBAC, performance, UI/UX, auditability, and production stability have priority over convenience or speed.

**NO FEATURE IS MORE IMPORTANT THAN THE STABILITY AND INTEGRITY OF THE EXISTING SYSTEM.**

---

# 29. AUTOMATIC DATABASE DEPLOYMENT

All SQL scripts, schema modifications, functions, and migrations MUST be automatically deployed/applied to the Supabase database. The agent is responsible for ensuring these scripts execute correctly in the target environment as part of the deployment process.

---

# 30. HUMAN-READABLE WARNINGS & POPUPS

All user-facing messages, errors, warnings, and popups MUST be written in plain, human-readable language.

* [ ] Never expose raw system errors, stack traces, or "machine words" to the end user.
* [ ] Explain *what* went wrong and *how* the user can fix it, rather than simply stating that an operation failed.
* [ ] Use a professional, helpful, and clear tone.
