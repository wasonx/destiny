alter table app.report_runs
  add column if not exists report_tier text not null default 'free'
  check (report_tier in ('free', 'full'));

create index if not exists report_runs_report_tier_idx
  on app.report_runs(report_tier);
