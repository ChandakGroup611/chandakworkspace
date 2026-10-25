# Chandak Workspace + Chandak Meet: FINAL Build Specification

Version 6.0 FINAL · 25 Oct 2026 · Target repo: `ChandakGroup611/chandakworkspace`
**This is the only spec file to give the build agent**, together with the clickable prototype `chandak-meet-prototype.html` (same folder). It contains everything agreed so far: the portal, Chandak Meet, notes, module-level admin, alerts and SLA, templates, RSVP, attendance, AI MoM, room booking with Teams displays, and performance. All earlier .md files are superseded and kept only in `archive/`.

---

## How to use this document (read first)

**Goal:** Chandak Group is building its own portal, Chandak Workspace, and replacing Zoho for meeting management with the Chandak Meet module. Everything is built in-house: invites, sign-in, users, roles, alerts, and the meeting module on top.

**The parts**

| Part | What it covers | When |
|---|---|---|
| **A. Platform foundation** | Org structure, invites, sign-in and MFA, SSO, user management, workspace roles and permissions, notification and email service, admin console, audit, security | Phase 0 (extend what the repo already has) |
| **B. Chandak Meet** | Zoho parity map, meetings, sessions, points, TAT, backup/carry-forward points, tasks, decisions, Live mode, MoM, board mode, reports, integrations, Zoho migration | Phases 1 to 3 |
| **C. Performance, scalability and reliability** | Targets, front-end and API rules, DB indexes and partitioning, caching, background jobs, real-time, infra, monitoring, load testing | From day one; go-live gate |
| **D. Gap-closing pack** | Audit checklist for the already-built app, **Notes module** (running notes, line → task/point/decision, open loops, auto summary), detail for points, tasks and MoM, extra feature ideas | **Start here**: D1 audit on the existing app |
| **E. Module admin and meeting flow** | Each module manages its own roles, policies, alerts, SLA, escalation and email templates; custom template builder; meeting acceptance (RSVP); attendance check-in; AI minutes per point and automatic MoM to everyone | After the D1 audit |
| **F. Meeting rooms** | Room booking synced with Microsoft 365 / Teams, so **room panels show "booked by X, time"**; live availability; check-in and auto-release; Chandak room display for rooms without a Teams panel | With Part E |

**Which part wins:** where parts disagree, the later letter wins: **F > E > D > C > B > A**. For example, E0 moves Meet roles out of Workspace admin into Meet settings, and F2 decides who sends invites when Microsoft 365 is connected.

**Rules for the build agent**
1. Read the existing `chandakworkspace` repo and the running app first. Keep its stack, folder layout, routing, DB access layer, migrations, UI component library and naming. Where this spec's names differ, keep the repo's names and the spec's meaning. Extend what exists. Never build a second users table, tasks table, editor or notification system.
2. This spec says *what* to build and the rules. The prototype shows the screens. Where they differ, this spec wins.
3. Every permission check runs on the server: `can()` from A4, plus module roles (E0) and meeting roles (B3). Every write is audit-logged (A10). Every alert goes through `notify()` (A7) using a template (E3). Meet never keeps its own user list; it uses `core_users`.
4. Store times in UTC; show them in IST (Asia/Kolkata). Send `India Standard Time` to Microsoft 365.
5. Phase tags: **P1** = must have for go-live, **P2** = about 2 months after, **P3** = later.
6. Section numbers carry their part letter (A4.2, B6.4, F2). A bare number inside a Part B table means a Part B section.

## Master build plan (what to do, in order)
| Step | Work | Spec |
|---|---|---|
| 1 | Audit the existing app against the full checklist (D1 table + Part E rows E-1 to E-10 + room rows R-1 to R-5 below). Commit `docs/meet-gap-audit.md` | D0, D1, E8, below |
| 2 | Fill gaps in the foundation: org masters, auth, RBAC with module registry, invites, notification service + templates, Workspace admin | A15, E0, E3 |
| 3 | Core meeting loop: meetings, sessions, points, backup points, carry-forward, TAT engine, tasks, extensions, My Work | B12 Phase 1, D3, D4 |
| 4 | Notes module and summary | D2, D9 |
| 5 | MoM lifecycle, then AI minutes per point and MoM to everyone | D5, E6 |
| 6 | Meet settings: roles and access, policies, alerts and SLA engine, escalation, custom templates | E1, E2, E3 |
| 7 | RSVP and attendance check-in | E4, E5 |
| 8 | Rooms: M365 setup, room sync, booking with Teams link, two-way sync, displays, check-in and release | F1 to F6 |
| 9 | Reports, decisions register, board mode, Zoho migration | B8, B6.5, B11 |
| 10 | Performance hardening and load tests; go-live gate | C12, C13 + A14, B14, D10, E9, F11 |
| 11 | Phase 2/3 items and the D6 feature ideas | B12, D6 |

**Room rows to add to the audit file:**
| # | Feature |
|---|---|
| R-1 | Room picker with live free/busy from Microsoft 365, capacity, equipment, suggestions |
| R-2 | Saving a meeting books the room mailbox + Teams link via Graph; the Teams room panel shows "booked by" |
| R-3 | Two-way sync: room declines, Outlook moves/cancels, Outlook RSVPs come back to Chandak |
| R-4 | Check-in, no-show auto-release, end early, extend |
| R-5 | Chandak room display page for tablets |

**Open decisions for Chandak Group:** A13 (platform), B13 (meetings, including video), F12 (rooms).

## Contents
- **Part A** Platform foundation: A1 Concepts · A2 User lifecycle and invites · A3 Authentication · A4 Authorisation (RBAC) · A5 Groups · A6 Workspace shell · A7 Notifications and email · A8 Admin console · A9 Data model · A10 Audit · A11 Security · A12 API · A13 Decisions · A14 Acceptance · A15 Build order
- **Part B** Chandak Meet: B0 Goal · B1 Zoho parity map · B2 Glossary · B3 Meeting roles · B4 Data model · B5 Statuses and TAT · B6 Workflows · B7 Screens · B8 Reports · B9 API and integrations · B10 Non-functional · B11 Zoho migration · B12 Delivery plan · B13 Decisions · B14 Acceptance
- **Part C** Performance: C1 Sizing · C2 Targets · C3 Front-end · C4 API · C5 Database · C6 Caching · C7 Background jobs · C8 Real-time · C9 Files · C10 Infrastructure · C11 Observability · C12 Load testing · C13 Acceptance
- **Part D** Gap-closing pack: D0 Instructions · D1 Feature audit · D2 Notes module · D3 Tasks · D4 Points · D5 MoM · D6 More features · D7 Screens · D8 Notifications · D9 Build order · D10 Acceptance
- **Part E** Module admin and meeting flow: E0 Module-level settings · E1 Meet roles and policies · E2 Alerts, SLA, escalation · E3 Custom templates · E4 RSVP · E5 Attendance · E6 AI minutes and auto MoM · E7 Prototype · E8 Build order · E9 Acceptance
- **Part F** Meeting rooms: F0 How it works · F1 Microsoft 365 setup · F2 Booking while scheduling · F3 Room master and policies · F4 Two-way sync · F5 Check-in and release · F6 Room display · F7 Data model · F8 API · F9 Alerts · F10 Edge cases · F11 Acceptance · F12 Decisions

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

---

# PART D: Gap-closing pack: Notes, meeting points, tasks, MoM and summary

Version 4.0 · 25 Oct 2026. Use this with the app that has already been built. It adds the **Notes module** (new) and spells out, screen by screen and button by button, the meeting point, task and MoM features. These must exist and be easy to reach. Where Part B already describes something, Part D is the more detailed rule and wins.

## D0. Instructions for the build agent (do this first)

