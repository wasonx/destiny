export function buildEntitlementPayload(product = {}) {
  const payload = product.entitlement_payload || product.entitlementPayload || {};
  switch (product.product_type || product.productType) {
    case 'report_quota':
      return { kind: 'reportQuota', amount: Number(payload.amount || payload.reportQuota || 1) };
    case 'monthly_membership':
      return { kind: 'membershipPlan', planCode: 'monthly', durationDays: Number(payload.durationDays || 31) };
    case 'yearly_membership':
      return { kind: 'membershipPlan', planCode: 'yearly', durationDays: Number(payload.durationDays || 365) };
    case 'digital_content':
      return { kind: 'digitalContent', digitalContentSku: payload.digitalContentSku || product.sku };
    case 'physical_goods':
      return { kind: 'physicalGoods', requiresShipping: true, inventorySku: payload.inventorySku || product.sku };
    default:
      return { kind: 'unknown' };
  }
}
