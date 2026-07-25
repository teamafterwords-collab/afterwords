alter table profiles add column if not exists trial_ends_at timestamptz;

create table if not exists weekly_checkins (
  user_id uuid references auth.users not null,
  week_start date not null,
  checkin_count int default 0,
  primary key (user_id, week_start)
);

alter table weekly_checkins enable row level security;

create policy "own weekly checkins" on weekly_checkins
  for all using (auth.uid() = user_id);
