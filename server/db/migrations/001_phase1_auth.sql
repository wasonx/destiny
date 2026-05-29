create schema if not exists app;
create extension if not exists pgcrypto;

create table if not exists app.users (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('customer', 'editor', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  display_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('editor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.customer_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id),
  provider text not null,
  provider_subject text not null,
  phone text,
  created_at timestamptz not null default now(),
  unique(provider, provider_subject)
);

create table if not exists app.login_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id),
  token_hash text not null unique,
  account_type text not null check (account_type in ('customer', 'editor', 'admin')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app.sms_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  provider text not null default 'mock',
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists app.qr_login_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired', 'cancelled')),
  customer_id uuid references app.users(id),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists app.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app.users(id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
