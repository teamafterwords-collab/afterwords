create table connections_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  book_id uuid references books not null,
  connections jsonb not null,
  entry_count_at_calculation int not null,
  calculated_at timestamptz default now(),
  unique (user_id, book_id)
);

alter table connections_cache enable row level security;

create policy "users manage own cache" on connections_cache
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
