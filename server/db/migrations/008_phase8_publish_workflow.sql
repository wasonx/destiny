alter table app.knowledge_entries
  add column if not exists version_no int not null default 0,
  add column if not exists applicable_scope jsonb not null default '{}'::jsonb,
  add column if not exists concept_keys text[] not null default '{}',
  add column if not exists source_note text not null default '';

alter table app.knowledge_entry_versions
  add column if not exists change_summary text not null default '',
  add column if not exists applicable_scope jsonb not null default '{}'::jsonb,
  add column if not exists concept_keys text[] not null default '{}',
  add column if not exists source_note text not null default '';

alter table app.analysis_rules
  add column if not exists version_no int not null default 0,
  add column if not exists graph_node_keys text[] not null default '{}',
  add column if not exists trigger_explanation text not null default '',
  add column if not exists published_by uuid references app.users(id),
  add column if not exists published_at timestamptz;

alter table app.report_templates
  add column if not exists version_no int not null default 0,
  add column if not exists published_by uuid references app.users(id),
  add column if not exists published_at timestamptz,
  add column if not exists risk_boundary text not null default '',
  add column if not exists template_scope jsonb not null default '{}'::jsonb;

create table if not exists app.analysis_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references app.analysis_rules(id),
  version_no int not null,
  module text not null,
  name text not null,
  priority int not null,
  weight int not null,
  condition jsonb not null default '{}'::jsonb,
  conclusion text not null default '',
  advice text not null default '',
  risk_boundary text not null default '',
  knowledge_entry_ids uuid[] not null default '{}',
  graph_node_keys text[] not null default '{}',
  trigger_explanation text not null default '',
  change_summary text not null default '',
  published_by uuid references app.users(id),
  published_at timestamptz not null default now(),
  unique(rule_id, version_no)
);

create table if not exists app.report_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references app.report_templates(id),
  version_no int not null,
  module text not null,
  name text not null,
  report_kind text not null,
  sections jsonb not null default '[]'::jsonb,
  tone text not null default '',
  disclaimer text not null default '',
  forbidden_expressions text[] not null default '{}',
  risk_boundary text not null default '',
  template_scope jsonb not null default '{}'::jsonb,
  change_summary text not null default '',
  published_by uuid references app.users(id),
  published_at timestamptz not null default now(),
  unique(template_id, version_no)
);

create index if not exists knowledge_entries_status_updated_idx
  on app.knowledge_entries(status, updated_at desc);

create index if not exists analysis_rules_status_priority_idx
  on app.analysis_rules(status, priority asc, weight desc);

create index if not exists report_templates_status_kind_idx
  on app.report_templates(status, report_kind);
