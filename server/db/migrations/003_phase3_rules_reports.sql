create table if not exists app.analysis_rules (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  name text not null,
  priority int not null default 100,
  weight int not null default 0,
  condition jsonb not null default '{}'::jsonb,
  conclusion text not null default '',
  advice text not null default '',
  risk_boundary text not null default '',
  knowledge_entry_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  created_by uuid references app.users(id),
  published_by uuid references app.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.report_templates (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  name text not null,
  report_kind text not null,
  sections jsonb not null default '[]'::jsonb,
  tone text not null default '亲民、克制、可解释',
  disclaimer text not null default '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。',
  forbidden_expressions text[] not null default array['一定','必定','保证','改命','转运','必然'],
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.report_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references app.users(id),
  report_kind text not null,
  input_params jsonb not null default '{}'::jsonb,
  structured_context jsonb not null default '{}'::jsonb,
  final_report jsonb not null default '{}'::jsonb,
  source text not null check (source in ('fallback', 'ai', 'testbench')),
  created_at timestamptz not null default now()
);

create table if not exists app.safety_reviews (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid references app.report_runs(id),
  passed boolean not null,
  flags text[] not null default '{}',
  review_text text not null default '',
  created_at timestamptz not null default now()
);
