alter table app.report_runs
  add column if not exists provenance jsonb not null default '{}'::jsonb;

create table if not exists app.report_provenance_records (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null references app.report_runs(id) on delete cascade,
  graph_nodes jsonb not null default '[]'::jsonb,
  graph_edges jsonb not null default '[]'::jsonb,
  rule_hits jsonb not null default '[]'::jsonb,
  knowledge_sources jsonb not null default '[]'::jsonb,
  template_snapshot jsonb not null default '{}'::jsonb,
  safety_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_provenance_records_report_run_idx
  on app.report_provenance_records(report_run_id);
