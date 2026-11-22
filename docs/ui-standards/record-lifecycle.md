# Record lifecycle standard (create → list → view → edit)

Fleet Management and Chandak Workspace already work this way. Every other module must too.
The goal: **a user sees a record the same way they created it.**

## The five rules

1. **After create, land on the list.** The new record is at the top and highlighted for a few seconds.
   Show a success toast with the record code. Do not drop the user on an unrelated screen.
2. **Every list row has the same actions, in the same order:** View · Edit · (module actions) · Delete.
   Clicking the row itself opens View.
3. **View is the create form, read-only.** Same sections, same order, same labels. No separate
   "detail layout" that rearranges what the user typed. Extra information that only exists after
   creation (status, history, replies, sessions) goes *below* the form or in other tabs.
4. **Edit is the create form, pre-filled.** Never a cut-down "quick edit" modal with fewer fields.
   Fields that only make sense at creation (template picker, "first session date") are hidden, not different.
5. **Every record has a URL.** View and edit must survive refresh and be shareable.
   Prefer `/<module>/<entity>/<id>` (view) and `/<module>/<entity>/<id>/edit`; inside single-page
   hosts use `?record=<id>&mode=view|edit`.

## Shared kit: `components/ui/record`

| Piece | Use it for |
|---|---|
| `RecordModeProvider mode="create" \| "view" \| "edit"` | Wrap the existing create form once. |
| `RecordFieldset` | Wrap the fields. In view mode every input/select/textarea/button inside is read-only (native `<fieldset disabled>`), styled to read as values. No per-field changes needed. |
| `CreateOnly` / `EditOnly` / `ViewOnly` | Hide template pickers, "add row", "generate link" etc. where they don't apply. |
| `RecordFormActions` | Standard footer: create → Cancel / Create · view → Back to list / Edit · edit → Cancel / Save changes. |
| `recordTitle(mode, entity, name)` | "New X" / "X name" / "Edit · X name". |
| `recordCreatedHref(listHref, id)` + `RecordHighlighter` / `useRecordHighlight()` | Post-create landing: `router.push(recordCreatedHref("/meet/meetings", id))`; on the list, give rows `data-record-id={id}`. |
| `useFlashHighlight()` | Same highlight for lists on the same page (no navigation): `flash(record.id)` after save; clears itself. |
| `RowActions` (`components/ui/data`) | View / Edit / Delete icons in client lists (delete confirms inline). |
| `RecordLinkActions` | Same icons as links, for server-rendered lists. |

### Converting a module (checklist)

1. Add `recordMode` + `record` props to the existing create form; seed each `useState` from `record`.
2. Wrap the body in `RecordModeProvider` + `RecordFieldset`; replace its buttons with `RecordFormActions`.
3. In submit: `view` → no-op, `edit` → update action (it must accept **every** field create writes), `create` → create, then `recordCreatedHref`.
4. Delete the old edit modal / quick-edit form.
5. List: `data-record-id` on rows, row click → view, `RowActions` / `RecordLinkActions`.
6. Make sure the list re-reads data after a save (store subscription / `router.refresh()` / refetch).

## Audit (22 Nov 2026)

| Module | Create | After create | List actions | View | Edit | Status |
|---|---|---|---|---|---|---|
| Fleet Management | Modals per entity | List + opens dossier | View / Edit / Delete | Dossier | Same fields as create | ✅ Reference |
| Chandak Workspace / Tasks | Wizard | List | Yes | Task page | Yes | ✅ Reference |
| AMC | 4-step modal | List | View / Edit / Delete | Drawer, Overview mirrors create | Same modal | ✅ Compliant |
| **Meet: meeting series** | Full page form | ~~Session page~~ → list + highlight | ~~Manage / Session (same link)~~ → View / Edit / Session | ~~Summary strip~~ → *Series details* tab = create form read-only | ~~6-field modal~~ → same form at `/meet/meetings/[id]/edit`; `updateMeeting` now saves all fields + attendees | ✅ Converted |
| **Design: RFIs** | Full-page form | ~~List did not refresh~~ → list refreshes + highlight | ~~Delete only~~ → View / Edit / Clarify / Delete | ~~none~~ → create form read-only (+ consultant answer) | ~~none~~ → same form | ✅ Converted |
| **Design: Transmittals** | Form | List refreshes + highlight | ~~Print / Sign / Delete~~ → View · Edit · Print slip · Sign receipt · Delete; row = View | Generate form read-only (+ receipt banner, Print slip in header) | Same form; locked once the receipt is signed | ✅ Converted |
| **Design: Drawings** | Upload form | Register + highlight | View · Edit · Open file · Download · Blueprint · Review · Delete; row = View | Upload form read-only, attached file shown | Same form, details only (code, revision and file change through Review) | ✅ Converted |
| Design: Liaisoning | — (status matrix: project × authority cells) | — | Cell click → status update | — | — | n/a: no records are created, so the standard does not apply |
| **Tickets** | Wizard → ERP / Infra / Others forms | List + highlight | View / Edit (`?mode=edit` opens the form in edit) / Delete | ~~Title + description only~~ → *Ticket details* card = the same category form, read-only, above the console | ~~Inline title / description only~~ → same form; `updateTicketDetails` now also saves system, module, submodule, asset, issue sub-type | ✅ Converted |
| **Requirements** | Same wizard as tickets | List + highlight (also when raised from Tickets) | ~~Row/Edit → Analysis tab~~ → row = Details, Edit = intake form in edit, Print, Delete | *Requirement as raised* card = intake form read-only, at the top of Details | Same form, saved by `updateRequirementIntakeForm`; planning / analysis editing unchanged on its tab | ✅ Converted (`EditRequirementModal` was never opened; left in place) |
| **Budget** | 6-step wizard | ~~"Saved" panel~~ → Budgets registry, version highlighted | **View** (form) · **Edit** (drafts) · Overview · Entry · Summary · Edit details | ~~Overview / sheet only~~ → `/budget/<p>/create?mode=view&v=<n>`: the 6-step wizard read-only, every step navigable | Same wizard (`/budget/<p>/create`); approved latest version offers "Start R<n+1> from these figures" | ✅ Converted |
| **SLA rules** | Inline card form | Same page + highlight | View · Edit · Delete; card click = View | Same inline form, read-only, with Edit | Same inline form | ✅ Converted |
| **SLA holidays** | Side form | List + highlight | ~~Delete only~~ → Edit · Delete (all 3 fields are shown in the row, so no separate View) | Row | Same side form ("Edit holiday") | ✅ Converted |
| SLA working hours | Modal | — | Edit / Delete | — | Modal | ⚠️ Not saved to the database (page state only), pre-existing; needs a table + actions before it can follow the standard |
| **Learning courses** | Builder | List + highlight | View · Edit; card click = View | Same builder, read-only | Same builder | ✅ Converted (page is demo data; courses are not persisted) |
| Knowledge articles | Editor | List | View / Edit | Reader | Editor | ✅ Acceptable |
| **Masters** (hub, companies, departments, designations, vendors) | Modal | List (edited row highlighted) | View · Edit · Delete; row click = View | Same modal, read-only, with Edit | Same modal | ✅ Converted (new rows are not highlighted: `saveMasterEntity` returns no id) |

None of the modules used the shared `RowActions` / `DetailHeader` before this change; each module has its own icon buttons.
The conversions keep each module's existing button styling but use the same order (View · Edit · module actions · Delete) and the same behaviour.
