create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  page text,
  message text,
  created_at timestamptz default now()
);

alter table bug_reports enable row level security;

create policy "users insert own reports" on bug_reports for insert with check (auth.uid() = user_id);
create policy "users view own reports" on bug_reports for select using (auth.uid() = user_id);