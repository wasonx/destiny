alter table app.customer_identities
  add column if not exists openid text,
  add column if not exists unionid text,
  add column if not exists provider_payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customer_identities_wechat_openid_uidx
  on app.customer_identities(provider, openid)
  where provider = 'wechat' and openid is not null;

create unique index if not exists customer_identities_wechat_unionid_uidx
  on app.customer_identities(provider, unionid)
  where provider = 'wechat' and unionid is not null;

create index if not exists customer_identities_user_provider_idx
  on app.customer_identities(user_id, provider);
