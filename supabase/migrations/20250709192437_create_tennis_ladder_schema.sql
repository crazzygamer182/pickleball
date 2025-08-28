-- Tennis Ladder System Schema Migration

-- 1. users (linked to Supabase Auth, but extra info here)
create table if not exists users (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    email text not null unique,
    gender text,
    created_at timestamp with time zone default timezone('utc', now())
);

-- 2. ladders
create table if not exists ladders (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    type text not null, -- 'men_competitive', 'men_casual', 'women'
    fee numeric not null,
    created_at timestamp with time zone default timezone('utc', now())
);

-- 3. ladder_memberships
create table if not exists ladder_memberships (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    ladder_id uuid not null references ladders(id) on delete cascade,
    join_date timestamp with time zone default timezone('utc', now()),
    current_rank integer,
    is_active boolean default true
);

-- 4. matches
create table if not exists matches (
    id uuid primary key default gen_random_uuid(),
    ladder_id uuid not null references ladders(id) on delete cascade,
    week integer not null,
    player1_id uuid not null references users(id) on delete cascade,
    player2_id uuid not null references users(id) on delete cascade,
    player1_score integer,
    player2_score integer,
    played_at timestamp with time zone,
    status text default 'scheduled' -- 'scheduled', 'completed', 'pending'
);

-- 5. payments
create table if not exists payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    ladder_id uuid not null references ladders(id) on delete cascade,
    amount numeric not null,
    status text default 'pending', -- 'pending', 'completed', 'failed'
    paid_at timestamp with time zone
);
