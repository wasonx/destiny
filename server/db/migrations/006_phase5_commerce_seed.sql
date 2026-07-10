insert into app.membership_plans(code, name, duration_days, monthly_report_quota, benefits, status)
values
  ('monthly', '月度会员', 31, 10, '{"reportQuota":10,"memberReports":true}'::jsonb, 'active'),
  ('yearly', '年度会员', 365, 150, '{"reportQuota":150,"memberReports":true,"prioritySupport":true}'::jsonb, 'active')
on conflict (code) do update
set name = excluded.name,
    duration_days = excluded.duration_days,
    monthly_report_quota = excluded.monthly_report_quota,
    benefits = excluded.benefits,
    status = excluded.status;

insert into app.commerce_products(sku, name, product_type, price_cents, currency, entitlement_payload, requires_shipping, status)
values
  ('REPORT-3', '报告次数包 3 次', 'report_quota', 990, 'CNY', '{"amount":3}'::jsonb, false, 'active'),
  ('CARD-001', '甄好算罗盘卡', 'physical_goods', 3900, 'CNY', '{"inventorySku":"CARD-001"}'::jsonb, true, 'active')
on conflict (sku) do update
set name = excluded.name,
    product_type = excluded.product_type,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    entitlement_payload = excluded.entitlement_payload,
    requires_shipping = excluded.requires_shipping,
    status = excluded.status,
    updated_at = now();

insert into app.commerce_inventory(sku, quantity, safety_stock)
values ('CARD-001', 20, 3)
on conflict (sku) do update
set safety_stock = excluded.safety_stock,
    updated_at = now();
