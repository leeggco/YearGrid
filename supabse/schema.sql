create table if not exists public.yeargrid_ranges (
  user_id uuid not null,
  range_id text not null,
  name text not null,
  start_iso date not null,
  end_iso date not null,
  color text,
  goal text,
  milestones jsonb,
  is_completed boolean,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint yeargrid_ranges_pkey primary key (user_id, range_id),
  constraint yeargrid_ranges_start_before_end check (start_iso <= end_iso)
);

create table if not exists public.yeargrid_entries (
  user_id uuid not null,
  range_id text not null,
  iso_date date not null,
  state smallint not null default 0,
  note text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint yeargrid_entries_pkey primary key (user_id, range_id, iso_date),
  constraint yeargrid_entries_state_range check (state >= 0 and state <= 5)
);

create table if not exists public.yeargrid_prefs (
  user_id uuid not null,
  mode text not null,
  anchor_iso date not null,
  custom_start_iso date,
  custom_end_iso date,
  active_range_id text,
  cell_click_preference text not null,
  updated_at timestamptz not null default now(),
  constraint yeargrid_prefs_pkey primary key (user_id),
  constraint yeargrid_prefs_mode_check check (mode in ('year', 'month', 'week', 'range')),
  constraint yeargrid_prefs_cell_click_check check (cell_click_preference in ('open', 'quick_record'))
);

create index if not exists yeargrid_ranges_user_id_idx on public.yeargrid_ranges (user_id);
create index if not exists yeargrid_entries_user_range_idx on public.yeargrid_entries (user_id, range_id);
create index if not exists yeargrid_entries_user_id_idx on public.yeargrid_entries (user_id);
create index if not exists yeargrid_prefs_user_id_idx on public.yeargrid_prefs (user_id);

alter table public.yeargrid_ranges enable row level security;
alter table public.yeargrid_entries enable row level security;
alter table public.yeargrid_prefs enable row level security;

drop policy if exists yeargrid_ranges_select on public.yeargrid_ranges;
drop policy if exists yeargrid_ranges_insert on public.yeargrid_ranges;
drop policy if exists yeargrid_ranges_update on public.yeargrid_ranges;
drop policy if exists yeargrid_ranges_delete on public.yeargrid_ranges;

create policy yeargrid_ranges_select
on public.yeargrid_ranges
for select
to authenticated
using (auth.uid() = user_id);

create policy yeargrid_ranges_insert
on public.yeargrid_ranges
for insert
to authenticated
with check (auth.uid() = user_id);

create policy yeargrid_ranges_update
on public.yeargrid_ranges
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy yeargrid_ranges_delete
on public.yeargrid_ranges
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists yeargrid_entries_select on public.yeargrid_entries;
drop policy if exists yeargrid_entries_insert on public.yeargrid_entries;
drop policy if exists yeargrid_entries_update on public.yeargrid_entries;
drop policy if exists yeargrid_entries_delete on public.yeargrid_entries;

create policy yeargrid_entries_select
on public.yeargrid_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy yeargrid_entries_insert
on public.yeargrid_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy yeargrid_entries_update
on public.yeargrid_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy yeargrid_entries_delete
on public.yeargrid_entries
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists yeargrid_prefs_select on public.yeargrid_prefs;
drop policy if exists yeargrid_prefs_insert on public.yeargrid_prefs;
drop policy if exists yeargrid_prefs_update on public.yeargrid_prefs;
drop policy if exists yeargrid_prefs_delete on public.yeargrid_prefs;

create policy yeargrid_prefs_select
on public.yeargrid_prefs
for select
to authenticated
using (auth.uid() = user_id);

create policy yeargrid_prefs_insert
on public.yeargrid_prefs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy yeargrid_prefs_update
on public.yeargrid_prefs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy yeargrid_prefs_delete
on public.yeargrid_prefs
for delete
to authenticated
using (auth.uid() = user_id);