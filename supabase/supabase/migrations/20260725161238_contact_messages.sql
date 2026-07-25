create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  email text,
  message text not null,
  created_at timestamptz default now()
);

alter table contact_messages enable row level security;

create policy "users insert own messages" on contact_messages for insert with check (auth.uid() = user_id);
create policy "users view own messages" on contact_messages for select using (auth.uid() = user_id);