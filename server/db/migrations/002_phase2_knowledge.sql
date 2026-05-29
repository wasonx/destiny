create table if not exists app.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  source_type text not null default 'manual',
  url text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists app.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  title text not null,
  summary text not null default '',
  body text not null default '',
  tags text[] not null default '{}',
  source_id uuid references app.knowledge_sources(id),
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  risk_note text not null default '',
  created_by uuid references app.users(id),
  published_by uuid references app.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.knowledge_entry_versions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references app.knowledge_entries(id),
  version_no int not null,
  title text not null,
  summary text not null,
  body text not null,
  tags text[] not null default '{}',
  risk_note text not null default '',
  published_by uuid references app.users(id),
  published_at timestamptz not null default now(),
  unique(entry_id, version_no)
);
