create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  paddle_subscription_id text,
  paddle_customer_id text,
  status text default 'free',
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "users view own subscription" on subscriptions for select using (auth.uid() = user_id);