1. **Audit before you build.** Copy the checklist in D1 into `docs/meet-gap-audit.md` in the repo. Then, for every row, open the running app and the code and mark it: ✅ done and working · 🟡 partly (say what's missing) · ❌ missing. Don't guess. If you can't find a screen or button, it's ❌.
2. Commit the filled audit **before** writing feature code, so the team can see what was missing.
3. Build in the order in D9. Fix every ❌ and 🟡 in that order.
4. After each step, re-run the D10 acceptance tests for that step and update the audit file.
5. Reuse what exists. Don't create a second tasks table, a second points table or a second editor if one is already there. Extend it.
6. The clickable prototype (`chandak-meet-prototype.html`) shows the Notes screens: **Notes** in the left menu, the **Running notes** card in Live mode, the **Meeting notes** card on the session page, **Summary**, and the open-loops warning in **End meeting**. Match that behaviour.

## D1. Feature audit checklist (must all be ✅ for go-live)

### D1.1 Meetings
| # | Feature | Where the user finds it |
|---|---|---|
| M1 | Create meeting (title, type, department, organizer, chair, minute taker, date, time, duration, mode, room, video link, attendees, repeat) | "+ New meeting" on Home and Meetings; "+ Create" in the top bar |
| M2 | Create from template (agenda + members pre-filled) | Template picker at the top of the Create meeting form |
| M3 | Recurring series creates the next session automatically | Meeting › Sessions tab |
| M4 | Invite email with calendar file (.ics) to attendees | Sent on save |
| M5 | Agenda items with presenter and minutes; reorder; agenda item → point | Session page › Agenda |
| M6 | Start meeting → Live mode; attendance (present, late, absent) | Session page "Start in Live mode" |
| M7 | End meeting → carry-forward of all open points to the next session | Live mode / Session page "End meeting" |
| M8 | Reschedule, cancel, add follow-up session | Session page header |

### D1.2 Meeting points
| # | Feature | Where |
|---|---|---|
| P1 | Add point during or before the meeting (title, description, type, category, priority, owner, TAT → due date) | Session page "New point" form; Live mode quick capture; Notes line → Point |
| P2 | Point code (PT-00001), status (Open, In progress, On hold, Closed, Dropped, Reopened), progress % | Everywhere a point is shown |
| P3 | **Backup points**: open points from earlier sessions listed first in the next session, overdue on top | Session page "Backup points" card |
| P4 | Point history across sessions (raised in S1, carried to S2, S3…) with the note from each session | Point drawer › Session history |
| P5 | Flag and escalate points carried 3 or more times | Badge "Carried 3×"; notification to department head |
| P6 | Close a point only with closure remarks; warn about open tasks | Point drawer "Close point…" |
| P7 | Reassign owner (notifies new owner, logs change) | Point drawer owner field |
| P8 | Comments with @mentions, attachments | Point drawer |
| P9 | Escalate a point into another meeting | Point drawer "Escalate to another meeting…" |
| P10 | All points of a meeting series, filterable (status, owner, overdue, carried) | Meeting › All points tab |
| P11 | Pre-meeting update from owners (in app, email reply, WhatsApp) | Session page › Readiness |

### D1.3 Tasks (meeting task management)
| # | Feature | Where |
|---|---|---|
| T1 | **Create task** under a point: title, description, owner, supporting members, priority, start date, TAT (working days) → due date shown live, repeat, reminder, checklist, attachments, "needs verification" | "+ New task" on Home, Meeting › Tasks, Session page, Point drawer, Live mode, My Work, "+ Create" menu, Notes line → Task |
| T2 | Task code (TSK-00001), statuses (Not started, In progress, On hold, Completed, Cancelled), progress % | Everywhere |
| T3 | TAT engine: skips Sundays and holidays; Overdue and Due soon flags; "Within TAT" / "TAT breached by N days" on completion | Task lists, task drawer |
| T4 | Extension request (owner) → approve or reject (organizer) → revised due date; full trail | Task drawer, My Work › Waiting on me |
| T5 | Checklist items tick progress; subtasks; dependencies (P2) | Task drawer |
| T6 | Verification: completed tasks needing verification wait for the organizer | My Work › Waiting on me |
| T7 | My Work: Overdue / Due soon / Open / Waiting on me / Completed; List and Kanban; "viewing as" for managers | My Work |
| T8 | Bulk update (status, owner, due) on selected tasks | Task lists |
| T9 | Task updates by email reply and WhatsApp reply ("done", "60", "need 2 days") | Notifications |
| T10 | Tasks of a point are reviewed again automatically in the next session (they show under the backup point) | Session page, Live mode |
| T11 | Recurring tasks create the next one on completion or schedule | Task drawer "Repeat" |

### D1.4 MoM (minutes)
| # | Feature | Where |
|---|---|---|
| R1 | MoM generated automatically from the session: attendance, backup points with session notes, new points, decisions, resolutions, action items, parking lot, summary, next session | Session page "Preview MoM"; Reports › Minutes of Meeting |
| R2 | MoM lifecycle: Draft → (Submit to chair →) Approved → Published; locked after publish; addendum allowed | Session page header buttons |
| R3 | Publish sends PDF by email and WhatsApp to attendees and all owners | On publish |
| R4 | Attendee acknowledgement with a chase-up reminder | Session page › MoM acknowledgements; My Work › Waiting on me |
| R5 | PDF on letterhead with page numbers and signature block; Word export (P2) | MoM "Download" |
| R6 | MoM versions with what changed | MoM history |
| R7 | Minutes book for board meetings (page-numbered, all sessions) | Decisions › Board resolutions |

### D1.5 Notes (new in Part D, see D2)
| # | Feature | Where |
|---|---|---|
| N1 | Running notes per session, auto-saved, works offline | Live mode "Running notes"; Session page "Meeting notes"; Notes › Meetings |
| N2 | Each line timestamped, by author, auto-tagged to the point being discussed | Notes lines |
| N3 | Convert any line → Task / Point / Decision (two-way link) | Line buttons; `/task`, `/point`, `/decision` |
| N4 | Open-loops detection: action-like lines that are not yet a task or point | Flag on the line; Notes › Open loops; End-meeting warning |
| N5 | Personal notes (private), pin, tags, share, attach to a meeting | Notes › Mine; "+ New note" |
| N6 | Notes searchable in global search | Top search bar |
| N7 | Meeting summary built from notes + points + tasks + decisions; "Use in MoM" | "Summary" button |
| N8 | Notes shown in the point drawer ("From meeting notes") | Point drawer |
| N9 | Notes locked when MoM is published; addendum only | Notes card |

## D2. Notes module

### D2.1 Why
In real meetings, people talk faster than anyone can fill forms. Things get said ("Neha will check the Akola stock") that never become tasks, and are forgotten by next week. The Notes module is the **capture layer**. Type freely and fast, and nothing is lost. Then turn any line into a point, task or decision in one click, and the system reminds you about lines that look like actions but were never assigned. The summary and the MoM are built from these notes.

### D2.2 Kinds of notes
| Kind | Owner and visibility | Created |
|---|---|---|
| **Session notes** (running notes) | One shared note per session. Visible to everyone who can see the meeting. Editable by organizer, co-organizer, minute taker, chair, and (setting) attendees. | Automatically when the session is created. |
| **Personal notes** | Private to the author by default. Can be shared with people or attached to a meeting/point. | "+ New note" in Notes; quick-capture shortcut `N`; WhatsApp to the bot "note: …" (P2). |
| **Point notes** | Not a separate store: lines from session notes tagged to a point, shown in the point drawer. | Tagging (D2.4). |
| **Voice notes** (P2) | Recorded in the mobile app, transcribed into lines (EN/HI/MR). | Mic button in the notes input. |

### D2.3 Editor (line-based, fast)
- A list of **lines (blocks)**. Each has a time, an author, text, a type (text, to-do, heading P2), the tagged point, and a link to the task/point/decision it became.
- **Input bar** at the bottom: type and press Enter. It keeps focus so you can type line after line without touching the mouse.
- **Inline syntax:**
  - `/task …` creates a line and opens Create task pre-filled
  - `/point …` creates a point
  - `/decision …` records a decision
  - `[] …` makes a to-do
  - `@name` sets the owner
  - `#category` sets the category and its default TAT
  - `3d` sets the TAT in working days
  - `!high` sets the priority
  - `by Fri` sets the due date (P2)
- **Click any line to edit** in place. Edits autosave. Each line keeps its edit history.
- **Line actions** (hover on desktop, always visible on mobile): `→ Task`, `→ Point`, `→ Decision`. After conversion the line shows a chip ("Task TSK-00019 · In progress") that opens the item. The status in the chip is live.
- **Multiple note-takers** (P2): real-time co-editing with presence ("Priya is typing"). Use a CRDT (Yjs or Automerge) or line-level last-write-wins with version numbers. Lines from different authors show the author's first name.
- **Keyboard:** Enter adds a line · ↑/↓ moves between lines · Ctrl+Enter on a line converts it to a task · Ctrl+Shift+P converts it to a point · Esc leaves the line.

### D2.4 Auto-tagging to points
In Live mode, every new line is tagged with the point **currently being discussed** (the focused point). The tag can be changed per line. On the session page, the user can pick the point from a small picker. Tagged lines show in:
- the point drawer ("From meeting notes")
- the summary under that point
- the MoM under that point (as the session note)

### D2.5 "Nothing forgotten": open loops
- A line is an **open loop** if it is not linked to a task/point/decision **and** either it is an unticked to-do, or it matches the action pattern. The pattern covers English and common Hinglish:
  - English: *will, to send/share/check/prepare/call/follow up/review/update/arrange/visit/collect, need to, should, by Monday/tomorrow/next week, action, pending*
  - Hinglish: *karna hai, bhejna hai, dekh lo, karwa do, follow up karo*
  - Admins can extend the pattern list.
- Open loops are flagged on the line ("Looks like an action").
- **End meeting** shows them before ending: "3 note lines look like actions but are not tasks or points yet", with "Go back and convert them" or "End anyway".
- The **Notes › Open loops** filter lists them across all notes. A banner on the Notes page shows the count.
- An open loop still unconverted 24 hours after the meeting goes to the minute taker and organizer as a reminder. It also appears in the next session's Readiness panel.
- The user can mark a line "Not an action" to stop the flag. This is logged.

### D2.6 Saving and safety
- **Autosave** to IndexedDB on every change (debounced 300 ms) and to the server every 2 s. Status text shows "Saving…" / "Saved · 10:42" / "Offline: saved on this device".
- Works offline. Queued changes replay in order when back online (Part C3.10).
- Server keeps **versions** (every save, compacted to one per minute after a day). The user can see history and restore a line or the whole note.
- Notes are **never deleted** by ending or cancelling a meeting. Deleting a line is a soft delete with undo for 10 s, and it is kept in history.
- After **MoM publish**, session notes lock. Changes after that go in an **Addendum** block with author and time, and attendees are notified.
- Confidential meetings: notes are encrypted at field level, follow meeting membership, and are excluded from global search for non-members.

### D2.7 Meeting summary (auto)
A **Summary** button on the session (Live mode, session page and Notes) builds a structured summary from **notes + point statuses + tasks + decisions + attendance**. It is rule-based, so it works without AI.
1. **Overview:** one paragraph with the meeting, date, attendance, duration, number of backup points reviewed, new points, closed, carried forward, tasks, decisions.
2. **What was discussed:** each point with its status at the end of the meeting, its session note, and the note lines tagged to it, plus owner and due date.
3. **Decisions.**
4. **Action items:** the tasks raised in this session, with owner, due date and status.
5. **Carried forward:** open points going to the next session, flagged if carried 3+ times.
6. **Other notes:** lines not tied to a point.
7. **Open loops:** lines noted but not assigned.

Actions: **Copy** · **Share on WhatsApp/email** · **Use in MoM** (puts the overview into the MoM "Summary" section of the draft; editable) · language selector.
**P2 (AI):** "Rewrite as prose" and translate to हिन्दी/मराठी, using the AI service from B6.8. AI output is always shown as a draft for a person to accept.

### D2.8 Notes screen
- **Left:** search box, filters (All · Meetings · Mine · Open loops), list with pinned first. Each row shows the title, kind, last saved time and open-loop count.
- **Right:** the editor. Personal notes have an editable title, Pin, Share, Tags, and "Attach to meeting". Session notes link to the session and have a Summary button.
- **Mobile:** the list and the editor are separate screens. The input bar stays above the keyboard.

### D2.9 Data model
```
meet_notes(id, kind[session|personal], session_id?, meeting_id?, owner_id, title,
  visibility[meeting|private|shared], pinned, tags[], locked_at?, created_at, updated_at, version)
meet_note_blocks(id, note_id, position, type[text|todo|heading|addendum], text, done,
  author_id, created_at, updated_at, point_id?, linked_type[point|task|decision]?, linked_id?,
  not_action, deleted_at?, version)
meet_note_shares(note_id, user_id, can_edit)
meet_note_versions(id, note_id, block_id?, author_id, at, diff_json)
-- indexes: (note_id, position); (point_id); (linked_type, linked_id); full-text on text; (session_id) unique where kind='session'
```
Each converted task/point/decision stores `source_note_block_id` so the link works both ways.

### D2.10 API
```
GET  /meet/notes?kind=&q=&open_loops=true&cursor=
POST /meet/notes                         {kind:'personal', title}
GET  /meet/sessions/:id/notes            (creates if missing)
POST /meet/notes/:id/blocks              {text, type, point_id?, client_id}   -- idempotent by client_id
PATCH /meet/notes/:id/blocks/:blockId    {text?, done?, point_id?, not_action?, version}
DELETE /meet/notes/:id/blocks/:blockId
POST /meet/notes/:id/blocks/:blockId/convert {to: task|point|decision, fields...}
GET  /meet/sessions/:id/summary          → structured JSON (D2.7)
POST /meet/sessions/:id/summary/use-in-mom
WS   session:{id}  events: block.created / updated / deleted, presence
```

### D2.11 Permissions
`meet.note.view / edit / convert` come from the meeting roles: organizer, co-organizer, chair and minute taker can edit and convert; attendees can view and, if the meeting allows it, add lines. Personal notes: the owner, plus people they shared with. Admins **cannot** read personal notes (privacy). Only shared notes are visible to others.

## D3. Task management: the detail most often missed
1. **Every entry point opens the same Create task form** (T1). From a point, note line or Live mode it comes pre-filled with point, title, owner and TAT.
2. **The due date is shown live while typing the TAT**, with the skipped Sundays and holidays. If the owner is on leave over that period, the form warns.
3. **Task drawer** sections, in this order: header (code, status, flags) · status/owner/priority/supporters · dates (start, TAT, due, revised due, completed, TAT result) · description · checklist · subtasks · attachments · point link · extensions · updates/comments · activity.
4. **Updates thread:** the owner posts progress updates (text + % + attachment as proof). The latest update shows in lists and in the next session under the backup point.
5. **Follow-up loop:** every open task of a backup point is listed under that point in the next session and in Live mode, so it gets reviewed. It shows "No update since last meeting" if nothing was posted.
6. **Views:**
   - List, Kanban (by status), Calendar (by due date), and By owner (a board grouped by person, for the organizer).
   - Timeline/Gantt with dependencies (P2).
7. **Filters and saved views:** owner, meeting, department, status, due range, overdue, priority, carried. Saved per user, shareable.
8. **Bulk actions:** status, owner, due date, priority, add supporter, export.
9. **Reminders:** Due soon (1 working day before), due today (09:00), overdue daily digest, escalation matrix (Part B6.7).
10. **Reopen:** the organizer can reopen a completed task with a reason. The TAT result then becomes "Reopened".

## D4. Meeting points: the detail most often missed
1. **Session page shows two clearly separate lists:** *Backup points (carried forward)* first, then *New points*. Each row shows code, title, type, owner, due date, task progress (2/3), last update and a status dropdown.
2. **The "Raised in" and "Times carried" columns** on the meeting's All points tab.
3. **Standing points** (P2): points that come back every session by design (for example "Safety incidents"), with no TAT breach.
4. **Merge duplicate points** (P2), keeping both histories. **Link related points** across meetings.
5. **Point templates per meeting type** (for example the monthly MIS review always has "P&L vs budget").
6. The point drawer shows: description, status/owner/TAT/progress, close / escalate / drop, tasks with extension handling, pre-meeting updates, decisions, **notes from meetings**, session history timeline, comments, activity.

## D5. MoM: the detail most often missed
1. MoM **sections in order:**
   - header (company, meeting, session code, date, venue, chair, minute taker, present, absent, quorum)
   - Summary (from D2.7)
   - Backup points reviewed (with this session's note per point)
   - New points
   - Decisions
   - Resolutions (board)
   - Action items
   - Parking lot
   - General remarks
   - Next session
   - Approval and acknowledgement block
2. **MoM template designer** (P2): letterhead, logo, fonts, which sections to show, signature lines.
3. **Edit before publish:** every section is editable in the draft. Edits to point notes write back to the point history.
4. **Distribution list:** attendees + owners of items in the MoM + extra emails (for example external consultants, guest links).
5. **After publish:** locked, PDF stored, a hash stored for tamper evidence, acknowledgements tracked, and an addendum creates version 2 with a visible "Amended" label.

## D6. More features worth adding
Ranked by value for Chandak Group. P2 = next quarter, P3 = later.

| # | Feature | What it does | Phase |
|---|---|---|---|
| 1 | **Today planner** | A personal "Today" page: my meetings, my tasks due today/overdue, items waiting on me, and open loops from my notes. It's the default home on mobile. | P2 |
| 2 | **Commitment tracker** | Every promise made in meetings by a person (tasks + points + open loops) on one page, with on-time %. Managers see their team. | P2 |
| 3 | **Meeting prep pack** | 24 h before: an auto PDF/WhatsApp with agenda, backup points, latest updates, and pending tasks per attendee. | P2 |
| 4 | **WhatsApp follow-up bot** | A daily 09:00 message to each owner with their due/overdue items. Reply to update status. "note: …" saves a personal note. | P2 |
| 5 | **Topic timeline** | Pick a topic or point: see everything about it across meetings, notes, tasks and decisions on one timeline. | P2 |
| 6 | **Meeting feedback** | A 1-tap rating after each meeting (useful? on time? clear actions?) feeds the effectiveness score. | P2 |
| 7 | **Meeting cost meter** | Shows the approximate cost of the meeting (attendees × hourly cost band × duration) to discourage long, unfocused meetings. | P3 |
| 8 | **Smart scheduling** | Finds a slot when all required attendees and a room are free, respecting leave and holidays. | P2 |
| 9 | **Risk register** | Risk-type points with likelihood × impact, owner and mitigation tasks, as a heat map for management. | P3 |
| 10 | **Q&A / suggestions before the meeting** | Attendees submit questions or topics. The organizer accepts them into the agenda. | P3 |
| 11 | **QR / kiosk attendance** | A room QR code: scan to mark present, and late after 10 min. | P2 |
| 12 | **External follow-up email** | Drafts a follow-up email to a customer/vendor from a client meeting's decisions and actions. | P3 |
| 13 | **Hand-over note** | When a point/task changes owner, the old owner must add a hand-over note, shown to the new owner. | P2 |
| 14 | **Weekly "my promises" digest** | A Monday email: what you committed to last week, what's done, and what's slipping. | P2 |
| 15 | **Meeting load per person** | Hours in meetings per week per person and department, with alerts above a limit. | P3 |
| 16 | **Print-friendly agenda and MoM** | One-click A4 print for meetings without screens (plants). | P1 |
| 17 | **Template library for notes** | Note templates per meeting type (for example Plant safety: incidents / near misses / PPE / training). | P2 |
| 18 | **CRM/ERP links** | Link client-meeting points to the customer/dealer record, and finance points to ledger codes. | P3 |

## D7. Screens to add or fix (summary for the UI)
1. Left menu: **Notes** (between Calendar and Decisions).
2. Live mode centre column: the focused point card, then **Running notes**, then the all-points strip and quick capture.
3. Session page left column: Backup points · New points · (Resolutions) · (AI) · **Meeting notes** · General remarks.
4. End-meeting modal: summary counts, the carry-forward list and the **open-loops warning**.
5. Notes page (D2.8). Summary panel (D2.7).
6. Point drawer: a "From meeting notes" section.
7. Create task form: accepts a pre-filled title, owner and TAT from notes and Live mode.
8. Global search: a Notes section.

## D8. Notifications to add
| Event | To | Channel |
|---|---|---|
| `meet.note.open_loops` (24 h after the meeting) | Minute taker, organizer | In-app, email |
| `meet.note.mention` (`@name` in a note line) | Mentioned user | In-app, WhatsApp |
| `meet.note.shared` | Recipient | In-app, email |
| `meet.summary.shared` | Attendees | Email, WhatsApp |
| `meet.task.no_update` (open task with no update since last session, 1 day before the next session) | Owner | WhatsApp, email |

## D9. Build order for Part D
1. Fill the D1 audit (D0).
2. Fix ❌/🟡 in **Tasks** (D1.3 + D3) and **Points** (D1.2 + D4). These are the core loop.
3. **Notes:** data model and API → session notes card in Session and Live → line conversion → auto-tag to point → open loops + end-meeting warning → Notes page + personal notes → search → offline/autosave hardening.
4. **Summary** (D2.7) and "Use in MoM".
5. **MoM** gaps (D1.4 + D5).
6. Notifications (D8).
7. Then D6 features, by phase.

## D10. Acceptance tests (Part D)
1. In Live mode, type 10 lines in 60 seconds without touching the mouse. All 10 are saved with times. Each is tagged to the point on screen at that moment.
2. Turn off the network, type 5 lines, reload the page, turn the network on. All 5 lines are there and synced, with no duplicates.
3. `/task Send dealer list to legal @Vikram 2d` opens Create task with title "Send dealer list to legal", owner Vikram Rathi, TAT 2. The due date skips Sunday. On save, the line shows "Task TSK-… · Not started".
4. `/point Akola depot stock audit @Neha 3d` creates point PT-… owned by Neha with a due date 3 working days ahead, listed under New points.
5. "Neha will share recovery sheet by Monday" is flagged "Looks like an action". End meeting lists it under open loops. After converting it, the flag disappears.
6. The summary for a session lists every point with its end status, the tagged note lines, decisions, action items, carry-forward and open loops. "Use in MoM" puts the overview into the MoM draft.
7. After MoM publish, session notes can't be edited. An addendum is added with author and time, and attendees are notified.
8. A personal note is not visible to anyone else, including admins, until shared.
9. Searching "Akola" finds the note line, the point and the task.
10. The audit file `docs/meet-gap-audit.md` shows ✅ for every D1 row.

---

# PART E: Module-level administration, alerts and SLA, custom email templates, meeting acceptance, attendance, AI MoM

Version 5.0 · 25 Oct 2026. Part E closes the gaps found after the first build. Where it differs from Parts A to D, **Part E wins**. Prototype: **Meet settings** in the left menu, **Workspace admin** under its own heading, the **Invitations** card on a scheduled session, the **Attendance** card in a running session, and the **AI minutes** card after "End meeting".

## E0. The rule: each module manages its own settings

| Lives in **Workspace admin** (shared by all modules) | Lives **inside each module** (Meet settings, later HR settings, Purchase settings…) |
|---|---|
| Users, invites, sign-in, MFA, SSO, sessions | The module's **roles and permission matrix** (Meet Admin, Meet User, Department Head, Plant Supervisor, custom roles) |
| Workspace roles only: Super Admin, Admin, Company Admin, HR Admin, Management, Auditor, Guest | **Who has which module role** (assign, change scope, remove) |
| Companies, locations, departments, designations, holidays | The module's **policies** (E1.3) |
| Shared channels: email sender, WhatsApp number, SMS, push | The module's **alert rules, SLA policies, escalation matrix** (E2) |
| Account emails (invite, password, new device) | The module's **email/WhatsApp templates** (E3) |
| Audit log (all modules), delivery log (all modules) | Module masters: meeting types, categories and TAT, templates, custom fields, workflow rules, import |
| **Modules** page: switch modules on/off per company, see module admins, open module settings | |

How it works:
1. **Module registry.** Each module registers on start-up: `key`, name, its permissions (`meet.*`), its default roles, policy definitions, notification events with default templates, and its settings screen. Workspace admin reads this registry. Nothing in Workspace is hard-coded per module.
2. **Delegated admin.** The *Meet Admin* role can manage everything in Meet settings **without** any Workspace admin rights. A Workspace Admin/Super Admin can also open any module's settings.
3. **Workspace roles appear read-only inside modules.** For example, Meet settings shows what *Management* and *Auditor* can do in Meet, marked "Managed in Workspace admin". It can't be edited there.
4. **Effective permission** = Workspace role permissions ∪ module role permissions (scoped) ∪ record-level meeting roles (organizer, chair, minute taker, attendee, owner). Confidential meetings go by membership only.
5. Data model change: `core_roles.module_key` (null = workspace role). `core_permissions.module_key`. New `core_module_settings(module_key, key, value_json, updated_by, updated_at)`. `core_notification_events.module_key` and `core_notification_templates.module_key`. All exist so every future module gets the same screens for free.
6. Permissions: `core.module.view/manage` (Workspace), and per module `meet.settings.manage`, `meet.roles.manage`, `meet.alerts.manage`, `meet.templates.manage`.

### E1. Meet settings › Roles and access
#### E1.1 Role list and matrix
- Left: Chandak Meet roles (system + custom) with user counts, "+ New role / clone". Below: "From Workspace (read-only)" roles that have any Meet permission.
- Right: a permission matrix of Meet resources × View, Create, Edit, Delete, Approve, Export, Manage. Each cell is All / Scoped / Own / none. Saving shows "affects N users" and is audit-logged with a before/after diff.
- Resources:
  - Meetings and sessions
  - Run meeting (Live mode, attendance)
  - Minutes (MoM)
  - Points
  - Tasks and extensions
  - Decisions and resolutions
  - Notes
  - Reports
  - Meet settings
  - Roles and access
  - Alerts and SLA
  - Templates

#### E1.2 People in Chandak Meet
A table of active users with a **Meet role** dropdown (No access / Meet User / Department Head / Plant Supervisor / Meet Admin / custom) and scope. Changing it takes effect within a minute and notifies the user. Default for new users: Meet User (setting).

#### E1.3 Meeting policies (module-wide, each one a setting with a default)
| Policy | Default |
|---|---|
| Who can create meetings | All Meet users |
| Attendees can add points during a meeting | Yes |
| Attendees can write in running notes | Yes |
| Department heads see all meetings of their department | Yes |
| Meeting types that are always confidential | Board, HR disciplinary |
| External guests | Allowed with a magic link |
| MoM needs chair approval for | Board and Review meetings |
| Who can delete a meeting | Meet Admin only |
| Who can export reports | Meet Admin and Management |
| Who approves TAT extensions | Organizer |
| Who can see personal notes | Only the author and people it is shared with (not admins) |
| Who can change a closed point | Organizer and Meet Admin (with reason) |
| Max attendees per meeting | 100 |

Every server action checks the policy as well as the permission. Policies can be overridden **per meeting type** (P2), e.g. Board meetings: attendees can't add points.

## E2. Alerts, SLA, warnings and escalation (Meet settings › Alerts and SLA)

### E2.1 Concepts
- **Alert rule:** *when* (event or schedule) + *only if* (conditions) + *to* (recipients) + *channels* + *timing* + *template*.
- **SLA policy:** a time limit for something that must happen (task done, update given, MoM sent, invite answered, extension decided). It has reminder points, a warning point and escalation steps.
- **Escalation matrix:** who is told at each level (L1 owner → L2 reporting manager → L3 department head → L4 management) and after how long.
- All clocks count **working time** from the Part B/C working calendar: Mon to Sat, 09:00 to 18:00, holidays skipped. Approved extensions move the clock. "On hold" can pause the clock if the policy allows (needs a reason; reported).

### E2.2 Default SLA policies (editable; new ones can be added)
| Applies to | Time limit | Reminder | Warning | On breach / escalation |
|---|---|---|---|---|
| Critical points and tasks | From TAT (default 2 working days) | 1 working day before + 09:00 on due date | At 50% of TAT with no update | Owner at breach → manager +1 day → department head +2 → management +4 |
| High priority | From TAT (default 3) | 1 working day before | At 75% of TAT with no update | Owner at breach → manager +3 → department head +5 → management +10 |
| Medium and low | Category default TAT | 1 working day before | — | Owner +1 → manager +4 → department head +6 → management +11 |
| Compliance category | 3 working days | 2 working days before | At 50% | Owner at breach → department head same day → management +1 |
| Pre-meeting update | 2 h before the meeting | 24 h before | 4 h before | Organizer sees "not updated" at meeting start |
| Invite response | Before the meeting | 48 h and 24 h before | — | Organizer gets the non-responder list 24 h before |
| MoM sent | Within 4 working hours of meeting end | — | At 2 h | Organizer at 4 h → department head at 1 day |
| MoM acknowledgement | 2 working days | Day 1 | — | Organizer on day 3 |
| TAT extension decision | 1 working day | — | — | Auto-escalates to the organizer's manager |

SLA policy fields: name, applies to (item type, priority, category, meeting type, department), time limit (fixed or from TAT), reminders (list of offsets), warning (percentage used or offset; optionally "only if no update"), escalation steps (offset + level + recipients), pause rules, channels per step, template per step, active flag.

### E2.3 SLA engine
- Every point, task, session, invite and MoM gets an `meet_sla_instances` row when it starts: policy, start, due, paused time, state (`ok | warning | breached | met`), current level, and the next check time.
- A scheduled job runs every 5 minutes. It only picks rows whose `next_check_at <= now` (indexed). It moves state, raises events (`meet.sla.reminder`, `meet.sla.warning`, `meet.sla.breached`, `meet.sla.escalated`) and sets the next check. Each step fires **once** (idempotent key = instance + step).
- When the item is done, the instance is closed as `met` or `breached`, with the delay in working hours. This feeds TAT compliance and owner performance reports.
- An escalated item shows a badge "Escalated L2 · to Rohit Jain" everywhere it appears. The escalation recipient can **Acknowledge**, **Reassign**, **Extend** or **Comment**. Acknowledging stops repeats at that level.
- The Alerts and SLA screen shows live counts: In warning now · SLA breached · Escalated L2+ · Alerts sent this week, each clickable to the list.

### E2.4 Alert rules (defaults; admins can add, edit, switch off)
| When | To | Channels | Timing | Template |
|---|---|---|---|---|
| Meeting invite sent | Attendees | Email, WhatsApp, calendar | Immediately | Meeting invitation |
| No reply to invite | Non-responders | Email, WhatsApp | 48 h and 24 h before | Invite response reminder |
| Meeting reminder | Accepted + maybe | In-app, WhatsApp | 15 min before | Meeting reminder |
| Pre-meeting update needed | Owners of backup points | Email, WhatsApp | 24 h before | Pre-meeting update request |
| Task assigned | Owner, supporters | In-app, email, WhatsApp | Immediately | Task assigned |
| SLA warning | Owner | In-app, WhatsApp | Per SLA | SLA warning |
| SLA breached / escalation level change | Per escalation matrix | Email, WhatsApp | Per SLA | Escalation |
| Overdue digest | Owners with overdue items | Email | Daily 09:00 | Overdue digest |
| Absent from meeting | Absent attendees | Email | When MoM is sent | You missed a meeting |
| AI minutes ready | Minute taker, organizer | In-app, email | When the meeting ends | AI minutes ready |
| MoM published | All attendees + item owners | Email (PDF), WhatsApp | On publish | MoM published |
| Point carried 3 times | Department head | Email | At carry-forward | Point carried 3 times |

**Rule builder ("+ New alert"):**
- **When:**
  - Any registered event, e.g. point status changes, task due in N working days, task completed, carried forward, meeting ends, MoM not acknowledged, extension requested, invite declined, attendee absent twice in a row.
  - Or a schedule.
- **Only if:** conditions on any field (priority, category, meeting type, department, amount custom field…).
- **To:** owner, supporters, organizer, chair, minute taker, all attendees, absent attendees, non-responders, owner's manager, department head, management, specific people, user groups.
- **Channels:** email, WhatsApp, in-app, SMS.
- **Timing:** immediately / in digest / after N working hours if still true.
- **Template:** pick an existing template or create a new one.

**Throttling:** at most 1 alert per rule per item per 4 h. Digest mode bundles items. Quiet hours hold WhatsApp/SMS until 08:00 (escalations can bypass if set). Users can mute non-mandatory alerts in their preferences (Part A7.4).

## E3. Custom email and WhatsApp templates (Meet settings › Email templates)
- **Every alert sends from a template.** No email text is hard-coded. Each module owns its templates; Workspace admin owns account templates.
- **Template fields:**
  - Name, the event it's used for ("Sent when"), default recipients, channels.
  - Language versions (English / हिन्दी / मराठी).
  - Subject, body, the option to attach the MoM PDF, active flag, version history.
- **Editor:**
  - Subject and body.
  - Clickable **merge-field palette** for the event: `{{user.first_name}}`, `{{meeting.title}}`, `{{session.date}}`, `{{item.code}}`, `{{item.due}}`, `{{item.overdue_days}}`, `{{sla.level}}`, `{{owner.name}}`, `{{summary}}`, `{{my_items}}`, `{{agenda}}`…
  - Buttons written as `[Label]`, which map to signed deep links such as Accept / Decline / Open item / Update now / Ask for more time.
  - Simple formatting (bold, lists, links).
  - Optional conditional blocks: `{{#if item.priority == 'critical'}}…{{/if}}`.
- **Live preview** with sample data, **Send test to me** (email + WhatsApp), **Save = new version** (rollback any time).
- **"+ New template"** creates a custom template (`meet.custom.N`). An alert rule can also create one ("+ Create a new template" in the rule form).
- **Validation:** an unknown merge field blocks saving, missing translations fall back to English, and email bodies are sanitised.
- **WhatsApp:** each WhatsApp template maps to a Meta-approved template. The editor shows its approval status, and variables are limited to what Meta allows. Unapproved ones fall back to email.
- **Branding:** all emails use the Workspace header/footer (Part A6) plus the company letterhead for MoM.
- **Tables:** `core_notification_templates(id, module_key, key, name, event_key, channel, language, subject, body, attach_mom, version, is_active, wa_template_name?, wa_status?, updated_by, updated_at)`, `meet_alert_rules(id, name, event_key | schedule_cron, conditions_json, recipients_json, channels[], timing, template_key, throttle_hours, active)`.

## E4. Meeting acceptance (RSVP)
- **Invite email and calendar invite** carry one-click buttons: **Accept · Maybe · Decline · Propose new time**. These are signed links, valid until the meeting ends; no sign-in is needed for one click, but sign-in is needed to change the answer later. Replies from Google/Outlook calendars (iCalendar REPLY) are read too (P2). WhatsApp: reply 1/2/3.
- **Decline** asks for a reason (sent to the organizer). It can name a **delegate**, who is then invited with the same role. A decline with a reason makes the attendance "Excused".
- **Propose new time:** date-time plus a note. The organizer sees it on the Invitations card and can **Move meeting** in one click. Everyone is re-invited and asked to answer again.
- **Invitations card** on a scheduled session (replaces the attendance list until the meeting starts):
  - Counts: Accepted · Maybe · Declined · New time proposed · No reply.
  - A per-person row with their note and delegate.
  - "Remind N who haven't replied".
  - Your own response bar.
- **Home** upcoming sessions show ✓ accepted, ? maybe, ✗ declined, … no reply.
- **My Work › Waiting on me** lists invites you haven't answered.
- **Quorum warning** (board/committee): if accepted + maybe < quorum 24 h before, the organizer is warned and can reschedule.
- **Table:** `meet_invitations(session_id, user_id, response[pending|accepted|tentative|declined|proposed], responded_at, note, delegate_user_id, proposed_start, channel[email|calendar|whatsapp|app], reminder_count)`.

## E5. Attendance
- **Statuses:** Present, Late (checked in more than 5 minutes after start; configurable), Absent, Excused (declined with a reason, or on approved leave from HR).
- **Ways to check in:**
  1. **Room QR:** a code shown on the room screen that rotates every 60 s. Scanning signs the person in with their Workspace account. Location check (P2) uses the office Wi-Fi/IP or GPS radius.
  2. **Video join:** joining the Google Meet / Teams / Zoom link marks them present, with join and leave times, via the integration (P2).
  3. **Self check-in** button in the app (within ±15 min of start, if allowed).
  4. **Marked by the minute taker** in Live mode.
- **Pre-filled at start:** declined → Excused, on leave → Excused, others → Absent until they check in. The prototype pre-fills everyone as present for demo purposes; the real app waits for the check-in.
- **Stored per person:** check-in time, method, minutes late, leave time (for video), and who marked it.
- **Shown in:**
  - Live mode (P/L/A/E buttons, check-in in the tooltip).
  - The session page (time · method · minutes late).
  - The MoM (Present / Absent / Excused lists).
  - Reports: attendance by person and meeting, punctuality, "absent twice in a row" (which can trigger an alert).
- **Board mode:** quorum counts only Present + Late.
- **Table:** `meet_attendance(session_id, user_id, status, check_in_at, check_in_method[qr|video|self|manual], late_minutes, left_at, marked_by)`.

## E6. AI minutes after the meeting and automatic MoM to everyone
### E6.1 Flow
1. **End meeting** → carry-forward runs (Part B6.4) → session status `completed`.
2. The **AI minutes job** starts at once (background queue). Its inputs:
   - running notes (Part D2), with lines tagged to points
   - pre-meeting updates
   - status changes during the meeting
   - tasks and decisions created in this session
   - attendance
   - the transcript, if a recording exists (Part B6.8)
3. Output:
   - an **overview** paragraph
   - a **summary for each point** (what was discussed, what was decided, actions with owner and due date, end status, carried forward or closed)
   - a list of **open loops** (note lines not yet assigned)
4. The minute taker and organizer get **AI minutes ready**. The session page shows the **AI minutes** card. Every summary is editable; buttons: Regenerate, Hold auto-send, **Approve and send MoM to N people**.
5. On approve: each point summary is saved as that point's note for this session (so it appears in the point history and the MoM). The MoM PDF is generated and **sent to everyone**: all attendees (present, absent, excused), every owner of a point or task in the MoM, the chair, and extra recipients. It goes by email with the PDF attached (template *MoM published*) and on WhatsApp. Absent people also get *You missed a meeting*. If the meeting needs chair approval, it goes to the chair first, and is sent to everyone once approved.
6. **Modes** (Meet settings › Alerts and SLA › After the meeting ends):
   - **Review first** (default): nothing is sent until a person approves.
   - **Auto-send:** sent automatically 30 min after the meeting ends (configurable) unless someone edits or presses Hold.
   - **Off:** manual MoM.
7. SLA "MoM sent within 4 working hours" applies (E2.2).

### E6.2 AI rules
- Use the model service chosen in B13. The prompt includes **only** this session's data and the meeting's confidentiality level. Confidential meetings use a provider/setting with no data retention, or are excluded (setting).
- Each point summary is at most 80 words, in plain business English (or the meeting's language), with no invented facts. Every sentence must come from a note line, update, task, decision or status change. Keep internal source references so a reviewer can click "why?" (P2).
- Hinglish/Marathi notes are understood; the output follows the language setting, and an English copy is always kept.
- Without AI (no key, or AI turned off), the same structure is built by rules from the same data (as in the prototype). The feature never blocks the MoM.
- Store `meet_ai_minutes(session_id, version, overview, items_json[{point_id, text, sources[]}], model, created_at, approved_by, approved_at, sent_at, mode)`.

## E7. Prototype changes delivered with Part E
1. Left menu: **Meet settings** inside Chandak Meet; **Workspace admin** under its own *Workspace* heading.
2. Workspace admin: Users, Invites, **Workspace roles** (module roles removed), **Modules**, Organisation, Security, Email templates (account emails only), Delivery log, Audit log.
3. Meet settings: **Roles and access** (Meet roles matrix, read-only Workspace roles, meeting policies, people and their Meet role) · **Alerts and SLA** (live counts, after-the-meeting mode, SLA policies, escalation matrix, alert rules with "+ New alert") · **Email templates** (custom template builder with merge-field palette, recipients, channels, preview, "+ New template") · General · Workflow rules · Meeting templates · Custom fields · Import from Zoho.
4. Scheduled session: **Invitations** card with responses, reasons, delegate, proposed time ("Move meeting" for the organizer), reminders, and your own Accept/Maybe/Decline/Propose bar. Home shows ✓ ? ✗ … counts. My Work › Waiting on me shows unanswered invites.
5. Running session: **Attendance** card with Present/Late/Absent/Excused, check-in time and method, and a **Check-in QR** button.
6. After End meeting: **AI minutes** card with an overview and a summary per point, editable, then **Approve and send MoM to N people**.

## E8. Build order for Part E
1. Module registry + `module_key` on roles, permissions, events, templates, settings (E0). Move the Meet roles screen into Meet settings.
2. Meet policies (E1.3) enforced in the API.
3. Template engine + editor (E3). Move every existing hard-coded email into templates.
4. Alert rules engine (E2.4) on top of `notify()`.
5. SLA instances + engine + escalation actions (E2.2, E2.3).
6. RSVP (E4), then attendance check-in (E5).
7. AI minutes + auto MoM distribution (E6).
8. Update the D1 audit file with the Part E rows below and mark them.

| # | Feature (add to `docs/meet-gap-audit.md`) |
|---|---|
| E-1 | Meet settings inside the module; Meet Admin can manage roles, policies, alerts and templates without Workspace admin rights |
| E-2 | Workspace admin shows only workspace roles + Modules page |
| E-3 | Meeting policies enforced server-side |
| E-4 | SLA policies with reminder, warning and escalation steps, counted in working time |
| E-5 | Escalated badge + acknowledge/reassign/extend actions |
| E-6 | Alert rule builder; every alert uses a template |
| E-7 | Custom templates with merge fields, preview, test, versions, languages |
| E-8 | RSVP with one-click email buttons, decline reason, delegate, propose new time |
| E-9 | Attendance by QR, video join, self, manual; late and excused |
| E-10 | AI minutes per point after the meeting; review or auto-send; MoM PDF to everyone; "you missed" to absentees |

## E9. Acceptance tests (Part E)
1. A user with only *Meet Admin* opens Meet settings, changes the Meet User matrix and a policy, and assigns Priya the Meet Admin role. They **cannot** open Workspace admin. Every change appears in the audit log.
2. A Workspace Admin sees Chandak Meet on the Modules page and can open Meet settings from there.
3. A critical task with TAT 2 created Monday 10:00: warning Tuesday ~10:00 if no update; breach Wednesday 10:00 → owner; Thursday → manager. Sunday and holidays are skipped. Each alert is sent once.
4. Approving an extension moves all pending SLA steps for that task.
5. A new alert "Task due in 1 working day → owner → WhatsApp → template *Dealer visit reminder*" fires for a matching task, and the message shows the merged fields.
6. Editing a template and saving creates version 2. The next alert uses version 2. Rolling back to version 1 works.
7. The invite email's Decline button with reason and delegate: the organizer sees the reason, the delegate is invited, and attendance becomes Excused at the start.
8. A proposed new time → "Move meeting" → everyone re-invited; old answers reset except declines.
9. Scanning the room QR 8 minutes after start marks the person Late (8 min) with method QR.
10. Ending a meeting with 5 points produces AI minutes with 5 point summaries within 60 seconds. "Approve and send" emails the PDF to every attendee and item owner, and absentees also get "You missed a meeting". In auto-send mode with no action, it sends after 30 minutes.
11. With AI switched off, ending a meeting still produces the rule-based per-point summary.

---

# PART F: Meeting rooms: booking, Microsoft Teams / Outlook sync and room displays

Version 6.0 · 25 Oct 2026. **Goal:** when someone books a room while scheduling in Chandak Meet, the room is really booked in Microsoft 365. The Teams/Outlook calendars show it, and the **room's display panel outside the door shows "Booked by Rohit Jain · Weekly Sales Review · 10:30–11:30"**, exactly like booking from Teams today. Rooms without a Teams panel get our own display page on a cheap tablet.

## F0. How it works (short version)
1. Every physical meeting room already exists in Microsoft 365 as a **room resource mailbox** (e.g. `boardroom.ho@chandakgroup.com`). Teams Rooms panels, Teams displays and Outlook all read that mailbox's calendar.
2. When a meeting is saved in Chandak Meet with a room, the server creates the meeting **in Microsoft 365 through Microsoft Graph**: an event in the organizer's Outlook calendar with the attendees, a **Teams meeting link**, and the **room mailbox added as a resource attendee and as the location**.
3. The room mailbox auto-accepts if it is free. Its calendar now holds the booking, so **every Teams panel / room display shows it automatically**, with the organizer's name and the subject. No custom work on the panels is needed.
4. Chandak Meet stores the Microsoft event id and keeps both sides in sync (F4). Changes and cancellations in Chandak update Microsoft 365; room declines and changes made in Outlook come back to Chandak.

## F1. One-time setup (IT, with a Microsoft 365 admin)
1. **App registration** in Microsoft Entra ID for Chandak Workspace (the same app used for Microsoft SSO in Part A3, if chosen).
2. **Graph permissions:**

| Permission | Type | Why |
|---|---|---|
| `Calendars.ReadWrite` | Delegated | Create/update the event in the organizer's own calendar when they're signed in with Microsoft SSO (preferred) |
| `OnlineMeetings.ReadWrite` | Delegated | Teams link |
| `Calendars.ReadWrite` | Application | Background sync, and meetings created by people who signed in with a password |
| `Place.Read.All` | Application | List rooms, buildings, capacity, equipment |
| `User.Read.All` | Application | Match workspace users to M365 users |

Admin consent is required. Lock application access to **only staff and room mailboxes**, not the whole tenant: use an Exchange **Application Access Policy** (`New-ApplicationAccessPolicy` scoped to a mail-enabled security group) or RBAC for Applications.
3. **Room mailboxes:** make sure each room is a room mailbox, with capacity and equipment set (`Set-Place`), and grouped into a **room list** per building (HO, Plant 1, Plant 2…).
4. **Show organizer and subject on the panels.** By default Exchange room mailboxes hide the subject and show only the organizer. Choose per room:
   - Show "Rohit Jain" only (default; good for HR/board rooms).
   - Show "Rohit Jain – Weekly Sales Review": `Set-CalendarProcessing -Identity <room> -DeleteSubject $false -AddOrganizerToSubject $true`.
   - Also `-AutomateProcessing AutoAccept -AllowConflicts $false`. Optionally `-BookingWindowInDays 180 -MaximumDurationInMinutes 480`.
   - **Confidential meetings** (board, HR disciplinary) always send the subject as "Private meeting" and the event is marked `sensitivity: private`, so panels show only the organizer.
5. **Teams Rooms panels / Teams displays** need nothing extra: they already show the room mailbox calendar. Check-in and auto-release are configured on the panel (Teams admin center) or handled by Chandak (F5).
6. In **Meet settings › Rooms**, the Meet Admin presses **Sync rooms from Microsoft 365**. Rooms are imported with name, email, capacity, building, equipment. The admin then sets the Chandak-only fields (F3).

> **If Chandak uses Google Workspace instead:** use Google Calendar **resources** (Admin SDK Directory `resources.calendars`), add the resource calendar as an attendee via the Calendar API, use `conferenceData` to create a Meet link, and use Google meeting room hardware / our display page. The rest of Part F is the same.

## F2. Booking a room while scheduling (Create meeting / Reschedule)
- The **Room** field shows the rooms the user may book (F3 policies). Each row shows building, capacity, equipment (VC, projector, whiteboard) and **live availability** for the chosen date and time: "Free", "Busy 10:00–11:00 (Neha Agarwal)", or "Too small for 12 people".
- Availability comes from **Graph `getSchedule`** for all candidate room emails in one call, cached for 60 s. A busy room shows who has it, subject hidden if private.
- **Suggestions:** "Board Room is busy. Conference Room 2 (10 seats, VC) is free", plus "next free slot for this room: 12:00".
- **Recurring meetings:** check every occurrence for the next 12 weeks. Show conflicts ("3 of 12 dates clash: 9 Nov, 16 Nov, 23 Nov") with options: pick another room for those dates, skip those dates, or book anyway as tentative.
- **Teams link:** "Create Teams meeting" on by default for Hybrid/Online. The link and dial-in come back from Graph and are stored on the session.
- **On save** (one server transaction, then a job):
  1. Save the meeting/session in Chandak with `room_booking.status = pending`.
  2. Create the event via Graph `POST /users/{organizer}/events` (or `/events` on the organizer's behalf) with:
     - subject = meeting title (or "Private meeting")
     - body = agenda + "Managed in Chandak Meet" + a deep link
     - start/end in `India Standard Time`
     - attendees (required/optional) + the room (`type: resource`)
     - `location` = room display name + `locationEmailAddress`
     - `isOnlineMeeting: true`, `onlineMeetingProvider: teamsForBusiness`
     - `allowNewTimeProposals: true`
     - `transactionId` = Chandak booking id (prevents duplicates on retry)
     - for recurring meetings, a `recurrence` pattern matching the series
  3. Store `external_event_id`, `iCalUId`, Teams join URL.
  4. Within ~10 s, read the room's response (`attendees[room].status.response`): **accepted** → booking `confirmed` (green "Room confirmed"); **declined** → booking `declined`, the organizer is told at once with alternatives; **none/tentative** → `pending` until a webhook arrives (F4).
- **Who gets invites:** Microsoft 365 sends the Outlook/Teams invites (so they land in everyone's Outlook and Teams calendar), and Chandak sends its own invite email with the Accept/Decline buttons (Part E4) **only to people without M365 mailboxes** (guests). This avoids double invites. RSVPs made in Outlook/Teams sync back to Chandak's Invitations card (F4).
- **Reschedule / cancel / change attendees in Chandak** → `PATCH` / `cancel` on the Graph event. The room calendar and the panel update within seconds.
- **Ad-hoc "Meet now"** in Chandak with a room books from now until the end time, if the room is free.

## F3. Room master and policies (Meet settings › Rooms)
| Field | Notes |
|---|---|
| Name, building/location, floor | From M365, editable display name |
| Room email (M365) | Link to the room mailbox |
| Capacity, equipment | From M365 (`Set-Place`), editable |
| Display type | Teams panel · Chandak display (F6) · None |
| Who can book | Everyone / selected departments / selected roles (e.g. Board Room: Management + their assistants) |
| Needs approval | Off / approver (e.g. Admin department). Booking stays tentative until approved |
| Max duration, booking window | e.g. 4 h, 90 days ahead |
| Buffer | e.g. 10 min cleaning/set-up between bookings (blocked on the room calendar) |
| Check-in required | On/off · release after N minutes without check-in (default 10) |
| Show subject on display | Yes / organizer only |
| Photo, how to reach, AV instructions | Shown in the booking and on the display |

Room bookings are also visible in **Calendar › Rooms view**: a timeline of rooms × hours for a day, with click-to-book.

## F4. Two-way sync with Microsoft 365
- **Webhooks:** a Graph change-notification subscription on each room mailbox calendar (`/users/{room}/events`) and on events created by Chandak in organizers' calendars. Subscriptions for Outlook events expire after about 3 days, so a job **renews them daily**. Notifications are validated (client state + optional encrypted resource data) and processed on the job queue.
- **Fallback:** a **delta query** (`/users/{room}/calendarView/delta`) every 15 minutes catches anything missed.
- **What syncs back:**

| Change in Microsoft 365 | What Chandak does |
|---|---|
| Room declines or later removes the booking | Booking `declined`, organizer alerted with free alternatives, session shows "No room" |
| Organizer moves the meeting in Outlook/Teams | Session time updated in Chandak, logged ("Moved in Outlook by Rohit Jain"), attendees told by M365 |
| Organizer cancels in Outlook/Teams | Session marked cancelled in Chandak; points are **not** lost and stay with the next session |
| Attendee replies Accept/Tentative/Decline in Outlook/Teams | Invitations card updated (Part E4) |
| Someone books the room directly in Outlook/Teams | Shown as busy in Chandak's room picker and rooms timeline (not imported as a Chandak meeting) |
| Teams meeting attendance report (P2) | Used for video check-in (Part E5) |

- **Conflict rule:** Chandak is the source of truth for the agenda, points, tasks and MoM. Microsoft 365 is the source of truth for **time, room and Outlook replies**.
- **Import a Teams meeting** (P2): "Track this in Chandak Meet" on any Outlook/Teams meeting (from the Chandak add-in or by pasting the Teams link) creates the Chandak meeting linked to the same event.
- **Outlook / Teams add-in** (P3): a Chandak Meet side panel inside Outlook and Teams meetings showing the agenda, backup points and notes.

## F5. Check-in and no-show release
- Check-in by any method in Part E5 (room QR, Teams Room join, self, minute taker) marks the room booking `checked_in`.
- If the room requires check-in and nobody checks in within N minutes (default 10), Chandak **releases the room**. It removes the room from the event (`PATCH` attendees/location) or declines on the room's behalf, the panel shows the room free, and the organizer gets "Room released: no check-in". Teams panels with their own check-in/auto-release can do this instead. Choose one per room, not both.
- **End early:** "End meeting" in Chandak (or "End" on the panel) shortens the room booking to now, so the room shows free.
- **Extend:** in Live mode "Extend 15 min" if the room is free next (checked live).
- Reports: room utilisation (booked hours vs used), no-show rate, peak hours, most-booked rooms, meetings without a room.

## F6. Chandak room display (for rooms without a Teams panel)
A full-screen web page per room, `https://workspace.chandakgroup.com/rooms/{roomId}/display`, made for a wall-mounted Android tablet (10") in kiosk mode.

**Shows:**
- A big status band: **Green "Available until 12:00"** / **Red "In use"** / **Amber "Starting soon"**.
- **Current meeting:** title (or "Private meeting"), **booked by: name and photo**, time range, a progress bar. For example: *Weekly Sales Review · booked by Rohit Jain · 10:30–11:30*.
- **Next meetings** today, with organizer and time.
- A day timeline (free/busy).
- A **QR code to check in** (rotates every 60 s, Part E5) and a **Check in** button.
- **Book now** (15/30/60 min, if free) after scanning the QR with the Chandak app, so we know who booked.
- **End meeting / Extend** for the person who checked in.
- The room name, capacity, equipment and a "Report a problem" button (raises a Helpdesk ticket later).

**Technical:**
- Device login with a **device token** created in Meet settings › Rooms › "Pair display" (QR pairing). It is limited to that room's read access and the check-in/book-now actions. No user session lives on the tablet.
- Live updates over WebSocket (Part C8), with a full refresh every 5 minutes and an auto reload at 03:00. Works offline for 10 minutes (shows the last known schedule with an "Offline" badge).
- Dark, high-contrast, readable from 3 m. Burn-in protection: the layout shifts slightly every minute and the screen dims outside working hours.
- The same page can run on a TV in the lobby as **"Today's meetings"** for all rooms in a building.

## F7. Data model
```
meet_rooms(id, location_id, name, floor, capacity, equipment[], m365_email UNIQUE, m365_place_id,
  display_type[teams_panel|chandak_display|none], bookable_by_json, approval_user_id?,
  max_duration_min, booking_window_days, buffer_min, checkin_required, release_after_min,
  show_subject, photo_url, notes, active)
meet_room_bookings(id, session_id, room_id, start_at, end_at,
  status[pending|confirmed|tentative|declined|checked_in|released|ended|cancelled],
  external_event_id, ical_uid, teams_join_url, booked_by, approved_by?, checked_in_at, released_at,
  last_synced_at, sync_error?)
meet_room_devices(id, room_id, device_token_hash, label, paired_by, paired_at, last_seen_at, revoked_at)
core_external_calendar_subscriptions(id, provider, resource, subscription_id, client_state_hash, expires_at, last_renewed_at)
-- indexes: meet_room_bookings(room_id, start_at), (session_id), (external_event_id); exclusion constraint
-- (Postgres) on (room_id, tstzrange(start_at,end_at)) WHERE status IN ('pending','confirmed','checked_in','tentative') to stop double booking
```

## F8. API
```
GET  /meet/rooms?location=&capacity_min=&equipment=
GET  /meet/rooms/availability?rooms=..&start=..&end=..      (Graph getSchedule, cached 60 s)
GET  /meet/rooms/suggest?start=&end=&attendees=&needs=vc
POST /meet/sessions/:id/room-booking  {room_id}             → creates/updates the Graph event
DELETE /meet/sessions/:id/room-booking
POST /meet/rooms/:id/checkin  {method, token?}
POST /meet/rooms/:id/book-now {minutes}                    (display, after QR auth)
POST /meet/rooms/:id/end-early   POST /meet/rooms/:id/extend {minutes}
GET  /meet/rooms/:id/display  (device token)  + WS room:{id}
POST /integrations/m365/webhook   (Graph change notifications; validation token handshake)
POST /admin/meet/rooms/sync-m365
```

## F9. Alerts and templates (add to Part E2.4 / E3)
| Event | To | Template |
|---|---|---|
| `meet.room.confirmed` | Organizer | Room confirmed (in-app only) |
| `meet.room.declined` | Organizer | Room not available + 3 alternatives |
| `meet.room.approval_needed` / `approved` / `rejected` | Approver / organizer | Room approval |
| `meet.room.released` | Organizer | Room released, no check-in |
| `meet.room.moved_in_outlook` | Organizer, minute taker | Meeting moved in Outlook |
| `meet.room.sync_failed` | Meet Admin | Room sync problem |

SLA (Part E2.2): room approval decision within 4 working hours, then escalate to the approver's manager.

## F10. Edge cases
- **Organizer without an M365 mailbox** (e.g. password-only user): the event is created on a **service mailbox** (`meetings@chandakgroup.com`) with the organizer named in the body and subject. The panel shows the organizer's name from the subject (`AddOrganizerToSubject` shows the service account, so prefix the subject with the real organizer: "Rohit Jain – Weekly Sales Review").
- **Graph down:** the meeting saves in Chandak with "Room booking pending". It is retried with backoff for 2 hours, then the organizer and Meet Admin are alerted. The room picker shows "Live availability unavailable" and uses last-known data.
- **Time zones:** always send `India Standard Time`. Never send a UTC offset string without a zone.
- **Recurring series changed for one date** in Chandak → update just that occurrence in Graph (`/events/{seriesId}/instances`).
- **Room renamed or removed in M365** → the nightly room sync updates or deactivates it; future bookings are flagged.
- **Permissions:** users only see room names and busy times for rooms they can't book. Private meeting titles are never shown.

## F11. Acceptance tests (Part F)
1. Rohit schedules "Weekly Sales Review" in Chandak for Mon 10:30–11:30 in Board Room, HO with Teams on. Within 30 s: the event is in Rohit's and attendees' Outlook/Teams calendars with a Teams link, the Board Room calendar shows it accepted, and **the Board Room Teams panel shows "Rohit Jain – Weekly Sales Review 10:30–11:30"**.
2. Picking a room already booked from Outlook shows "Busy 10:00–11:00 (Neha Agarwal)" and suggests a free room.
3. A weekly series with 3 clashing dates lists those 3 dates before saving, and lets the user pick another room for them.
4. Moving the meeting in Chandak to 12:00 moves it in Outlook/Teams and on the panel within 30 s. Moving it in Outlook updates the Chandak session with a log entry.
5. Cancelling in Chandak frees the room on the panel. Points stay and carry to the next session.
6. No check-in 10 minutes after start → the room is released, the panel shows it free, and the organizer is told.
7. A confidential board meeting shows only "Private meeting · Anil Deshmukh" on the panel and in the room picker for other users.
8. The Chandak display tablet in Plant 1 Training Hall shows the current meeting with "booked by" and the next meetings, updates within 5 s of a change, and lets a user check in by QR and "Book now 30 min".
9. Graph unavailable for 20 minutes → the meeting is saved, the booking retries automatically and is confirmed when Graph is back. Nothing is double-booked.

## F12. Decisions needed (add to B13)
1. Confirm Chandak is on **Microsoft 365** (Exchange Online + Teams), and the list of room mailboxes per building.
2. Which rooms have **Teams panels** and which need a Chandak display tablet (and the tablet budget, about ₹12–18k each).
3. Per room: show the subject on the panel, or the organizer only.
4. Check-in and auto-release: use the Teams panel's own setting, or Chandak's (recommended: Chandak's, so it also works on tablets).
5. Who approves bookings for restricted rooms (Board Room).
