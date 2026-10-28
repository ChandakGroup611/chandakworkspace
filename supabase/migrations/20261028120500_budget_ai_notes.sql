-- Organization Budget: the AI budget summary of a version.
-- The note is written from figures the server has already calculated (kept in `facts`), so every
-- number in it comes from the database; the newest note of a version also goes into the Summary
-- Excel download under "Note:-". Only adds a budget_ table; nothing existing is changed.

create table public.budget_ai_notes (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.budget_versions on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  facts jsonb not null default '{}'::jsonb,
  provider text not null default 'rules',          -- gemini / openai / rules (written without AI)
  created_by uuid default auth.uid() references auth.users,
  created_at timestamptz not null default now()
);
create index budget_ai_notes_version on public.budget_ai_notes (version_id, created_at desc);

alter table public.budget_ai_notes enable row level security;

-- Anyone who may see the project reads its notes. Writing one needs the "export reports" right and no
-- department limit, because the note describes the whole project.
create policy read_project on public.budget_ai_notes for select to authenticated
  using (public.budget_has('project.view', public.budget_version_project(version_id)));
create policy write_note on public.budget_ai_notes for insert to authenticated
  with check (
    public.budget_has('report.export', public.budget_version_project(version_id))
    and exists (select 1 from public.budget_members m where m.user_id = auth.uid() and m.active and m.department_ids is null)
  );

grant select, insert on public.budget_ai_notes to authenticated;
