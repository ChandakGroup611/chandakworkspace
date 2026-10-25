# Chandak Workspace + Chandak Meet: Complete Build Specification

Version 3.0 · 25 Oct 2026 · Target repo: `ChandakGroup611/chandakworkspace`
**This single file replaces** `CHANDAK_MEET_MODULE_SPEC.md` (v1), `CHANDAK_MEET_PRODUCT_SPEC_v2.md` and `CHANDAK_PORTAL_PLATFORM_SPEC.md`. Give the build agent only this file plus the prototype `chandak-meet-prototype.html` (same folder).

---

## How to use this document (read first)

**Goal:** Chandak Group is building its own portal, Chandak Workspace, and replacing Zoho for meeting management with the Chandak Meet module. Everything is built from scratch in-house: invites, sign-in, users, roles, alerts, and the meeting module on top.

**The three parts**

| Part | What it covers | Build when |
|---|---|---|
| **A. Platform foundation** | Org structure, invites, sign-in and MFA, SSO, user management, RBAC roles and permissions, notification and email service, admin console, audit, security baseline | First (Phase 0) |
| **B. Chandak Meet** | Zoho parity map, meetings, sessions, points, TAT, backup/carry-forward points, tasks, decisions, Live mode, MoM, board mode, reports, integrations, Zoho migration | After Part A core (Phases 1 to 3) |
| **C. Performance, scalability and reliability** | Targets, front-end and API rules, DB indexes and partitioning, caching, background jobs, real-time, infra, monitoring, load testing | Applies to A and B from day one; go-live gate |

**Rules for the build agent**
1. Read the existing `chandakworkspace` repo first. Keep its stack, folder layout, routing, DB access layer, migrations, UI component library and naming. Where this spec's names differ from the repo's conventions, keep the repo's names and the spec's meaning. If the repo already has a piece of Part A (for example users or login), extend it to match this spec. Don't build a second one.
2. This spec says *what* to build and the rules it must follow. The prototype shows the screens. Where they differ, this spec wins.
3. Every permission check runs on the server (`can()` from A4). Every write is audit-logged (A10). Every alert goes through `notify()` (A7). Chandak Meet never keeps its own user list; it uses `core_users`.
4. Store all times in UTC; show them in IST (Asia/Kolkata).
5. Phase tags: **P1** = must have for go-live, **P2** = within about 2 months after, **P3** = later.
6. Section numbers carry their part's letter (A4.2, B6.4, C5.2). A bare number inside a Part B table means a Part B section.

**Overall delivery order**
1. **Phase 0:** A15, steps 1 to 8 (org masters → auth → RBAC → invites → notifications → admin console → MFA → SSO), built to the Part C rules from the start (indexes, pagination, queue, caching).
2. **Phase 1 to 3:** B12 (Chandak Meet MVP, then full product, then AI and extras).
3. **Gate before each go-live:** C12 load tests and C13 performance acceptance criteria, plus the A14 and B14 functional acceptance criteria.

**Open decisions for Chandak Group:** A13 (platform: email system, providers, HRMS, admins, MFA, hosting) and B13 (meetings: video strategy and others).

## Contents
- Part A: Platform foundation: A1 Concepts · A2 User lifecycle and invites · A3 Authentication · A4 Authorisation (RBAC) · A5 Groups · A6 Workspace shell · A7 Notifications and email · A8 Admin console · A9 Data model · A10 Audit · A11 Security · A12 API · A13 Decisions · A14 Acceptance · A15 Build order
- Part B: Chandak Meet: B0 Goal · B1 Zoho parity map · B2 Glossary · B3 Meeting roles · B4 Data model · B5 Statuses and TAT · B6 Workflows · B7 Screens · B8 Reports · B9 API and integrations · B10 Non-functional · B11 Zoho migration · B12 Delivery plan · B13 Decisions · B14 Acceptance
- Part C: Performance: C1 Sizing · C2 Targets · C3 Front-end · C4 API · C5 Database · C6 Caching · C7 Background jobs · C8 Real-time · C9 Files · C10 Infrastructure · C11 Observability · C12 Load testing · C13 Acceptance

---

# PART A: Platform foundation (Chandak Workspace)

## A1. Concepts

| Term | Meaning |
|---|---|
| **Tenant / Group** | Chandak Group. One deployment = one group. The data model keeps `group_id` so a second group can be added later. |
| **Company** | A legal entity inside the group (e.g. Chandak Agro Pvt Ltd). Has its own GSTIN, logo, address, financial year. |
| **Location / Plant / Branch** | A site belonging to a company (HO, Plant 1, Nagpur branch). |
| **Department** | Sales, Finance, IT, HR, Operations, Admin, Management… Can be group-wide or per company. |
| **Designation** | Job title (Zonal Manager, Accounts Executive). Used for display and for default role suggestions. |
| **User** | A person who can sign in. Internal (employee) or external (guest, auditor, consultant). |
| **Module** | An app in the workspace: Meet, HR, Purchase, Helpdesk, Admin. Each module registers its own permissions. |
| **Role** | A named set of permissions (e.g. *Meet Organizer*). |
| **Scope** | Where a role applies: whole group, one or more companies, one or more departments, or own records only. |
| **Permission** | One action on one resource, e.g. `meet.meeting.create`. |
| **Policy** | A rule that limits a permission with a condition, e.g. "can edit a task only if owner = me". |

---

## A2. User lifecycle

```
Invited ──accept──▶ Active ──suspend──▶ Suspended ──reactivate──▶ Active
   │                  │
   │ expire/revoke    └──deactivate (exit)──▶ Deactivated ──(after retention)──▶ Anonymised
   ▼
 Invite expired
```

| Status | Can sign in | Shown in pickers (owner, attendee) | Notes |
|---|---|---|---|
| Invited | No (only via the invite link) | Yes, marked "Invited" | Items can be assigned before they join. |
| Active | Yes | Yes | |
| Suspended | No | No | Temporary (long leave, investigation). All sessions ended at once. |
| Deactivated | No | No | Employee exit. Their open items go to the hand-over flow (A2.5). History keeps their name. |
| Anonymised | No | No | P3. After the retention period, personal data is replaced; records keep "Former employee #123". |

### A2.1 Invites (P1)

Invites are sent **from Chandak Workspace**. Any module can trigger one (for example adding an unknown email as a meeting attendee), but every invite goes through the same Admin service.

**Who can invite:** Super Admin, Admin, Company Admin (for their companies), HR Admin. Module admins can invite only *guests* to their module.

**Ways to invite:**
1. Single invite form: email *, full name *, mobile (for WhatsApp/SMS), company *, department *, designation, reporting manager, location, employee code, roles (with scope), welcome note, invite expiry (default 7 days).
2. Bulk invite: upload CSV/XLSX using a template you can download. Steps: map columns, validate, preview errors, then send. Max 1,000 rows per file. Example errors: duplicate email, unknown department, manager not found.
3. Sync from the HRMS or Active Directory (P2). New joiners are invited automatically; exits are deactivated automatically.
4. Domain auto-join (P2): anyone with a verified `@chandakgroup.com` Google/Microsoft account can request access. An admin approves the request, or it is auto-approved with a default role.

**Invite token rules:**
- 32+ random bytes, URL-safe. Store only a SHA-256 hash.
- Single use. Expires after the set days. Resend makes a new token and kills the old one.
- Admin can **Resend**, **Revoke**, **Copy link** (for sending on WhatsApp by hand) or **Change email** before acceptance.
- Reminder emails go out on day 3 and day 6 if the invite is not accepted.

**Accept-invite flow:**
1. User opens the link → sees the company logo, who invited them, and their pre-filled name.
2. They choose a sign-in method: set a password, **or** "Continue with Google / Microsoft" (allowed only if the SSO email matches the invited email).
3. Password rules (A3.2), then accept the Terms and the Privacy notice (version is stored).
4. Optional: set up MFA now (required if their role demands it, see A3.4).
5. Profile step: photo, mobile check by OTP (needed for WhatsApp alerts), language (English / हिन्दी / मराठी), time zone.
6. Land on the Workspace home with a short "what you can do" tour, based on their roles.

**Edge cases:** link already used → "Already accepted, sign in"; link expired → "Ask your admin to resend" plus a one-click "Request new invite" that notifies the inviter; email already active → error, and no second user is created.

