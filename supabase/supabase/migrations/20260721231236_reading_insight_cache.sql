create table reading_insight_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  insight text not null,
  entry_count_at_calculation int not null,
  calculated_at timestamptz default now()
);

alter table reading_insight_cache enable row level security;

create policy "users manage own insight cache" on reading_insight_cache for all using (auth.uid() = user_id);