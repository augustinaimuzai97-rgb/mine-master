-- Mine Master starter schema.
-- Run this in the Supabase SQL Editor for a NEW project.
-- Rewards are internal platform points only; this is not a bank or cash wallet.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(18,2) not null default 0 check (balance >= 0),
  currency text not null default 'MM points',
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('mining', 'checkin', 'deposit', 'withdrawal', 'adjustment')),
  amount numeric(18,2) not null check (amount > 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'rejected')),
  reference text not null,
  description text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reference)
);

create index if not exists transactions_user_created_idx
  on public.transactions(user_id, created_at desc);

-- Create a profile and empty wallet automatically after Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Only the server function, using the service-role key, can execute this RPC.
-- Transaction insert + wallet increment happen atomically in one database transaction.
create or replace function public.claim_reward(
  p_user_id uuid,
  p_reward_type text,
  p_amount numeric,
  p_reference text,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_reward_type not in ('mining', 'checkin') then
    raise exception 'Invalid reward type';
  end if;
  if p_amount <= 0 or p_amount > 100000 then
    raise exception 'Invalid reward amount';
  end if;

  insert into public.transactions(user_id, type, amount, status, reference, description)
  values (p_user_id, p_reward_type, p_amount, 'completed', p_reference, p_description)
  on conflict (user_id, reference) do nothing;

  if not found then
    raise exception 'Reward already claimed';
  end if;

  update public.wallets
  set balance = balance + p_amount, updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'Wallet not found';
  end if;
end;
$$;

revoke all on function public.claim_reward(uuid, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.claim_reward(uuid, text, numeric, text, text) to service_role;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can read own wallet" on public.wallets;
create policy "Users can read own wallet" on public.wallets
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions" on public.transactions
  for select to authenticated using (auth.uid() = user_id);

-- No client-side insert/update policies are intentionally provided for wallets or transactions.
-- This prevents users from editing their own balances through the browser.
