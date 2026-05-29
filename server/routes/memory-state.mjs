export const memory = {
  adminToken: 'dev-admin-token',
  customerToken: 'dev-customer-token',
  knowledgeEntries: [],
  rules: [],
  templates: [],
  reportRuns: [],
  products: [
    {
      id: 'quota-3',
      sku: 'REPORT-3',
      name: '报告次数包 3 次',
      product_type: 'report_quota',
      price_cents: 990,
      currency: 'CNY',
      entitlement_payload: { amount: 3 },
      requires_shipping: false,
      status: 'active',
    },
    {
      id: 'compass-card',
      sku: 'CARD-001',
      name: '甄算罗盘卡',
      product_type: 'physical_goods',
      price_cents: 3900,
      currency: 'CNY',
      entitlement_payload: {},
      requires_shipping: true,
      status: 'active',
    },
  ],
  addresses: [],
  orders: [],
  payments: [],
  refunds: [],
  shipments: [],
};

export function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
