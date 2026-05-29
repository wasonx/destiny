create table if not exists app.membership_plans (
  code text primary key,
  name text not null,
  duration_days int not null,
  monthly_report_quota int not null default 0,
  benefits jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

create table if not exists app.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id),
  plan_code text not null references app.membership_plans(code),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists app.entitlement_accounts (
  customer_id uuid primary key references app.users(id),
  report_quota_balance int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists app.entitlement_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id),
  amount int not null,
  balance_after int not null,
  reason text not null,
  reference_type text,
  reference_id text,
  actor_user_id uuid references app.users(id),
  created_at timestamptz not null default now()
);

create table if not exists app.points_accounts (
  customer_id uuid primary key references app.users(id),
  points_balance int not null default 0,
  lifetime_points int not null default 0,
  growth_level text not null default '启蒙',
  updated_at timestamptz not null default now()
);

create table if not exists app.points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id),
  amount int not null,
  balance_after int not null,
  lifetime_after int not null,
  growth_level_after text not null,
  reason text not null,
  reference_type text,
  reference_id text,
  actor_user_id uuid references app.users(id),
  created_at timestamptz not null default now()
);
