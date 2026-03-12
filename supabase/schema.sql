-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  total_games integer default 0,
  best_score numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CLOUD SAVES
-- ============================================================
create table public.cloud_saves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  fund_name text not null,
  month integer not null,
  tvpi_gross numeric not null,
  game_state jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_cloud_saves_user on public.cloud_saves(user_id);

-- ============================================================
-- LEADERBOARD
-- ============================================================
create table public.leaderboard_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  fund_name text not null,
  final_score numeric not null,
  grade text not null,
  tvpi_net numeric not null,
  irr_net numeric not null,
  total_exits integer not null,
  unicorn_count integer not null,
  scenario_id text,
  scenario_won boolean,
  difficulty text not null,
  rebirth_count integer default 0,
  duration_months integer not null,
  completed_at timestamptz default now()
);

create index idx_leaderboard_score on public.leaderboard_entries(final_score desc);
create index idx_leaderboard_user on public.leaderboard_entries(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

alter table public.cloud_saves enable row level security;
create policy "Users can view own saves" on public.cloud_saves
  for select using (auth.uid() = user_id);
create policy "Users can create own saves" on public.cloud_saves
  for insert with check (auth.uid() = user_id);
create policy "Users can update own saves" on public.cloud_saves
  for update using (auth.uid() = user_id);
create policy "Users can delete own saves" on public.cloud_saves
  for delete using (auth.uid() = user_id);

alter table public.leaderboard_entries enable row level security;
create policy "Leaderboard is viewable by everyone" on public.leaderboard_entries
  for select using (true);
create policy "Users can submit own scores" on public.leaderboard_entries
  for insert with check (auth.uid() = user_id);
