create table if not exists app.sms_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references app.sms_otp_challenges(id),
  phone text not null,
  purpose text not null,
  provider text not null default 'mock',
  status text not null check (status in ('mock_sent', 'blocked', 'failed')),
  template_id text,
  sign_name text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sms_otp_challenges_phone_created_idx
  on app.sms_otp_challenges(phone, purpose, created_at desc);

create index if not exists sms_delivery_logs_phone_created_idx
  on app.sms_delivery_logs(phone, purpose, created_at desc);
