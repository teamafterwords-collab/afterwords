create table profiles (
  id uuid references auth.users primary key,
  reading_level text default 'beginner',
  onboarded boolean default false,
  created_at timestamptz default now()
);

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  author text,
  genre text,
  tracking_mode text default 'chapter',
  total_chapters int,
  total_pages int,
  current_chapter int default 0,
  status text default 'want_to_read',
  cover_color text,
  cover_url text,
  asked_questions text[] default '{}',
  created_at timestamptz default now()
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  book_id uuid references books on delete cascade not null,
  kind text default 'entry',
  question text,
  response text,
  text text,
  chapter_guess text,
  chapter_range text,
  question_type text,
  created_at timestamptz default now()
);

create table checkin_counts (
  user_id uuid references auth.users primary key,
  total_checkins int default 0
);

alter table profiles enable row level security;
alter table books enable row level security;
alter table entries enable row level security;
alter table checkin_counts enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own books" on books for all using (auth.uid() = user_id);
create policy "own entries" on entries for all using (auth.uid() = user_id);
create policy "own checkin count" on checkin_counts for all using (auth.uid() = user_id);

create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.checkin_counts (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();