### A2.2 Profile (P1)
Users can edit: photo, display name, mobile (re-verified by OTP), language, time zone, date format, notification preferences (A7.4), signature for MoM, out-of-office / leave dates and delegate (links to Meet's leave rule).
Users can't edit: email, employee code, company, department, manager, roles. Only an admin or an HRMS sync changes these.

### A2.3 Admin user management (P1)
**Users list:** search; filters for status, company, department, role, location, last sign-in, MFA on/off; columns are selectable; export to Excel.
**Bulk actions:** assign or remove a role, change department or manager, resend invites, suspend, deactivate, force password reset, force sign-out.
**User detail tabs:** Profile · Roles and scopes · Effective permissions (computed, read-only, "why can they do X?") · Sessions and devices · Sign-in history · Activity (audit) · Assigned items (open points/tasks across modules).
**Impersonate ("View as")** (P2): Super Admin only. Read-only. A red banner shows during it, every page view is audit-logged, and the user can be notified (setting).

### A2.4 Org structure (P1)
Admin screens for companies, locations, departments, designations and holidays (the holiday calendar is per company/location; Meet's TAT uses it). The reporting-manager chain drives escalations (Meet L2/L3) and approvals.

### A2.5 Exit and hand-over (P1)
When a user is deactivated, the admin must pick a **hand-over user**. A preview shows everything that moves: open points, tasks, meetings they organise, pending approvals. The admin confirms, and then the items are reassigned, the activity log is written, and the new owner is notified. Closed history keeps the original names.

---

## A3. Authentication

### A3.1 Sign-in methods
| Method | Phase | Notes |
|---|---|---|
| Email + password | P1 | Default. |
| Google Workspace SSO (OIDC) | P1 if Chandak uses Google mail, else P2 | Restricted to verified domains. |
| Microsoft Entra ID SSO (OIDC) | P1 if Chandak uses Microsoft 365, else P2 | |
| Email OTP / magic link | P1 for guests, optional for staff | Passwordless; code valid 10 min. |
| Mobile OTP (SMS / WhatsApp) | P2 | For plant staff without email. |
| SAML 2.0 | P3 | Only if a future IdP needs it. |

Admins can enforce "SSO only" for a domain. Then password sign-in is turned off for those users, apart from break-glass Super Admin accounts.

### A3.2 Passwords (P1)
- Minimum 10 characters. Check against a breached-password list (k-anonymity API or a bundled top-100k list). No rules that force a mix of character types.
- Hash with Argon2id (or bcrypt cost ≥ 12 if the stack has no Argon2).
- Forgot password: email link, valid 30 min, single use. The response is always "If the account exists, we've sent a link", so it doesn't reveal which emails are registered.
- After a password change: end all other sessions and send a "Your password was changed" email.
- Optional expiry (off by default). Password history: the last 5 can't be reused.

### A3.3 Brute-force protection (P1)
- 5 failed attempts → 15-minute lock on that account. Every further fail doubles the lock time. Notify the user by email.
- Rate limit per IP (20 / min on auth endpoints). After 3 fails, show a CAPTCHA.
- Admin can unlock an account from the user detail screen.

### A3.4 Multi-factor authentication
- TOTP authenticator app (P1), plus 10 one-time recovery codes.
- Email OTP as a fallback factor (P1).
- WebAuthn / passkeys (P2).
- Policy (per role): **Required** for Super Admin, Admin, Management, Finance and Board roles; **Optional** for everyone else; admins can make it group-wide.
- "Trust this device for 30 days" (setting).
- Admin can reset a user's MFA. The reset is audit-logged and the user is emailed.

### A3.5 Sessions and tokens (P1)
- Web: secure, HttpOnly, SameSite=Lax cookie session. Or short-lived access token (15 min) plus a rotating refresh token (7 days, revoked on reuse).
- Idle timeout 30 min (configurable). Absolute timeout 12 h. "Remember me" makes it 30 days on trusted devices.
- Users see their active sessions (device, browser, city from IP, last active) and can sign out any or all.
- New-device sign-in → email alert "New sign-in to Chandak Workspace from Chrome on Windows, Nagpur".
- Admin "Force sign-out" ends all of a user's sessions at once.
- Mobile/PWA uses the same tokens. Push-notification tokens are stored per device and removed on sign-out.

### A3.6 Access rules (P2)
- IP allow-list for admin roles (optional).
- Allowed sign-in hours per role (optional, e.g. plant staff 07:00–22:00).
- Country restriction (default India only, with an exception list).

---

## A4. Authorisation (RBAC + scope + policies)

### A4.1 Model
```
User ──< UserRole >── Role ──< RolePermission >── Permission (module.resource.action)
              │
              └── scope: {type: group|company|department|location|own, ids: [...]}
Policy (optional) attaches a condition to a RolePermission.
```
- A user can hold **many roles**, each with its own scope. Effective permissions = union of all roles.
- **Deny wins** only for explicit "deny" policies (used rarely, e.g. "Auditors can never export").
- Module-level object roles still apply on top. Meet's *organizer / chair / attendee / owner* come from the record, not from RBAC. The check is: `RBAC allows the action in this scope` **OR** `user has an object role on this record that allows it`. Confidential records are the exception: there only object membership and Super Admin count.

### A4.2 Permission naming
`<module>.<resource>.<action>` where action ∈ `view, create, edit, delete, approve, export, manage, admin`.
Every module registers its permissions in code (a seed file), with a label and description. The Roles screen builds itself from that list, so new modules appear automatically.

Examples:
```
core.user.view / invite / edit / suspend / deactivate / impersonate
core.role.view / manage
core.org.manage            (companies, departments, locations, holidays)
core.settings.manage
core.audit.view / export
core.notification_template.manage
meet.meeting.view / create / edit / delete / export
meet.session.run           (start, attendance, end)
meet.mom.approve / publish
meet.point.view / create / edit / close / reassign
meet.task.view / create / edit / extension.approve
meet.decision.view / create
meet.report.view / export / schedule
meet.admin.manage          (templates, workflow rules, escalation, custom fields, import)
```

### A4.3 Default roles (seeded, editable copies allowed; system roles can't be deleted)
| Role | Default scope | Summary |
|---|---|---|
| **Super Admin** | Group | Everything, including security settings, impersonation and audit export. Keep it to 2 people plus 1 break-glass account. MFA required. |
| **Admin** | Group | Users, roles, org, settings, templates. No impersonation and no security-policy changes. |
| **Company Admin** | Selected companies | User and org management for their companies only. |
| **HR Admin** | Group or company | Invite, edit, deactivate users; org structure; holidays. No module data. |
| **Management** | Group | View everything in every module, all reports and dashboards. MFA required. |
| **Department Head** | Own departments | View all, reassign and approve within their departments. Receives escalations. |
| **Meet Admin** | Group | `meet.*` |
| **Meet User** | Own | Create meetings, take part, manage own items. Given to all staff by default. |
| **Auditor** (read-only) | Selected companies | View plus audit view, with time-boxed access (expires on a date). Explicit deny on delete and export (configurable). |
| **Guest** | One record | Magic-link access to the specific meetings or tasks shared with them. Can't browse or search. |

### A4.4 Roles screen (P1)
- Lists roles with user count, and system/custom labels.
- Role editor: name, description, **permission matrix** (rows = resources grouped by module; columns = View / Create / Edit / Delete / Approve / Export / Manage; tri-state per cell where a policy exists: none / own / scoped / all), default scope, MFA-required toggle, session-timeout override.
- "Clone role", "Compare two roles", "Who has this role".
- Saving a role change asks for confirmation and shows "This affects N users". The change is audit-logged with a before/after diff.

### A4.5 Field-level and data rules (P2)
- Field masking per role (e.g. hide the "Amount involved (₹)" custom field from non-finance roles).
- Export permission is separate from view. Exports are watermarked with the user's name and time.
- Download/print of confidential MoM can be turned off per meeting.

### A4.6 Access requests (P2)
If a user opens something they can't see, show "Request access". The request goes to the record owner or the department head. On approval, they get either object-level access or a time-boxed role.

### A4.7 Access reviews (P3)
A quarterly email to each department head lists their team's roles to confirm or remove. Results are logged.

---

## A5. Groups and teams (P2)
User groups (e.g. "Zone heads", "Plant 2 supervisors") can be used as attendee lists, mention targets (`@zone-heads`) and role assignees. They can be static, or dynamic by rule (department = Sales AND designation contains "Zonal").

---

## A6. Workspace shell (P1)
- Module launcher in the left rail. A user sees only the modules they have any permission in.
- Global search across modules, permission-filtered. It never shows titles of records the user can't open.
- Notification centre (bell): one place for all modules (A7).
- User menu: profile, notification settings, security (password, MFA, sessions), language, theme (light/dark/system), sign out.
- Company switcher, if the user has access to more than one company. It filters dashboards; records keep their company.
- Branding: group logo, colours, login-page image, email header/footer, favicon. Set in Admin › Branding.
- Errors: friendly 403 ("You don't have access. Request access?"), 404 and 500 pages, plus a maintenance-mode page.

---

## A7. Notifications and email alerts

### A7.1 One notification service (P1)
Every module calls `notify(event_key, recipients, payload, priority)`. The service then:
1. resolves recipients (users, roles, groups, record roles), removing deactivated users;
2. checks each user's preferences and quiet hours;
3. renders the template in the user's language;
4. queues delivery per channel and records the status (queued, sent, delivered, opened, bounced, failed);
5. groups low-priority events into digests.

Channels: **in-app** (P1), **email** (P1), **WhatsApp Business API** (P1/P2, template messages pre-approved by Meta), **SMS** (P2, DLT-registered templates for India), **web push / PWA push** (P2), **Microsoft Teams / Google Chat webhook** (P3).

### A7.2 Email delivery (P1)
- Provider: Amazon SES, SendGrid, Zoho ZeptoMail or Microsoft 365 SMTP relay (decide in A13). Send from `noreply@chandakgroup.com` with a reply-to set per event.
- SPF, DKIM and DMARC set up on the sending domain before go-live.
- Bounces and complaints come back by webhook. A hard bounce marks the email as invalid and the admin is alerted.
- Unsubscribe link only for non-essential emails (digests, reminders). Security emails can't be unsubscribed from.
- Reply-by-email (P2): replying "done" or a comment to a task email posts it to the task (same parser as WhatsApp).
- Every email has a plain-text part, a "View in Workspace" button, and no confidential content if the meeting is confidential (just "You have an update in a confidential meeting").

### A7.3 Event catalogue (platform events; Meet events are in B6.7)
| Event key | Recipient | Channels | Can user turn off? |
|---|---|---|---|
| `core.invite.sent` | Invitee | Email (+ WhatsApp if mobile given) | No |
| `core.invite.reminder` | Invitee | Email | No |
| `core.invite.accepted` | Inviter | In-app, email | Yes |
| `core.invite.expired` | Inviter | In-app | Yes |
| `core.welcome` | New user | Email | No |
| `core.password.reset_requested` | User | Email | No |
| `core.password.changed` | User | Email | No |
| `core.mfa.enabled / disabled / reset` | User | Email | No |
| `core.signin.new_device` | User | Email | No |
| `core.account.locked` | User, Admin | Email | No |
| `core.role.changed` | User | In-app, email | Yes |
| `core.account.suspended / deactivated` | User's manager, HR Admin | Email | No |
| `core.handover.assigned` | New owner | In-app, email | No |
| `core.access_request.*` | Approver / requester | In-app, email | Yes |
| `core.export.ready` | Requester | In-app, email | Yes |
| `core.digest.daily` (08:30) / `weekly` (Mon 08:00) | All users | Email | Yes |

### A7.4 User preferences (P1)
A grid of event group × channel with checkboxes. Mandatory cells are locked. Quiet hours (default 21:00–08:00, WhatsApp/SMS held until morning; critical escalations bypass if the admin allows). "Pause all non-critical for N days". Digest frequency: off / daily / weekly.

### A7.5 Template management (P1 basic, P2 editor)
Admin › Email templates: list by event and language; editor with subject, HTML body with merge fields (`{{user.first_name}}`, `{{meeting.title}}`, `{{link}}`), a live preview with sample data, "Send test to me", and version history with rollback. WhatsApp templates are shown read-only with their Meta approval status.

### A7.6 Delivery log (P1)
Admin › Notifications › Log: search by user, event, channel, status and date. Shows the rendered message, the provider ID, and when it was delivered or opened. Admins can resend from here.

---

## A8. Admin console (sections)
1. **Users** (A2.3) · 2. **Invites** (pending, expired, accepted; resend/revoke) · 3. **Roles and permissions** (A4.4) · 4. **Groups** (5) · 5. **Organisation**: companies, locations, departments, designations, holidays · 6. **Security**: password policy, MFA policy, session timeouts, SSO setup, IP allow-list, allowed domains · 7. **Notifications**: channels setup, templates, delivery log, quiet hours default · 8. **Branding** · 9. **Audit log** (10) · 10. **Data**: retention, backups status, exports, imports · 11. **Integrations**: SSO, email provider, WhatsApp, SMS, calendar, HRMS, API keys and webhooks · 12. **Modules**: switch modules on or off, and set module-level settings (links to Meet Admin).

---

## A9. Data model (core tables)

```
core_groups(id, name, logo_url, settings_json)
core_companies(id, group_id, name, short_code, gstin, address, fy_start_month, logo_url, active)
core_locations(id, company_id, name, type[ho|plant|branch|depot], city, state, active)
core_departments(id, group_id, company_id?, name, head_user_id?, parent_id?, active)
core_designations(id, name, level)
core_holidays(id, company_id?, location_id?, date, name, type[national|regional|optional])

core_users(id, group_id, email UNIQUE, email_verified_at, mobile, mobile_verified_at,
  full_name, display_name, photo_url, employee_code, company_id, department_id,
  designation_id, location_id, manager_id → core_users, user_type[internal|guest],
  status[invited|active|suspended|deactivated|anonymised], language, time_zone,
  last_login_at, created_at, created_by, deactivated_at, handover_user_id)
core_user_credentials(user_id PK, password_hash, password_set_at, password_history_json,
  failed_attempts, locked_until)
core_user_identities(id, user_id, provider[google|microsoft|saml], subject, email, linked_at)
core_mfa_factors(id, user_id, type[totp|email|webauthn], secret_encrypted, label,
  created_at, last_used_at)
core_mfa_recovery_codes(id, user_id, code_hash, used_at)
core_sessions(id, user_id, created_at, last_seen_at, expires_at, ip, user_agent, device_label,
  city, trusted_until, revoked_at, revoked_reason)
core_invites(id, email, full_name, company_id, department_id, roles_json, invited_by,
  token_hash, status[pending|accepted|expired|revoked], expires_at, accepted_at,
  reminders_sent, source[single|bulk|hrms|module], source_ref)
core_password_resets(id, user_id, token_hash, expires_at, used_at, ip)
core_terms_acceptance(user_id, doc[terms|privacy], version, accepted_at, ip)

core_modules(key PK, name, enabled, icon, sort)
core_permissions(key PK, module_key, resource, action, label, description, is_sensitive)
core_roles(id, name, description, is_system, mfa_required, session_timeout_min, created_by)
core_role_permissions(role_id, permission_key, effect[allow|deny], policy_json?)
core_user_roles(id, user_id, role_id, scope_type[group|company|department|location|own],
  scope_ids[], valid_from, valid_to?, granted_by, granted_at)
core_user_groups(id, name, type[static|dynamic], rule_json?)
core_user_group_members(group_id, user_id)
core_access_requests(id, user_id, resource_type, resource_id, reason, status, decided_by, decided_at)

core_notification_events(key PK, module_key, label, default_channels[], mandatory, priority)
core_notification_templates(id, event_key, channel, language, subject, body, version,
  is_active, updated_by, updated_at, provider_template_id?)
core_notification_prefs(user_id, event_key, channel, enabled)
core_notification_settings(user_id, quiet_from, quiet_to, digest[off|daily|weekly], paused_until)
core_notifications(id, user_id, event_key, title, body, link, payload_json, read_at, created_at)
core_deliveries(id, notification_id, channel, to_address, status[queued|sent|delivered|opened|bounced|failed],
  provider_msg_id, error, attempts, sent_at, delivered_at, opened_at)
core_push_tokens(id, user_id, platform, token, created_at, last_used_at)

core_audit_log(id, at, actor_user_id, actor_ip, impersonator_id?, module_key, entity_type,
  entity_id, action, before_json, after_json, channel[web|mobile|email|whatsapp|api|system],
  request_id)  -- append-only; no UPDATE/DELETE grants
core_api_keys(id, name, key_hash, scopes[], created_by, last_used_at, expires_at, revoked_at)
core_settings(key PK, value_json, updated_by, updated_at)
core_files(id, owner_module, entity_type, entity_id, name, mime, size, storage_key,
  uploaded_by, uploaded_at, virus_scan_status)
```

Meet's `meet_*` tables reference `core_users`, `core_companies`, `core_departments` and `core_holidays`. They do **not** keep their own user list.

---

## A10. Audit and compliance (P1)
- Append-only audit of every create, update, delete, status change, permission change, sign-in, sign-out, failed sign-in, export, impersonation and settings change. Each entry records before and after values.
- Audit screen: filters for user, module, entity, action and date. The before/after diff is viewable. Export is allowed only with `core.audit.export`.
- Retention: audit 8 years (matches Companies Act record keeping); sign-in logs 2 years; notifications 1 year. Configurable.
- **DPDP Act 2023 (India):** privacy notice at first sign-in; purpose of each personal field documented; a user can download their own data (P2); a deletion/anonymisation request flow (P3); a named grievance officer shown in the footer.

---

## A11. Security baseline (P1 unless marked)
- HTTPS only with HSTS. Secure headers: CSP, X-Frame-Options DENY, Referrer-Policy and Permissions-Policy.
- CSRF protection on cookie sessions. Input validation on the server. Parameterised queries only.
- Secrets in environment/secret manager, never in the repo. MFA secrets and OAuth tokens encrypted at rest.
- File uploads: type allow-list, 25 MB limit (configurable), virus scan (ClamAV) before download is allowed, files served from a separate domain or with `Content-Disposition: attachment`.
- Rate limits per user and per IP on all APIs. API keys are scoped and expire.
- Daily encrypted backups, 30-day retention, a restore drill every quarter (P2).
- OWASP ASVS Level 2 checklist before go-live. Dependency scanning in CI.
- Error responses never leak stack traces. Logs never contain passwords, tokens or OTPs.

---

## A12. API (core)
```
POST /auth/login                 {email, password} → {mfa_required, challenge_id} | session
POST /auth/mfa/verify            {challenge_id, code, trust_device}
POST /auth/logout                POST /auth/logout-all
GET  /auth/sso/:provider/start   GET /auth/sso/:provider/callback
POST /auth/password/forgot       POST /auth/password/reset {token, new_password}
GET  /invites/:token             POST /invites/:token/accept {password | sso, profile}
GET  /me                         → user, roles, effective permissions, modules, prefs
PATCH /me                        GET/POST/DELETE /me/mfa  GET/DELETE /me/sessions/:id
GET/PATCH /me/notification-prefs

GET/POST /admin/users            GET/PATCH /admin/users/:id
POST /admin/users/:id/{suspend|reactivate|deactivate|force-logout|reset-mfa|unlock}
GET /admin/users/:id/effective-permissions
POST /admin/invites              POST /admin/invites/bulk (file)  POST /admin/invites/:id/{resend|revoke}
GET/POST /admin/roles            GET/PATCH/DELETE /admin/roles/:id   GET /admin/permissions
POST /admin/users/:id/roles      DELETE /admin/users/:id/roles/:userRoleId
CRUD /admin/{companies|locations|departments|designations|holidays|groups}
GET/PATCH /admin/settings/:key
GET/PUT /admin/notification-templates/:id   POST /admin/notification-templates/:id/test
GET /admin/deliveries            GET /admin/audit   GET /admin/audit/export
GET /notifications               POST /notifications/:id/read   POST /notifications/read-all
```
Every response includes the permission set needed by the UI (`/me`). The client caches it and refreshes it on `core.role.changed`.

---

## A13. Decisions needed (platform)
1. **Email system at Chandak:** Google Workspace or Microsoft 365? This decides the P1 SSO provider and maybe the SMTP relay.
2. **Email sending provider:** SES / SendGrid / ZeptoMail / M365 relay.
3. **WhatsApp Business provider** (Meta Cloud API directly, or a BSP such as Gupshup / Interakt / AiSensy) and who owns the business number.
4. **HRMS:** is there one to sync users from (Keka, greytHR, Zoho People, SAP)? If not, bulk Excel invite is the P1 path.
5. **Who are the Super Admins** (names) and the break-glass account holder.
6. **MFA:** required only for admin/management roles (recommended), or for everyone?
7. **Plant staff without email:** allow mobile-OTP sign-in in P1?
8. **Hosting:** where the workspace runs (AWS Mumbai / Azure India / on-prem). This affects backups and data residency.

---

## A14. Acceptance criteria
1. An admin invites `neha@chandakgroup.com` with the Meet User role. Neha gets the email within 1 minute, sets a password, sets up TOTP (her role requires it) and lands on Home, seeing only Meet.
2. The same link opened a second time shows "Already accepted, sign in". A 9-day-old link shows "Expired" and lets her request a new one.
3. Bulk upload of 250 rows with 3 errors shows the 3 errors with row numbers, sends 247 invites, and creates no duplicates.
4. 5 wrong passwords lock the account for 15 minutes and email the user. An admin unlock works at once.
5. A Department Head for Sales can see all Sales meetings and can't open a Finance meeting by URL (403, audit-logged).
6. Removing a role ends that permission within 1 minute for an already signed-in user (no sign-out needed).
7. Deactivating a user forces hand-over of their 12 open items. All 12 move to the chosen user, who is notified once (digest), and history keeps the old owner's name.
8. Every action above appears in the audit log with actor, time, IP and before/after values.
9. A user switches off "Due soon" emails. They still get the in-app notification, and still get mandatory security emails.
10. Email to a hard-bounced address is not retried. The admin sees it in the delivery log with the bounce reason.
11. A confidential-meeting email shows no title or content, only a link.
12. Super Admin "View as" Priya shows a red banner, blocks every write, and writes one audit row per page.

---

## A15. Build order (Part A first, then Part B)
1. Org masters (companies, locations, departments, designations, holidays) and the users table.
2. Auth: password sign-in, sessions, forgot password, lockout, `/me`.
3. RBAC: permission registry, roles, user roles with scope, server-side guard middleware, Roles screen.
4. Invites: single, then bulk; accept flow; invite emails.
5. Notification service: in-app and email first; templates; delivery log; preferences.
6. Admin console: Users, Invites, Roles, Org, Security, Audit.
7. MFA (TOTP + recovery codes) and the per-role MFA policy.
8. SSO (Google or Microsoft, whichever Chandak uses).
9. Then start Chandak Meet (B12), using `notify()`, `can()` and `core_users` everywhere.
10. P2: WhatsApp and SMS channels, HRMS sync, access requests, impersonation, field masking, passkeys.

---

# PART B: Chandak Meet module

## B0. Product goal

Chandak Group is replacing Zoho for meeting management. Chandak Meet must do everything the group uses Zoho for today, across Zoho Meeting, Zoho Projects (tasks), Zoho Tables/Creator-style MoM trackers, Zoho Calendar and Zoho Cliq AI summaries. It must also go further on what Zoho is weak at: **closing the loop on every point raised in a meeting**.

What success looks like:
1. Every recurring review in the group (sales, finance, IT, plant, HR, board) runs in Chandak Meet. Nobody keeps MoM in Excel, WhatsApp or Zoho.
2. Every point raised has an owner, a TAT and a status, and it keeps coming back as a backup point until it's closed.
3. Management can see, in one screen, what is overdue, who is slipping, and which issues keep getting carried forward.
4. Zoho subscriptions for meeting/MoM/task tracking can be cancelled after migration.

---

## B1. Zoho feature parity map

Sources reviewed (Oct 2026): [Zoho Meeting pricing and features](https://www.zoho.com/meeting/pricing.html), [Zoho Meeting review](https://zeeg.me/post/zoho-meeting-review), [Zoho Projects features](https://prezohoweb.zoho.com/projects/features.html), [Zoho Tables meeting minutes guide](https://www.zoho.com/tables/articles/how-to-organize-meeting-minutes-using-Zoho-Tables.html), [Zoho Cliq AI](https://www.zoho.com/cliq/ai.html).

Phase key: **P1** = MVP go-live, **P2** = full Zoho parity, **P3** = beyond Zoho. Section numbers point to where each feature is specified.

### B1.1 Meetings and scheduling (Zoho Meeting, Zoho Calendar)
| Zoho capability | Chandak Meet | Phase | Spec |
|---|---|---|---|
| Schedule meeting, email invites, add to calendar | Yes, with `.ics` invite and two-way Google/Outlook sync | P1 / P2 | 6.1, 9 |
| Recurring meetings | Yes: daily, weekly, every 2 weeks, monthly (by date or "2nd Monday"), custom | P1 | 6.1 |
| Multiple email reminders | Yes: email, in-app, WhatsApp, SMS | P1 / P2 | 6.7 |
| Personal meeting room | Yes: personal standing link per user | P2 | 6.1 |
| Calendar view | Yes: day, week, month, agenda; room and person views | P1 / P2 | 7.10 |
| Instant meeting | Yes: "Meet now" creates a session and opens Live mode | P2 | 6.2 |
| Availability / free-busy | Yes: suggests a time when required attendees and the room are free | P2 | 6.1 |
| Meeting rooms | Yes: room master, booking, clash check | P2 | 4.9 |
| Departments, multiple portals | Yes: companies → departments → meetings | P1 | 4.1 |

### B1.2 In-meeting (Zoho Meeting)
| Zoho capability | Chandak Meet | Phase | Spec |
|---|---|---|---|
| Video, audio, screen share, whiteboard, chat, breakout rooms, remote control | **Decision needed** (see B13, item 1). Default: integrate Google Meet / Teams / Zoom links (P1); optional self-hosted Jitsi or LiveKit video inside Chandak Meet (P3) | P1 / P3 | 6.2 |
| Polls | Yes: polls and formal votes on resolutions, with quorum | P2 | 6.5 |
| Co-hosts, moderator controls | Yes: organizer, co-organizers, minute taker, chairperson | P1 | 3 |
| Share PDFs/PPTs | Yes: pre-reads attached to agenda items, shown in Live mode | P1 | 6.3 |
| Lock meeting / passwords | Yes for video (P3); minutes can be marked Confidential (P2) | P2 | 10 |

### B1.3 Recording, transcription, AI (Zoho Meeting, Zia, Cliq AI)
| Zoho capability | Chandak Meet | Phase | Spec |
|---|---|---|---|
| Recording with cloud storage | Upload recording or audio (any meeting); auto-record if built-in video is chosen | P2 / P3 | 6.8 |
| Transcripts | Yes: English, Hindi, Marathi, mixed "Hinglish" | P3 | 6.8 |
| AI keynotes / summaries (key points, tasks, decisions) | Yes: AI drafts the **MoM in Chandak format**, proposes points, owners, TATs and decisions for the minute taker to accept | P3 | 6.8 |

### B1.4 Minutes and action items (Zoho Tables/Creator trackers, Zoho Projects)
| Zoho capability | Chandak Meet | Phase | Spec |
|---|---|---|---|
| Agenda with presenters | Yes: time-boxed agenda, presenters, pre-reads, Live-mode timer | P1 | 6.3 |
| Comments per discussion point | Yes: per-session discussion notes plus threaded comments with @mentions | P1 | 6.4 |
| Minutes document | Yes: MoM generated from data (no typing twice), PDF on letterhead, approval and sign-off | P1 / P2 | 6.6 |
| Action items with owner and due date | Yes: tasks with TAT in working days, supporters, priority | P1 | 5 |
| Kanban view of action items | Yes | P1 | 7.8 |
| Automated reminders for open tasks | Yes: due-soon, overdue digest, escalation matrix | P1 / P2 | 6.7 |
| Dashboards | Yes: personal, meeting, department, group management dashboards | P1 / P2 | 8 |
| Subtasks, dependencies, recurring tasks | Yes | P2 | 5.3 |
| Custom fields, custom statuses, layouts, templates, tags | Yes | P2 | 4.10 |
| Blueprints / workflow rules / SLA escalation | Yes: no-code rules ("when X, then Y") and SLA escalation | P2 | 6.10 |
| Timers and timesheets | Yes: optional time log on tasks | P2 | 5.3 |
| Mentions, activity feed, document versioning | Yes | P1 / P2 | 4.7 |
| Client / external users | Yes: guest access for external attendees (view MoM, update their own tasks) | P2 | 3 |

### B1.5 Platform (Zoho Meeting/Projects admin)
| Zoho capability | Chandak Meet | Phase | Spec |
|---|---|---|---|
| Roles, profiles, user management | Yes: reuse workspace users and roles, module permissions | P1 | 3 |
| Analytics / advanced reports | Yes: 15 standard reports plus a custom report builder | P1 / P2 | 8 |
| API, webhooks, integrations | Yes: REST API, webhooks, Workspace module hooks | P2 | 9 |
| Mobile apps | Yes: responsive web and installable PWA with offline minutes | P1 / P2 | 10 |
| Import from other tools | Yes: **Zoho migration wizard** (CSV/XLSX exports) | P2 | 11 |
| 2FA, encryption | Inherit workspace auth; encrypt files at rest | P1 | 10 |

### B1.6 Beyond Zoho (why we win)
These are things Zoho doesn't do, or does poorly, for how Chandak Group runs reviews.

1. **Backup points that never get lost.** Open points carry forward automatically, keep their full trail, and are escalated after N carries. Zoho has no concept of a point that spans sessions.
2. **TAT in working days** with company holidays and a Mon to Sat week, plus a TAT compliance score per person and per department.
3. **Pre-meeting updates.** Before each session, owners get a WhatsApp/email asking for a one-line update on each open point. The organizer sees who has updated and who hasn't, and the meeting starts from facts.
4. **Live meeting mode.** A full-screen run sheet: agenda timer, the current point, quick status and task capture, and a "parked" list.
5. **Decision register.** Every decision across all meetings, searchable, with who decided and when. It's linked to the point and to any later decision that replaced it.
6. **Board and committee mode.** Quorum, resolutions, formal voting, statutory minutes numbering, chairperson sign-off, and a minutes book.
7. **MoM approval and acknowledgement.** The chair approves, then attendees acknowledge in one tap, and the acknowledgement is recorded.
8. **WhatsApp-first follow-up.** Owners can reply "done", "50%" or "need 2 days" on WhatsApp. That updates the task or raises an extension request.
9. **Escalation matrix.** Overdue items go to the owner, then the reporting manager, then the department head, then management. Each level has its own day count.
10. **Delegation and leave-aware reassignment.** It reads leave from Workspace HR. When an owner is on leave, their items show a delegate, and the organizer is prompted to reassign.
11. **Meeting effectiveness.** Time used vs planned, points closed per session, % of attendees prepared, and the cost of the meeting (attendees × hourly cost, optional).
12. **AI MoM in Indian languages.** Upload audio and get a structured MoM draft with points, owners and TATs.
13. **One search box.** Searches every meeting, point, task, decision, comment and attachment.
14. **Cross-meeting point linking.** A point raised in IT Steering can be linked to, or escalated into, the Management Review, with both trails kept.

---

## B2. Glossary

| Term | Meaning |
|---|---|
| Company | A Chandak Group entity. Meetings, departments and reports can be filtered by company. |
| Meeting (series) | The definition: title, type, recurrence, default attendees, template. Example: "Weekly Sales Review". |
| Session | One occurrence of a meeting. Example: "Weekly Sales Review, 26 Oct 2026". |
| Agenda item | A planned item for a session with presenter, time box and pre-reads. |
| Point | A discussion item, issue, decision, action or information item raised in a session. Can span many sessions through carry-forward. |
| Backup point | An open point carried forward from an earlier session. |
| Task | An action item under a point, with an owner, TAT and due date. Can have subtasks and a checklist. |
| TAT | Turnaround time in working days (or hours), resolved to a due date using the working calendar. |
| Decision | A recorded decision, held in the decision register. |
| Resolution | A formal motion voted on in board/committee mode. |
| MoM | Minutes of Meeting, generated from session data. |
| Pre-meeting update | An owner's status update on an open point, collected before a session. |

---

## B3. Roles and permissions

These are meeting-level roles taken from each record. They sit on top of the Part A RBAC roles (A4.1). An action is allowed if RBAC allows it in the user's scope, **or** their meeting role on that record allows it. Confidential meetings go by membership only. Permissions are checked server-side on every call.

| Role | Can do |
|---|---|
| **Meet Admin** | Everything, including masters, templates, workflow rules, custom fields, escalation matrix, migration, data retention. |
| **Management viewer** | Read-only across all companies/departments, plus all dashboards and reports. |
| **Department head** | Read-only on all meetings, points and tasks of their departments. Receives escalations. Can reassign within their department. |
| **Organizer** | Create/edit meetings and sessions, manage attendees, run Live mode, edit any point or task in their meetings, approve TAT extensions, publish MoM. |
| **Co-organizer** | Same as organizer, but can't delete or archive the meeting. |
| **Chairperson** (optional, per meeting) | Approves MoM, casts a deciding vote in board mode. |
| **Minute taker** | Same as organizer within a session, but can't publish MoM if approval is required. |
| **Attendee** | View their meetings, add points if allowed, comment, give pre-meeting updates, vote, acknowledge MoM. |
| **Owner / supporter** | Update status, progress, remarks and attachments on their own items; request extensions; delegate (if allowed). |
| **Guest** (external) | Magic-link access to one meeting: view the published MoM and update only the tasks assigned to them. |

Visibility rule: a user sees a meeting if they are its organizer, co-organizer, chair, minute taker, attendee, an owner/supporter of an item in it, the head of its department, a management viewer, or an admin. **Confidential** meetings (board, HR disciplinary) are visible only to named members and admins, and are excluded from global search for everyone else.

---

## B4. Data model

Prefix tables with `meet_` (or follow repo convention). Every table has `id`, `created_at`, `updated_at`, `created_by`, `updated_by`, and `deleted_at` if the workspace uses soft deletes. Store times in UTC.

### B4.1 Organisation and masters
- **meet_settings** (key/value per company): `tat_unit`, `working_days` (e.g. `[1,2,3,4,5,6]`), `business_day_end` (18:00), `exclude_holidays`, `due_soon_working_days` (1), `carry_escalation_count` (3), `auto_carry_forward`, `mom_requires_approval`, `mom_ack_required`, `pre_update_hours_before` (24), `default_timezone` (Asia/Kolkata), `hourly_cost_enabled`.
- **meet_holidays**: `company_id`, `date`, `name`. Reuse the workspace holiday master if there is one.
- **meet_meeting_types**: `name`, `color`, `is_board_mode` (bool), `default_template_id`.
- **meet_point_categories**: `name`, `default_tat_days`, `department_id` (nullable).
- **meet_rooms**: `name`, `location`, `capacity`, `facilities` (json: projector, VC), `is_active`.
- **meet_templates**: `name`, `meeting_type_id`, `default_duration`, `agenda_items` (json list of {title, minutes, presenter_role}), `default_members` (json), `checklist` (json), `point_categories` (json), `mom_layout` (json). Built-in templates: Weekly Sales Review, Monthly MIS Review, Board Meeting, IT Steering, Plant Safety Review, HR Committee, Project Kick-off, Client Meeting, One-on-One.

### B4.2 Meetings (series)
**meet_meetings**: `code` (MTG-0001), `title`, `description`, `company_id`, `department_id`, `meeting_type_id`, `template_id`, `organizer_id`, `chair_id`, `default_minute_taker_id`, `mode` (in_person | online | hybrid), `room_id`, `venue_text`, `video_provider` (none | google_meet | teams | zoom | builtin), `video_link`, `default_start_time`, `default_duration_minutes`, `recurrence` (none | daily | weekly | biweekly | monthly | custom), `recurrence_rule` (RRULE string), `recurrence_end_date`, `allow_attendees_add_points`, `is_confidential`, `requires_mom_approval` (overrides setting), `pre_update_enabled`, `status` (active | paused | archived), `tags` (via 4.10).

**meet_meeting_members**: `meeting_id`, `user_id`, `role` (organizer | co_organizer | chair | minute_taker | required | optional | guest), `guest_name`, `guest_email`, `guest_phone`.

### B4.3 Sessions
**meet_sessions**: `meeting_id`, `session_no`, `code` (MTG-0001/S-005), `scheduled_start`, `scheduled_end`, `actual_start`, `actual_end`, `room_id`, `video_link`, `minute_taker_id`, `status` (scheduled | in_progress | completed | mom_draft | mom_pending_approval | mom_published | cancelled), `previous_session_id`, `summary_notes` (rich text), `quorum_required` (int, board mode), `quorum_met` (bool), `cancel_reason`, `reschedule_count`, `mom_version`, `mom_published_at`, `mom_published_by`, `effectiveness_score` (computed, 0 to 100), `cost_estimate` (computed).

**meet_session_attendees**: `session_id`, `user_id` / guest fields, `role`, `invite_status` (invited | accepted | declined | tentative), `attendance` (present | late | absent | excused | left_early), `check_in_at`, `check_in_method` (manual | qr | video_join), `proxy_for_user_id`.

**meet_agenda_items**: `session_id`, `title`, `description`, `presenter_id`, `planned_minutes`, `actual_minutes`, `sort_order`, `status` (pending | discussed | deferred), `linked_point_id`.

**meet_pre_updates**: `session_id`, `point_id` (or `task_id`), `user_id`, `status_proposed`, `progress_proposed`, `text`, `submitted_at`, `channel` (web | whatsapp | email).

### B4.4 Points
**meet_points**: `code` (PT-00001), `meeting_id`, `origin_session_id`, `current_session_id`, `agenda_item_id`, `title`, `description`, `point_type` (discussion | decision | action | issue | information | risk), `category_id`, `department_id`, `priority` (low | medium | high | critical), `owner_id`, `raised_by_id`, `tat_days`, `due_date`, `status` (open | in_progress | on_hold | closed | dropped | reopened, or a custom status, see B4.10), `progress_percent`, `closure_remarks`, `closed_at`, `closed_by`, `carry_forward_count`, `is_backup`, `is_confidential`, `escalation_level` (0 to 4), `linked_point_ids` (via `meet_point_links`), `sort_order`.

**meet_session_points**: `session_id`, `point_id`, `entry_type` (new | carried_forward | pulled | escalated_in), `status_at_start`, `status_at_end`, `discussion_notes`, `time_spent_minutes`, `sort_order`.

**meet_point_links**: `from_point_id`, `to_point_id`, `link_type` (related | escalated_to | duplicate_of | blocked_by).

### B4.5 Tasks
**meet_tasks**: `code` (TSK-00001), `point_id`, `session_id`, `parent_task_id` (subtasks), `title`, `description`, `owner_id`, `priority`, `tat_days`/`tat_hours`, `start_date`, `due_date`, `revised_due_date`, `status` (not_started | in_progress | on_hold | completed | cancelled, or custom), `progress_percent`, `completed_at`, `tat_result` (within_tat | breached), `delay_days`, `completion_remarks`, `requires_verification` (bool), `verified_by`, `verified_at`, `recurrence_rule` (recurring tasks), `estimated_hours`, `logged_hours`, `delegated_to_id`, `reminder_rule`.

- **meet_task_supporters**: `task_id`, `user_id`.
- **meet_task_checklist**: `task_id`, `text`, `is_done`, `done_by`, `done_at`, `sort_order`.
- **meet_task_dependencies**: `task_id`, `depends_on_task_id`, `type` (finish_to_start).
- **meet_time_logs**: `task_id`, `user_id`, `date`, `hours`, `note`.
- **meet_tat_extensions**: `entity_type` (task | point), `entity_id`, `requested_by`, `old_due_date`, `requested_due_date`, `reason`, `status` (pending | approved | rejected), `decided_by`, `decided_at`, `remarks`, `channel`.

### B4.6 Decisions, resolutions and votes
- **meet_decisions**: `code` (DEC-0001), `session_id`, `point_id`, `text`, `decided_by` (user or "Committee"), `decided_at`, `effective_from`, `review_date`, `status` (active | superseded | revoked), `superseded_by_id`, `tags`.
- **meet_resolutions** (board mode): `code` (RES/2026-27/014), `session_id`, `point_id`, `title`, `text`, `proposed_by`, `seconded_by`, `type` (ordinary | special | circular), `result` (passed | failed | deferred), `votes_for`, `votes_against`, `abstain`.
- **meet_votes**: `resolution_id` or `poll_id`, `user_id`, `choice`, `cast_at`, `is_proxy`.
- **meet_polls**: `session_id`, `question`, `options` (json), `is_anonymous`, `closes_at`.

### B4.7 Collaboration, files and audit
- **meet_comments**: `entity_type` (session | point | task | decision), `entity_id`, `user_id`, `body` (with @mentions), `parent_comment_id`.
- **meet_attachments**: `entity_type`, `entity_id`, file ref (workspace upload service), `file_name`, `mime`, `size`, `version`, `uploaded_by`, `is_pre_read`.
- **meet_recordings**: `session_id`, file ref, `duration_sec`, `language`, `transcript_status`, `transcript` (text/json with speakers and timestamps), `ai_summary` (json).
- **meet_mom_versions**: `session_id`, `version`, `snapshot` (json), `pdf_file_ref`, `status` (draft | pending_approval | approved | published), `approved_by`, `approved_at`.
- **meet_mom_acknowledgements**: `session_id`, `mom_version`, `user_id`, `acknowledged_at`, `channel`, `comment`.
- **meet_activity_log**: `entity_type`, `entity_id`, `action`, `field`, `old_value`, `new_value`, `user_id`, `ip`, `channel` (web | mobile | whatsapp | email | api | system), `created_at`. Log **every** change. This table is append-only.

### B4.8 Notifications and escalation
- **meet_notifications**: `user_id`, `type`, `entity_type`, `entity_id`, `title`, `body`, `channel`, `sent_at`, `read_at`, `status`.
- **meet_notification_prefs**: `user_id`, `type`, `channels` (json: in_app, email, whatsapp, sms), `digest` (instant | daily).
- **meet_escalation_matrix**: `company_id`, `department_id` (nullable), `level` (1 to 4), `notify_role` (owner | reporting_manager | department_head | management | custom_user), `after_overdue_days`, `channels`.

### B4.9 Rooms
- **meet_room_bookings**: `room_id`, `session_id`, `start`, `end`, `status`. Clash check on save.

### B4.10 Customisation
- **meet_custom_fields**: `entity` (meeting | point | task), `key`, `label`, `type` (text | number | date | select | multi_select | user | currency | checkbox), `options`, `required`, `department_id` (scope).
- **meet_custom_field_values**: `entity`, `entity_id`, `field_id`, `value`.
- **meet_custom_statuses**: `entity` (point | task), `key`, `label`, `color`, `maps_to` (one of the system statuses, so reports still work), `sort_order`.
- **meet_tags**, **meet_entity_tags**.
- **meet_workflow_rules**: `name`, `entity`, `trigger` (created | status_changed | overdue | due_soon | field_changed | carried_forward | mom_published), `conditions` (json), `actions` (json: notify, set_field, reassign, create_task, webhook, escalate), `is_active`.
- **meet_saved_views**: `user_id`, `entity`, `filters`, `columns`, `layout` (table | kanban | calendar | gantt), `is_shared`.

### B4.11 Integrations
- **meet_calendar_links**: `user_id`, `provider` (google | microsoft), `tokens` (encrypted), `sync_state`.
- **meet_webhooks**: `url`, `events`, `secret`, `is_active`.
- **meet_import_jobs**: `source` (zoho_projects | zoho_tables | zoho_creator | excel), `file_ref`, `mapping` (json), `status`, `stats`, `errors`.

### B4.12 Relationships (summary)
```
company 1─* department 1─* meet_meetings 1─* meet_sessions 1─* meet_session_attendees
meet_meetings 1─* meet_meeting_members           meet_sessions 1─* meet_agenda_items
meet_meetings 1─* meet_points *─* meet_sessions (via meet_session_points)
meet_points 1─* meet_tasks 1─* subtasks / checklist / time logs / extensions
meet_points 1─* meet_decisions        meet_sessions 1─* meet_resolutions 1─* meet_votes
meet_sessions 1─* meet_pre_updates, meet_recordings, meet_mom_versions 1─* meet_mom_acknowledgements
any entity 1─* comments, attachments, activity log, custom field values, tags
```

---

## B5. Statuses, TAT and task rules

### B5.1 Status sets
- **Session:** `scheduled → in_progress → completed → mom_draft → (mom_pending_approval →) mom_published`; `scheduled → cancelled`. A reschedule keeps the row, logs it and increments `reschedule_count`.
- **Point:** `open`, `in_progress`, `on_hold` (remarks required), `closed` (closure remarks required), `dropped` (reason required), `reopened`. Only the organizer or an admin can reopen.
- **Task:** `not_started`, `in_progress`, `on_hold`, `completed`, `cancelled`. If `requires_verification`, then completed → `pending_verification` → verified (counts as completed) or sent back to `in_progress`.
- **Derived flags** (never stored as status): `overdue`, `due_soon`, `repeatedly_carried`, `escalated (level n)`.
- Custom statuses (B4.10) always map to one system status.

### B5.2 TAT → due date
```
due_date = add_working_time(start_date, tat)
  working days     = settings.working_days (default Mon–Sat)
  skip holidays    = settings.exclude_holidays
  day-based TAT    = ends at settings.business_day_end
  hour-based TAT   = counts business hours only (default 09:30–18:00)
```
- The task default TAT comes from the category; the user can override it.
- An effective due date is `revised_due_date ?? due_date`.
- On completion: `tat_result = completed_at <= effective_due ? within_tat : breached`, and `delay_days = working_days_between(effective_due, completed_at)`.
- Any due-date change, other than an approved extension, needs a reason and is logged.

### B5.3 Task capabilities (P2 unless marked)
- **Subtasks**: one level deep. A parent can't complete while subtasks are open (with a confirm-and-cancel option).
- **Checklist** inside a task, with progress shown as checked items over total items.
- **Dependencies**: finish-to-start. A dependent task's start date shifts if its blocker slips, and the owner is notified.
- **Recurring tasks**: e.g. "Submit weekly collection report every Monday". Each occurrence is its own task with its own TAT result.
- **Verification**: the organizer verifies completion before it counts as closed (optional per task).
- **Time logs**: optional hours per task, with a weekly timesheet view.
- **Delegation**: the owner delegates to someone (if allowed). The original owner stays accountable in reports.
- **Bulk actions** (P1): select many and change status, owner, due date or priority.

### B5.4 Point rules
- A point can't be `closed` while it has open tasks, unless the user confirms "close and cancel open tasks", which is logged.
- A point of type `decision` must have a decision text before closing, and it creates a `meet_decisions` row.
- A `risk` point has a likelihood × impact score (custom fields) and shows on the risk heat map.

---

## B6. Core workflows

### B6.1 Scheduling
1. Create a meeting from a **template** (agenda, members, duration and categories are pre-filled) or from scratch.
2. **Smart time finder** (P2): shows the free/busy of required attendees (from calendar sync) and room availability, and suggests the next 3 slots.
3. **Room booking** (P2): pick a room; clashes are blocked.
4. **Video link**: paste a link, or auto-create a Google Meet / Teams / Zoom link when the integration is connected (P2), or use built-in video (P3, see B13, item 1).
5. **Recurrence**: sessions are generated lazily. The next session is created when the current one is completed, or on the scheduler 7 days ahead.
6. **Invites**: email with `.ics` (P1); calendar event on synced calendars (P2); WhatsApp invite (P2). RSVP buttons write `invite_status`.
7. **Reschedule / cancel**: notify everyone, keep the history, release the room.
8. **Meet now** (P2): creates a one-off session for now and opens Live mode.

### B6.2 Before the meeting
1. **Agenda**: the organizer builds a time-boxed agenda; presenters attach **pre-reads**.
2. **Pre-meeting update request** (P2): `pre_update_hours_before` the session, every owner of an open backup point or task gets one message (in-app + WhatsApp/email). It lists their items, with quick buttons per item: *Done*, *On track %*, *Blocked*, *Need more time*. Replies land in `meet_pre_updates` and show on the session screen as "Updated 2h ago: 70%, waiting on bank".
3. **Readiness panel**: shows who has submitted updates, who has opened the pre-reads, and RSVP counts.
4. **Reminders**: 24h and 1h before (configurable), by email, in-app and WhatsApp.

### B6.3 During the meeting: Live mode (P1 basic, P2 full)
A focused full-screen run sheet for the organizer or minute taker:
- The **agenda timer** shows the current item with planned vs actual minutes and turns amber/red when over time.
- **Attendance**: tap present/late/absent; QR check-in for in-person (P2); auto-mark from video joins (P3).
- **Backup points first**, sorted overdue → critical → due date. For each one: the pre-meeting update, one-tap status, a progress slider, a note for this session, and add task.
- **Quick capture** bar: type a point, `@owner`, `#category` and `3d` (TAT) on one line, then Enter.
- **Parking lot**: items to take up later or move to the next session.
- **Decisions** and **polls/votes** can be captured inline.
- **Autosave** every few seconds; works offline on the PWA and syncs later.
- **End meeting** shows a summary: X points closed, Y carried forward, Z tasks created, agenda overrun of N minutes. Confirming runs carry-forward (B6.4).

### B6.4 Carry-forward (backup points)
On **End meeting** (or a manual "Carry forward" click):
1. Find or create the next session of the same meeting. For a one-off meeting, create a follow-up session (the organizer can change the date).
2. For every point on the closing session whose status isn't closed or dropped: add `meet_session_points (entry_type=carried_forward)` to the next session, update `current_session_id`, increment `carry_forward_count`, set `is_backup=true`, and write the activity log.
3. Set `status_at_end` on the closing session's rows.
4. If `carry_forward_count >= carry_escalation_count`, flag the point as **repeatedly carried** and notify the department head.
5. **Pull backup point**: bring any open point from any earlier session of the same meeting into the current one.
6. **Escalate to another meeting** (P2): send a point to a different meeting (e.g. from IT Steering to Management Review). This creates a linked point there (`escalated_in`) and keeps both trails.

### B6.5 Board and committee mode (P2; turned on by meeting type)
- **Quorum**: the required count is set per session; the session can't record resolutions until quorum is met.
- **Resolutions**: proposed and seconded, then voted on (for / against / abstain), with the chair's casting vote, and the result is recorded. Circular resolutions can be voted on without a meeting.
- **Statutory numbering**: resolution numbers per financial year (RES/2026-27/001).
- **Minutes book**: a sequential, locked PDF of all approved minutes with page numbers and the chair's signature block.
- **Polls**: quick polls for any meeting type, which can be anonymous.

### B6.6 MoM (minutes) lifecycle
1. **Draft** is generated from session data: attendance, agenda, backup points (with status, change since last session and notes), new points, decisions, resolutions, tasks (owner, TAT, due), parking lot, general notes, next session. Nobody types the minutes twice.
2. **AI polish** (P3): rewrites notes into clean minutes language, without changing owners or dates.
3. **Approval** (if required): the chair approves or sends it back with comments. Versions are kept (`meet_mom_versions`).
4. **Publish**: a PDF on company letterhead is emailed and WhatsApped to attendees and all owners. Each owner also gets "Your items from this meeting".
5. **Acknowledgement** (P2): attendees tap "I acknowledge". Missing acknowledgements are chased after 24h.
6. **Corrections** after publishing create a new version with a change note. Older versions stay viewable.

### B6.7 Notifications, reminders and escalation
| Event | Default recipients | Channels |
|---|---|---|
| Invite, reschedule, cancel | Attendees | Email + .ics, in-app, WhatsApp (P2) |
| Session reminder (24h, 1h) | Attendees | Email, in-app, WhatsApp |
| Pre-meeting update request | Owners of open items | WhatsApp, email, in-app |
| Assigned / reassigned / mentioned | The person | In-app, email |
| Due soon (1 working day) | Owner, supporters | In-app, WhatsApp |
| Overdue daily digest, 09:00 | Owner (cc organizer) | Email, WhatsApp |
| Escalation levels 1 to 4 | Per escalation matrix | Email, WhatsApp |
| Extension requested / decided | Organizer / requester | In-app, email |
| MoM pending approval | Chair | In-app, email |
| MoM published | Attendees + owners | Email (PDF), WhatsApp |
| Weekly summary, Monday 08:00 | Department heads, management | Email |

Users set channel preferences per event type (P2). Quiet hours: no WhatsApp between 21:00 and 08:00.

**WhatsApp two-way** (P2, via the WhatsApp Business API provider the group chooses): replies to task messages are parsed. "done" → completed (or pending verification); a number such as "60" → progress 60%; "need 3 days" / "extend 30 Oct" → extension request; anything else → a comment. Each reply is logged with `channel=whatsapp`.

### B6.8 Recording, transcript and AI MoM (P3)
1. Upload audio/video of any meeting (or record automatically with built-in video).
2. Transcribe with speaker labels; supports English, Hindi, Marathi and mixed speech.
3. AI extracts **proposed** points, owners, TATs, decisions and a summary. It maps names to Workspace users.
4. The minute taker reviews each proposal (Accept / Edit / Discard). Nothing is created without a human accepting it.
5. The transcript is searchable and linked from the MoM. Retention follows 10.
6. **Ask Meet** (P3): ask in plain language, e.g. "What did we decide about the Indore distributor?". Answers cite the points and decisions they came from, and respect permissions.

### B6.9 Leave and delegation
- Read approved leave from Workspace HR. On the session screen and in task lists, show "On leave till 30 Oct" against owners.
- If a task falls due during the owner's leave, prompt the organizer to reassign or extend.
- The user can set a standing delegate. Delegated items show both names.

### B6.10 Workflow rules and SLAs (P2)
A no-code builder: **When** (trigger) **If** (conditions on any field, including custom ones) **Then** (actions). Examples shipped as templates:
- When a critical point is created → notify the department head.
- When a task is overdue by 3 days → escalate to level 2.
- When a point is carried forward 3 times → set priority to critical and add it to the Management Review.
- When MoM is published → create a recurring task "Share MIS" for the finance owner.
- When a task's status is completed and the category is Compliance → require verification.

---

## B7. Screens

Top-level navigation inside the Chandak Meet module:
`Home · Meetings · Live · My Work · Calendar · Decisions · Reports · Admin`
plus a global **search** box, a **notifications** bell and a **+ Create** menu (Meeting, Point, Task, Decision) in the top bar.

### B7.1 Home (dashboard)
- KPIs: meetings this week, open points, open tasks, overdue, TAT compliance %, repeatedly carried points, pending MoM approvals, my pending acknowledgements.
- Upcoming sessions, with readiness (updates received / owners).
- My open items, overdue first.
- Charts: points by status, TAT compliance trend, open items by department, overdue ageing (0 to 3, 4 to 7, 8 to 15, more than 15 days).
- **Management view** toggle: company/department heat map (rows are departments, columns are overdue, carried 3+ times, compliance %).

### B7.2 Meetings
List (table or cards), filters (company, department, type, organizer, status, tag), saved views. Actions: New from template, New blank, Pause, Archive, Duplicate.

### B7.3 Create / edit meeting
Template picker → title, type, company, department, organizer, co-organizers, chair, minute taker, attendees (required/optional/guest), mode, room (with availability), video provider/link, date/time, duration, recurrence, confidential, MoM approval, pre-meeting updates, allow attendees to add points, custom fields.

### B7.4 Meeting detail (series)
Header with KPIs. Tabs: **Sessions**, **All points**, **Tasks**, **Decisions**, **Members**, **Files**, **Analytics** (series trend: attendance %, points closed per session, average closure days, carry-forward count), **Activity**, **Settings**.

### B7.5 Session workspace (prepare and review)
Before the meeting: agenda builder, pre-reads, readiness panel (pre-updates and RSVPs), backup point list with updates. After the meeting: MoM draft, approval, publish, acknowledgements.

### B7.6 Live mode
As 6.3: a full-screen layout. Left: agenda with timer. Centre: the current point card with quick actions. Right: attendance, decisions, parking lot. A quick capture bar sits at the bottom.

### B7.7 Point detail (drawer)
Fields, status, owner, TAT/due, progress, tasks (with subtasks), session history timeline, pre-meeting updates, decisions, linked points, comments with @mentions, attachments with versions, activity log. Actions: close, drop, reopen, escalate to meeting, link, extension.

### B7.8 Create task (modal) and Task detail (drawer)
Create: title, description, meeting → point, owner, supporters, priority, start date, TAT → live due date preview (it says how many non-working days were skipped), reminder, checklist, dependencies, recurring, requires verification, attachments.
Detail: everything above plus extensions, time logs, verification, activity.

### B7.9 My Work
Tabs: Overdue, Due soon, Open, Waiting on me (verification/approvals/acknowledgements), Completed. Views: **List**, **Kanban** (by status, drag to change), **Calendar** (by due date). Bulk update. Shows "Viewing as" for managers (their team).

### B7.10 Calendar
Day / week / month / agenda; filter by me, team, room. Colour by meeting type. Holidays shown. Drag to reschedule (with a confirm step that notifies attendees).

### B7.11 Decisions register
Searchable table: code, decision, meeting, date, decided by, status (active/superseded/revoked), review date, linked point. Filters and export. Board resolutions sit on a separate tab with the minutes book.

### B7.12 Reports
Standard reports (8) with filters, chart + table, export to Excel/PDF, schedule by email. Plus a **custom report builder** (choose entity, columns, filters, group by, chart) (P2).

### B7.13 Admin
Settings (TAT, working days, holidays, reminders, quiet hours), meeting types and templates, categories with default TAT, rooms, custom fields, custom statuses, escalation matrix, workflow rules, notification templates (email/WhatsApp text), integrations (calendar, video, WhatsApp, SMS, webhooks, API keys), data retention, **Zoho migration**, audit log viewer.

### B7.14 Mobile (PWA)
Home, My Work, today's meetings, Live mode (attendance and quick capture), approve extension, acknowledge MoM, push notifications. Offline: Live mode notes and point updates are queued and synced later.

---

## B8. Reports and analytics
All reports have filters (date range, company, department, meeting, type, organizer, owner, status, tag) and export to Excel/PDF, and can be emailed on a schedule.

| # | Report | What it shows |
|---|---|---|
| R1 | Minutes of Meeting | Per session, as 6.6 |
| R2 | Meeting summary | Per series: sessions held, attendance %, points raised/closed/open, average days to close, tasks within TAT % |
| R3 | Pending points | All open points with age, due date, overdue days, carry count, last update |
| R4 | Carry-forward | Points carried, the sessions they passed through, escalation flag |
| R5 | TAT compliance | Within vs breached, % by owner/department/meeting/month, average delay |
| R6 | Owner performance | Assigned, completed, open, overdue, within-TAT %, average delay, updates given before meetings % |
| R7 | Department status | Open/closed/overdue points and tasks per department; heat map |
| R8 | Attendance | Invited vs attended, late %, per person and meeting |
| R9 | Audit trail | Full history of any point/task/session |
| R10 | Decision register | All decisions, superseded chains, due reviews |
| R11 | Overdue ageing | Buckets 0 to 3 / 4 to 7 / 8 to 15 / more than 15 days by department and owner |
| R12 | Escalations | Items by escalation level, time to resolve after escalation |
| R13 | Meeting effectiveness | Time used vs planned, points closed per session, preparedness %, cost estimate |
| R14 | Extension requests | Count, approval rate, days added, by owner |
| R15 | Resolutions and votes | Board mode: resolutions with vote counts, per financial year |

**Effectiveness score (0 to 100)** = 30% points closed vs carried + 20% agenda time discipline + 20% attendance + 15% pre-meeting updates received + 15% MoM published within 24h. Show it per session and as a trend per series.

---

## B9. API and integrations

Follow the workspace's API style. Every endpoint enforces the B3 object roles on top of Part A RBAC (A4). Indicative REST surface:

```
Meetings      GET/POST /meet/meetings · GET/PATCH /meet/meetings/:id · POST :id/archive · POST :id/duplicate
Templates     CRUD /meet/templates
Sessions      GET/POST /meet/meetings/:id/sessions · GET/PATCH /meet/sessions/:id
              POST /meet/sessions/:id/{start|end|cancel|reschedule|carry-forward}
              PUT  /meet/sessions/:id/attendance · POST /meet/sessions/:id/checkin (QR)
              POST /meet/sessions/:id/pre-update-request · GET /meet/sessions/:id/readiness
MoM           POST /meet/sessions/:id/mom/{draft|submit|approve|reject|publish} · GET /meet/sessions/:id/mom.pdf
              POST /meet/sessions/:id/mom/acknowledge
Agenda        CRUD /meet/sessions/:id/agenda · POST /meet/agenda/:id/convert-to-point
Points        GET /meet/points · POST /meet/sessions/:id/points · GET/PATCH /meet/points/:id
              POST /meet/points/:id/{status|escalate|link|pull} · POST /meet/sessions/:id/points/reorder
Tasks         GET /meet/tasks · POST /meet/points/:id/tasks · GET/PATCH /meet/tasks/:id
              POST /meet/tasks/:id/{status|verify|delegate|extension} · CRUD :id/checklist · CRUD :id/timelogs
              POST /meet/tasks/bulk
Extensions    POST /meet/extensions/:id/decide
Decisions     GET/POST /meet/decisions · PATCH /meet/decisions/:id (supersede/revoke)
Board         CRUD /meet/sessions/:id/resolutions · POST /meet/resolutions/:id/vote · GET /meet/minutes-book.pdf
Polls         CRUD /meet/sessions/:id/polls · POST /meet/polls/:id/vote
Recordings    POST /meet/sessions/:id/recordings · GET :id/transcript · POST :id/ai-proposals/{accept|discard}
Search        GET /meet/search?q=
Notifications GET /meet/notifications · POST /meet/notifications/read · GET/PUT /meet/notification-prefs
Reports       GET /meet/reports/:key?filters&format=json|xlsx|pdf · CRUD /meet/report-schedules · POST /meet/reports/custom
Admin         CRUD settings, holidays, types, categories, rooms, custom-fields, statuses, escalation-matrix, workflow-rules, webhooks
Import        POST /meet/import (upload) · POST /meet/import/:id/mapping · POST /meet/import/:id/run · GET /meet/import/:id
Webhooks out  point.created, point.status_changed, point.carried_forward, task.created, task.completed, task.overdue,
              session.started, session.ended, mom.published, decision.created
WhatsApp in   POST /meet/integrations/whatsapp/inbound (signed)
```

**Integrations**
- Calendar: Google Workspace and Microsoft 365, two-way (P2).
- Video: Google Meet, Microsoft Teams, Zoom link creation (P2); built-in Jitsi/LiveKit (P3, if chosen).
- Messaging: WhatsApp Business API (provider to be chosen: Gupshup, Interakt, Meta Cloud API, etc.), SMS gateway, email (workspace mailer).
- Chandak Workspace modules: HR (leave, reporting manager, department head), Helpdesk (raise a ticket from a point), Purchase (link a PR/PO to a task). Use events or hooks if the workspace supports them.
- Email-in (P2): forward an email to `meet@…` to create a point or task, with the attachment kept.

**Scheduled jobs**: reminders (every 5 min), pre-update requests (hourly), due-soon and overdue digest (daily 09:00), escalations (daily 10:00), next-session generation (daily), MoM acknowledgement chaser (daily), recurring task generation (daily 00:30), report schedules, calendar sync (every 10 min), retention purge (weekly).

---

## B10. Non-functional requirements
- **Module isolation**: its own folder, `meet_` tables, a feature flag or module registry entry; can be switched on per company.
- **Security**: Part A sign-in, MFA and RBAC (A3, A4, A11); row-level permissions (and DB policies if the workspace uses them, e.g. Supabase RLS); confidential meetings encrypted at field level for notes and attachments; signed URLs for files; append-only audit log.
- **Data retention**: configurable per meeting type (e.g. board minutes forever; recordings 180 days). Legal hold flag.
- **Performance**: see **Part C** (targets, indexes, caching, jobs, load tests). Part C is a go-live gate.
- **Availability**: Live mode autosaves; PWA offline queue; no data loss if the network drops mid-meeting.
- **Localisation**: English UI first; Hindi/Marathi UI labels (P3); INR currency; DD MMM YYYY dates; Asia/Kolkata time zone.
- **Accessibility**: keyboard shortcuts in Live mode (N new point, T new task, Enter save, ↑/↓ move between points), WCAG AA contrast, works on 360px phones.
- **Exports**: PDF (letterhead, page numbers, signature block) and Excel for every list and report.

---

## B11. Zoho migration (P2, must be done before Zoho is cancelled)
1. **Export** from Zoho: Zoho Projects tasks (CSV/XLSX), Zoho Tables/Creator MoM tracker (CSV), Zoho Meeting meeting list (CSV) and recordings (MP4), plus attachments.
2. **Upload** to the Import wizard; choose the source type.
3. **Map columns** to Chandak Meet fields (auto-suggest by name); map Zoho users to Workspace users by email; map statuses; map custom fields.
4. **Dry run**: show counts (meetings, sessions, points, tasks, comments, files) and row errors.
5. **Import**: create historical meetings/sessions as `mom_published`, points with history, and tasks with original dates and completion dates, so TAT reports include history. Mark them `source=zoho` and keep the Zoho ID.
6. **Reconcile**: a report comparing Zoho counts and Chandak Meet counts.
7. **Parallel run**: 2 to 4 weeks of running both, then switch reminders off in Zoho and cancel.

---

## B12. Delivery plan

**Phase 0: portal foundation.** Complete A15, steps 1 to 8: org masters, auth, RBAC, invites, notification service, admin console, MFA and SSO.

**Phase 1: MVP go-live (core loop)**
1. Module scaffold, registering `meet.*` permissions in the Part A permission registry, permissions, masters (types, categories, holidays, settings), migrations for meetings/sessions/attendees/agenda/points/session_points/tasks/extensions/comments/attachments/activity.
2. Meetings CRUD with templates and recurrence; sessions; `.ics` invites; email reminders.
3. Session workspace and **Live mode (basic)**: attendance, agenda timer, backup points first, quick capture, notes.
4. TAT engine (working days, holidays), overdue/due-soon flags.
5. Carry-forward with history, pull backup point, repeatedly-carried flag.
6. Create task modal, task drawer, extension workflow, bulk update.
7. My Work (list + Kanban), Calendar (month/week).
8. MoM draft → publish (PDF + email), "your items" email.
9. Home dashboard; reports R1 to R6; Excel/PDF export.
10. In-app notifications, overdue digest, due-soon reminders.

**Phase 2: Full Zoho parity**
11. Decisions register; board mode (quorum, resolutions, votes, minutes book); polls.
12. MoM approval, versions, acknowledgements.
13. Pre-meeting updates and readiness panel.
14. WhatsApp (one-way, then two-way), SMS; notification preferences; escalation matrix.
15. Subtasks, checklists, dependencies, recurring tasks, verification, time logs, delegation; leave awareness.
16. Rooms and booking; Google/Microsoft calendar sync; Meet/Teams/Zoom link creation; smart time finder.
17. Custom fields, custom statuses, tags, saved views, workflow rules, webhooks, API keys.
18. Reports R7 to R15, custom report builder, scheduled reports, management heat map.
19. Global search, PWA install, offline Live mode, QR check-in.
20. **Zoho migration wizard** and parallel run.

**Phase 3: Beyond Zoho**
21. Recording upload, transcription (EN/HI/MR), AI MoM proposals, Ask Meet.
22. Built-in video (if chosen in B13, item 1) with auto-attendance and auto-recording.
23. Meeting effectiveness score and cost; cross-meeting escalation analytics; Hindi/Marathi UI.

---

## B13. Decisions needed from Chandak Group
1. **Video calls**: (a) keep using Google Meet/Teams/Zoom and integrate links, recommended for P1; (b) self-host open-source video (Jitsi/LiveKit) inside Chandak Meet in P3, which needs servers and bandwidth; or (c) both.
2. **WhatsApp provider** and approved message templates (needed for P2 two-way updates).
3. **AI provider** for transcription and MoM drafting, and whether audio can leave Chandak servers.
4. **Working week**: Mon to Sat with 18:00 end assumed; confirm per company/plant.
5. **Escalation matrix**: day counts per level (default 1 / 3 / 5 / 10 overdue days).
6. **MoM approval**: required for which meeting types (default: board and management reviews only).
7. **Board mode**: which entities need statutory resolution numbering and a minutes book.
8. **Zoho data**: which Zoho apps hold the current MoM/tasks (Projects, Tables, Creator, Meeting) and how many years of history to migrate.

---

## B14. Acceptance criteria (key scenarios)
1. Create a weekly meeting from the "Weekly Sales Review" template → agenda, members and categories are pre-filled; S-001 is created; invites carry `.ics`.
2. A task with a 3-working-day TAT created on Friday (Sunday off) is due Tuesday 18:00; with Mon to Fri working days, it's due Wednesday.
3. End a session with 3 open points → all 3 appear as backup points in the next session with carry count +1; closed points don't.
4. A point carried for the 3rd time is flagged, and the department head is notified once.
5. A pre-update request is sent 24h before; an owner replies "60" on WhatsApp → task progress becomes 60%; the session readiness shows the update.
6. A task completed 2 working days after its due date → breached, delay 2; with an approved extension past that date → within TAT.
7. A parent task can't complete while subtasks are open unless the user confirms cancel.
8. In board mode, a resolution can't be recorded before quorum; a vote of 4 for and 1 against is recorded and the number follows the FY sequence.
9. MoM with approval: the minute taker submits → the chair approves → it's published → attendees acknowledge; a correction creates v2 and keeps v1.
10. Workflow rule "overdue 3 days → escalate L2" fires once and is logged.
11. A user without access gets 403/404 on meeting, point, task, file, search and API.
12. Zoho import of 500 tasks: dry run shows errors per row; the import keeps original dates; the TAT report includes the historic data.
13. Live mode keeps working with the network off; updates sync on reconnect with no duplicates.
14. Dashboard KPIs equal the matching report totals for the same filters.

---

# PART C: Performance, scalability and reliability

Performance is a feature here. Staff will use this every day, often from a phone on 4G at a plant or branch. If it feels slower than Zoho, people go back to Excel and WhatsApp. Everything in Part C applies to Part A and Part B. **Every P1 screen must meet these targets before go-live** (C13).

## C1. Sizing assumptions (design for 5 years)

| Item | Year 1 | Year 5 (design target) |
|---|---|---|
| Users (internal + guests) | 800 | 3,000 |
| Peak concurrent users | 200 | 800 |
| Meetings (sessions) per working day | 60 | 250 |
| Live meetings at the same time (Monday 10:00–12:00 peak) | 20 | 80 |
| Points | 40k | 500k |
| Tasks | 150k | 2M |
| Comments + activity rows | 1M | 25M |
| Audit log rows | 5M | 100M |
| Notifications / deliveries | 2M | 40M |
| Files (attachments, MoM PDFs) | 200 GB | 3 TB |
| Recordings (P3, if kept 180 days) | — | 2–4 TB rolling |

Build seed scripts that generate the **Year 5** volume. All performance tests run against that data, not an empty database.

## C2. Targets (service level objectives)

Measured at p95 on the production-like staging stack with Year 5 data, from an Indian network (Mumbai region).

### C2.1 User-facing
| Interaction | Target |
|---|---|
| First load of the app (cold, 4G, mid-range Android) | LCP ≤ 2.5 s, interactive ≤ 3.5 s |
| Repeat load (service worker cache) | ≤ 1.0 s |
| Route change inside the app | ≤ 300 ms to content (skeleton within 100 ms) |
| Any click → visible response (INP) | ≤ 200 ms |
| Layout shift (CLS) | ≤ 0.1 |
| Live mode: status change, add point, mark attendance | ≤ 150 ms perceived (optimistic), server confirm ≤ 400 ms |
| Live mode: change seen by other attendees | ≤ 1 s |
| Global search results while typing | ≤ 300 ms after the 250 ms debounce |
| Dashboard / Home | ≤ 1.5 s |
| Any list (meetings, points, tasks, users), first page | ≤ 800 ms |
| Report on screen (≤ 5,000 rows) | ≤ 2 s |
| Excel/PDF export ≤ 5,000 rows | ≤ 5 s, synchronous |
| Export > 5,000 rows | Async job; notify when ready; ≤ 2 min for 100k rows |
| MoM PDF generated after publish | ≤ 10 s |
| Sign-in (password + MFA) end-to-end server time | ≤ 500 ms (Argon2 tuned to ~150 ms) |

### C2.2 API and back-end
| Item | Target |
|---|---|
| Read endpoints | p95 ≤ 200 ms, p99 ≤ 500 ms |
| Write endpoints | p95 ≤ 300 ms, p99 ≤ 800 ms |
| Any single DB query on a request path | p95 ≤ 50 ms; anything > 200 ms is logged as slow |
| DB queries per request | ≤ 10 (no N+1) |
| JSON response size (gzipped) | ≤ 100 KB per page |
| In-app notification after the event | ≤ 5 s |
| Email / WhatsApp handed to the provider | ≤ 60 s (digests excepted) |
| Carry-forward on "End meeting" (100 points) | ≤ 2 s |
| Escalation scan (whole company) | ≤ 2 min, every 15 min |
| Availability (working hours 08:00–21:00 IST) | 99.9% per month |
| Data loss | RPO ≤ 5 min, RTO ≤ 1 h |

## C3. Front-end rules
1. **Bundle budget:** initial JS ≤ 200 KB gzipped, CSS ≤ 50 KB. Each module (Meet, Admin, Reports) is a separate lazy-loaded chunk. Charting and the PDF viewer load only on the screens that use them. CI fails the build if a budget is exceeded.
2. **Lists over 100 rows are virtualised** (windowed rendering). Never render 2,000 table rows into the DOM.
3. **Optimistic updates** for status, progress, attendance, checklist ticks and Kanban drags. Roll back with a toast if the server rejects the change.
4. **Debounce** search and filter inputs by 250 ms. Cancel in-flight requests when a new one starts (AbortController).
5. **Skeletons** instead of spinners, sized to the real content, so nothing jumps (CLS).
6. **Client cache** (React Query / SWR / the stack's equivalent): stale-while-revalidate for lists. Use one shared cache key per resource so a change in a drawer updates the list behind it without a refetch.
7. **Prefetch** on hover/focus for meeting, session and point links. Also prefetch the next session when a meeting opens.
8. **Fonts:** self-host, subset to Latin + Devanagari, `font-display: swap`, preload only the regular weight.
9. **Images:** responsive sizes, WebP/AVIF, lazy below the fold. Avatars are 64 px thumbnails, not originals.
10. **PWA service worker:** cache the app shell and static assets (immutable, hashed file names). Cache the last-viewed My Work and Home data for offline reading. Queue offline writes (IndexedDB) and replay them in order when back online.
11. **No layout work in loops.** Long tasks over 50 ms on the main thread are flagged by RUM (C11).
12. **Real-device test target:** a ₹10–12k Android phone (4 GB RAM) on throttled 4G. That is the floor, not a laptop.

## C4. API rules
1. **Pagination everywhere.** Cursor-based (`?cursor=…&limit=50`, max 200). Offset pagination is allowed only for admin tables under 10k rows. Total counts are optional (`?count=true`) and cached, because `COUNT(*)` on big tables is slow.
2. **Fetch only what the screen shows.** List endpoints return a slim projection (id, code, title, owner id/name, status, due, flags). The detail endpoint returns the rest. Support `?fields=` for heavy resources.
3. **No N+1.** Batch-load related records (owners, meetings, counts) in one query per relation. Add a test helper that fails if an endpoint runs more than N queries for a page.
4. **Compression:** Brotli/gzip on all JSON over 1 KB.
5. **Conditional requests:** ETag/`If-None-Match` on masters, `/me` and detail endpoints → 304 when nothing changed.
6. **Bulk endpoints** for bulk status change, bulk reassign, bulk invite and Excel import. Never loop single calls from the client.
7. **Idempotency keys** on create endpoints (task, point, invite). A retry after a network drop must not create duplicates. This matters in Live mode on flaky Wi-Fi.
8. **Timeouts:** 10 s server-side for any request. Anything that can take longer becomes a background job with a progress endpoint.
9. **Rate limits:** 600 requests/min per user, 20/min on auth endpoints per IP, 60/min per API key (configurable). Return `429` with `Retry-After`.
10. **Aggregates come from the server.** Dashboard counts, TAT % and the heat map are computed in SQL or summary tables, never by downloading all rows to the browser.

## C5. Database
### C5.1 Engine and connections
- PostgreSQL 15+ is recommended (or whatever the workspace already uses, if it is a relational DB with the same features).
- Connection pooling (PgBouncer in transaction mode, or the platform's pooler). App instances never open more than the pool size.
- Statement timeout of 5 s for web requests and 5 min for jobs.

### C5.2 Indexes (minimum; add more from slow-query logs)
```
-- Part A
core_users(email) UNIQUE;  core_users(company_id, department_id, status);  core_users(manager_id)
core_user_roles(user_id);  core_user_roles(role_id)
core_sessions(user_id, revoked_at);  core_invites(token_hash) UNIQUE;  core_invites(status, expires_at)
core_notifications(user_id, read_at, created_at DESC)
core_deliveries(status, created_at)  -- retry worker
core_audit_log(entity_type, entity_id, at DESC);  core_audit_log(actor_user_id, at DESC)

-- Part B
meet_meetings(department_id, status);  meet_meetings(organizer_id)
meet_meeting_members(user_id, meeting_id)
meet_sessions(meeting_id, session_no);  meet_sessions(scheduled_date, status)
meet_points(meeting_id, status);  meet_points(owner_id, status, due_date)
meet_points(due_date) WHERE status NOT IN ('closed','dropped')        -- partial: open items only
meet_session_points(session_id);  meet_session_points(point_id)
meet_tasks(point_id);  meet_tasks(owner_id, status, due_date)
meet_tasks(COALESCE(revised_due, due_date)) WHERE status NOT IN ('completed','cancelled')
meet_task_supporters(user_id)
meet_decisions(meeting_id, status, decided_at DESC)
meet_activity(entity_type, entity_id, created_at DESC)
meet_comments(entity_type, entity_id, created_at)
```
- **Full-text search:** a `tsvector` column (generated) on points, tasks, decisions, meetings and MoM notes, with a GIN index. Add a `pg_trgm` index on `code` and `title` for partial matches like "PT-000". Results are filtered by permission **in the query**, not after.
- Run `EXPLAIN ANALYZE` on the 20 most-used queries against Year 5 data as part of the release checklist. None may do a sequential scan on a table over 50k rows.

### C5.3 Large tables
- **Partition by month:** `core_audit_log`, `core_notifications`, `core_deliveries` and `meet_activity`. Old partitions are detached and archived to cheap storage after the retention period. Dropping a partition is instant; deleting millions of rows is not.
- **Archive** closed meetings older than 3 years to read-only archive tables (still searchable and reportable, but out of the hot path). This is configurable.

### C5.4 Summary tables for dashboards and reports
Don't compute the dashboard from raw rows on every load. Keep:
- `meet_stats_daily(date, company_id, department_id, meeting_id, owner_id, opened, closed, overdue, completed_within_tat, completed_breached, carried_forward)`, updated by the event handler on each change plus a nightly rebuild to correct any drift.
- Denormalised counters on parent rows: `meet_points.open_task_count`, `meet_points.carry_count`, `meet_sessions.point_count`, `meet_meetings.open_point_count`. Update them in the same transaction as the change.
- Materialised views for heavy reports (R5 TAT compliance, R6 owner performance, R13 effectiveness), refreshed `CONCURRENTLY` every 15 min. The screen shows "Updated 4 min ago".

### C5.5 Read replica
Reports, exports and dashboards for management roles read from a replica when one exists (P2). Writes and Live mode always use the primary.

### C5.6 TAT calculation
- Keep a **working-day calendar table** (`core_workdays(company_id, location_id, date, is_working, workday_index)`) for 10 years ahead. Rebuild it when holidays change.
- Due date = the date where `workday_index = start_index + TAT`. This is one indexed lookup, not a day-by-day loop.
- Overdue days = the difference of two `workday_index` values. This makes overdue-ageing reports pure SQL.

## C6. Caching
| What | Where | TTL / invalidation |
|---|---|---|
| Effective permissions per user (`can()`) | Redis (or in-memory per instance + pub/sub) | 5 min; cleared at once on `core.role.changed`, suspend or deactivate |
| `/me` payload | Client + ETag | Refetched on focus and on role change event |
| Masters (companies, departments, categories, holidays, templates) | Redis + client | 1 h; cleared on edit |
| Working-day calendar | In-memory per instance | Rebuilt on holiday change |
| Dashboard tiles | Redis, key = user scope hash | 60 s; cleared by events in that scope |
| Static assets | CDN + browser | 1 year, immutable (hashed names) |
| Signed file URLs | — | 15 min expiry; never cached in a shared cache |

Rules:
- **Confidential** meeting data is never put in any shared cache. Cache keys always include the permission scope, so one user can never see another user's cached result.
- Every cache must be safe to lose. The app works, just slower, if Redis is down.

## C7. Background jobs
Use a durable queue: BullMQ, Celery, Sidekiq or the stack's equivalent (backed by Redis or the DB). The web request only enqueues; workers do the work.

| Job | Trigger | Rules |
|---|---|---|
| Send notification (per channel) | Event | Retry 5× with exponential backoff; dead-letter queue after that; provider rate limits respected (e.g. SES 14/s, WhatsApp tier limits) |
| Daily digest 08:30, overdue 09:00 | Schedule | Process users in batches of 500; spread sends over 10 min; skip users with nothing to send |
| Escalation scan | Every 15 min | Incremental: only items whose due date or status changed, or that crossed a threshold today |
| Carry-forward after "End meeting" | Event | Runs in one DB transaction; the UI waits ≤ 2 s, else it shows "Finishing…" and polls |
| MoM PDF | On publish | Headless renderer in a worker pool, max 4 at the same time per instance; cached until the MoM changes |
| Excel/PDF export > 5k rows | User | Streamed to storage; one running export per user; link valid 24 h |
| Zoho / Excel import | User | Chunks of 1,000 rows; progress %; resumable; dry run first |
| Recurring tasks and sessions | Nightly | Create the next occurrence 14 days ahead |
| AI transcription (P3) | Upload | Separate queue so a long recording never blocks notifications |
| Summary table rebuild | Nightly 02:00 | Off-peak |
| Partition maintenance, archive | Monthly | Off-peak |

Every job is **idempotent** (safe to run twice), logs its duration, and exposes metrics (C11). Schedules are in IST and staggered so they don't all start at 09:00:00.

## C8. Real-time (Live mode, notifications)
- WebSocket (or SSE plus POST) channel per session (`session:{id}`) and per user (`user:{id}`). Use a managed or Redis-backed pub/sub so it works across multiple app instances.
- Messages are small diffs (`{entity, id, fields, version}`), not full objects.
- **Conflicts:** each point/task carries a `version` number. Writes send the version they edited; if it's stale, the server rejects the write and the client merges at field level (last writer wins per field) and shows "Neha changed status just now".
- **Fallback:** if the socket drops, poll every 10 s, and reconnect with backoff (1, 2, 5, 10, 30 s).
- **Presence** ("3 people viewing") is throttled to 1 update per 5 s per session.
- Capacity: 80 live sessions × 15 participants = 1,200 sockets at peak. One mid-size instance handles that; design for 5,000.

## C9. Files and media
- Uploads go **directly to object storage** with pre-signed URLs (S3 / Azure Blob / GCS), never streamed through the app server. Large files use multipart upload with resume.
- Virus scan and thumbnail generation run async. The file shows "Scanning…" until it's clean.
- Downloads come from the CDN with short-lived signed URLs.
- Recordings (P3) stream with HTTP range requests. They are transcoded once to a compressed format (e.g. Opus audio / H.264 720p) to cut storage.

## C10. Infrastructure and scaling
- **Stateless app servers.** Sessions live in the DB or Redis, never in memory, so any instance can serve any request. Minimum 2 instances (no single point of failure).
- **Autoscale** on CPU > 60% or p95 latency > target for 5 min. Pre-scale before the Monday 10:00 peak (scheduled scaling).
- **Separate worker pool** from web instances, so a big export or import never slows the UI.
- **Region:** India (Mumbai or Hyderabad) for latency and data residency. CDN with Indian edge locations.
- **Starting size (Year 1, guidance):** 2 × app (2 vCPU / 4 GB), 1 × worker (2 vCPU / 4 GB), PostgreSQL managed (4 vCPU / 16 GB, 200 GB SSD, PITR on), Redis 1 GB, object storage + CDN. Re-check at each 2× growth in data or users.
- **Backups:** continuous WAL/PITR (RPO 5 min), daily snapshot kept 30 days, monthly kept 1 year, restore drill every quarter.
- **Deploys** with zero downtime: rolling or blue-green, plus backward-compatible DB migrations (expand → migrate → contract). Migrations on big tables use `CREATE INDEX CONCURRENTLY` and batched backfills.

## C11. Observability
- **Tracing/APM** (OpenTelemetry → Grafana/Tempo, Datadog, New Relic or Azure App Insights): every request is traced with DB spans. Slow traces over 1 s are sampled at 100%.
- **Metrics:** request rate, errors and duration per endpoint; queue depth and job duration per job type; DB connections, slow queries, replication lag; cache hit rate; socket count; email/WhatsApp send rate and failure rate.
- **Real-user monitoring (RUM)** in the browser: LCP, INP, CLS and long tasks, per route, per device class. This is how we know the plant-floor phones are fast, not just the HO laptops.
- **Alerts** (to IT on email + WhatsApp):
  - p95 > 2× target for 10 min
  - error rate > 1%
  - queue depth > 5,000 or the oldest job > 5 min
  - DB CPU > 80%
  - storage > 80%
  - the delivery failure rate > 5%
  - a backup fails
- **Performance dashboard** in Admin › System health (P2) showing the C2 targets as green/amber/red.

## C12. Performance testing
1. **Tools:** k6 (or JMeter) for load; Lighthouse CI for page budgets; Playwright for real-browser timings of key flows.
2. **Data:** the Year 5 seed (C1) on a staging stack sized like production.
3. **Scenarios** (each must meet C2 at p95 with < 0.5% errors):

| Scenario | Load |
|---|---|
| Monday peak | 800 concurrent users browsing; 80 live sessions each doing 1 write per 3 s; dashboard loads every 30 s per user |
| 09:00 burst | Overdue digest to 3,000 users + escalation scan + 300 people opening My Work within 5 min |
| MoM publish wave | 50 MoMs published within 10 min (PDF + emails to 750 recipients) |
| Bulk operations | Import 10k Zoho rows; bulk invite 1,000 users; export 100k tasks, while the Monday peak runs |
| Search | 50 searches/s over 2.5M points + tasks |
| Soak | 8 hours at 50% of peak: no memory growth, no queue backlog |
| Failure | Kill one app instance, then Redis, then the socket server during the peak: no data loss, recovery ≤ 1 min, UI keeps working (degraded) |

4. **In CI:** Lighthouse budgets and bundle-size checks on every PR. A nightly k6 smoke test (10% of peak) on staging. If the p95 of any key endpoint regresses by more than 15% against the last release, the build fails.
5. **Before go-live** and before each phase release: run the full scenario set, and attach the report to the release notes.

## C13. Performance acceptance criteria (go-live gate)
1. Home, My Work, Meeting detail and Session workspace load in ≤ 1.5 s (p95) on throttled 4G on the reference Android phone, with Year 5 data.
2. In Live mode, 15 attendees in one session and 80 sessions running at once: a status change shows on everyone's screen within 1 s.
3. Pressing "End meeting" with 100 open points carries them all forward in ≤ 2 s.
4. A Department Head's dashboard over 500k points loads in ≤ 1.5 s.
5. Global search returns permission-filtered results in ≤ 300 ms over 2.5M records.
6. A 100k-row export finishes in ≤ 2 min without slowing other users' p95 by more than 10%.
7. The 09:00 digest for 3,000 users is fully handed to providers within 10 min.
8. No endpoint used by a P1 screen runs more than 10 queries or a sequential scan on a table over 50k rows.
9. Initial JS ≤ 200 KB gzipped. Lighthouse performance score ≥ 90 on mobile for the login page and Home.
10. Killing one app instance during the Monday-peak test causes no failed user actions beyond automatic retries.
