create table if not exists app.commerce_products (
  id uuid primary key default gen_random_uuid(),
  medusa_product_id text,
  sku text not null unique,
  name text not null,
  product_type text not null check (product_type in ('report_quota', 'monthly_membership', 'yearly_membership', 'digital_content', 'physical_goods')),
  price_cents int not null,
  currency text not null default 'CNY',
  entitlement_payload jsonb not null default '{}'::jsonb,
  requires_shipping boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.commerce_inventory (
  sku text primary key,
  quantity int not null default 0,
  safety_stock int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists app.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id),
  receiver_name text not null,
  phone text not null,
  province text not null,
  city text not null,
  district text not null,
  detail_address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.users(id),
  order_no text not null unique,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','pending_fulfillment','shipped','completed','refund_requested','refunded','closed')),
  amount_cents int not null,
  freight_cents int not null default 0,
  address_snapshot jsonb,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.commerce_orders(id),
  provider text not null,
  status text not null default 'created',
  amount_cents int not null,
  provider_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.entitlement_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.commerce_orders(id),
  item_sku text not null,
  delivery_type text not null,
  status text not null default 'delivered',
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz not null default now(),
  unique(order_id, item_sku, delivery_type)
);

create table if not exists app.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.commerce_orders(id),
  carrier text not null,
  tracking_no text not null,
  note text not null default '',
  shipped_at timestamptz not null default now(),
  created_by uuid references app.users(id)
);

create table if not exists app.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.commerce_orders(id),
  item_sku text,
  customer_id uuid not null references app.users(id),
  reason text not null,
  amount_cents int not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected','processed')),
  reviewer_id uuid references app.users(id),
  review_note text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
