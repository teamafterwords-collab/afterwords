alter table profiles add column if not exists trial_ends_at timestamptz;
alter table profiles add column if not exists plan text default 'free';

create table if not exists weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  count int default 0,
  unique (user_id, week_start)
);

alter table weekly_checkins enable row level security;

create policy "users manage own weekly checkins" on weekly_checkins for all using (auth.uid() = user_id);