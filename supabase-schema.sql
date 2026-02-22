-- ═══════════════════════════════════════════════════════════
-- FlowHaven — Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com → Your Project → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  last_active date default current_date,
  is_pro boolean default false,
  encryption_salt text not null,
  badges text[] default '{}',
  created_at timestamptz default now()
);

-- ── Tasks ─────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,          -- AES-256-GCM encrypted
  notes text,                   -- AES-256-GCM encrypted
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ── Habits ────────────────────────────────────────────────────
create table if not exists habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  icon text default '⭐',
  frequency text default 'daily' check (frequency in ('daily', 'weekdays', 'weekly')),
  streak integer default 0,
  longest_streak integer default 0,
  completions text[] default '{}',  -- array of "YYYY-MM-DD" strings
  created_at timestamptz default now()
);

-- ── Goals ─────────────────────────────────────────────────────
create table if not exists goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,          -- AES-256-GCM encrypted
  description text,             -- AES-256-GCM encrypted
  category text default 'personal' check (category in ('health', 'career', 'finance', 'learning', 'personal')),
  target_date date,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  completed boolean default false,
  created_at timestamptz default now()
);

-- ── Journal Entries ───────────────────────────────────────────
create table if not exists journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,        -- AES-256-GCM encrypted
  mood integer default 3 check (mood >= 1 and mood <= 5),
  date date not null,
  created_at timestamptz default now(),
  unique(user_id, date)         -- one entry per day
);

-- ── Pomodoro Sessions ─────────────────────────────────────────
create table if not exists pomodoro_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  duration integer not null,    -- minutes
  task_name text,               -- AES-256-GCM encrypted (optional)
  completed boolean default false,
  started_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS) — Users can only see their own data
-- ═══════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table habits enable row level security;
alter table goals enable row level security;
alter table journal_entries enable row level security;
alter table pomodoro_sessions enable row level security;

-- Profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Tasks
create policy "Users can manage own tasks" on tasks for all using (auth.uid() = user_id);

-- Habits
create policy "Users can manage own habits" on habits for all using (auth.uid() = user_id);

-- Goals
create policy "Users can manage own goals" on goals for all using (auth.uid() = user_id);

-- Journal
create policy "Users can manage own journal" on journal_entries for all using (auth.uid() = user_id);

-- Pomodoro
create policy "Users can manage own sessions" on pomodoro_sessions for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- Indexes for performance
-- ═══════════════════════════════════════════════════════════
create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists tasks_completed_idx on tasks(user_id, completed);
create index if not exists habits_user_id_idx on habits(user_id);
create index if not exists goals_user_id_idx on goals(user_id);
create index if not exists journal_user_date_idx on journal_entries(user_id, date desc);
create index if not exists pomodoro_user_date_idx on pomodoro_sessions(user_id, started_at desc);
