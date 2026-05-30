import { getCustomerToken } from './customerAuth';

function authHeaders() {
  const token = getCustomerToken();
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

async function customerRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/destiny-api${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Customer request failed: ${response.status}`);
  return response.json();
}

export interface CustomerProduct {
  id?: string;
  sku: string;
  name: string;
  product_type?: string;
  price_cents?: number;
  requires_shipping?: boolean;
  entitlement_payload?: Record<string, unknown>;
}

export interface CustomerOrder {
  id: string;
  order_no?: string;
  status?: string;
  amount_cents?: number;
  freight_cents?: number;
  items?: Array<{ sku?: string; name?: string; quantity?: number }>;
  shipment?: {
    id?: string;
    carrier?: string;
    tracking_no?: string;
    shipped_at?: string;
  } | null;
  created_at?: string;
}

export interface CustomerAddress {
  id?: string;
  receiver_name?: string;
  receiverName?: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  detail_address?: string;
  detailAddress?: string;
  is_default?: boolean;
  isDefault?: boolean;
}

export function listProducts(): Promise<{ products: CustomerProduct[] }> {
  return customerRequest('/customer/products');
}

export function listAddresses(): Promise<{ addresses: CustomerAddress[] }> {
  return customerRequest('/customer/addresses');
}

export function createAddress(address: CustomerAddress): Promise<{ address: CustomerAddress }> {
  return customerRequest('/customer/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  });
}

export function updateAddress(id: string, address: CustomerAddress): Promise<{ address: CustomerAddress }> {
  return customerRequest(`/customer/addresses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(address),
  });
}

export function createOrder(payload: {
  items: Array<{ sku: string; quantity: number }>;
  address?: Record<string, unknown> | null;
  provider?: 'manual' | string;
}): Promise<{ order: CustomerOrder; payment?: Record<string, unknown> }> {
  return customerRequest('/customer/orders', {
    method: 'POST',
    body: JSON.stringify({
      provider: payload.provider || 'manual',
      items: payload.items,
      address: payload.address || null,
    }),
  });
}

export function listOrders(): Promise<{ orders: CustomerOrder[] }> {
  return customerRequest('/customer/orders');
}

export function createRefundRequest(orderId: string, payload: { reason: string; amount_cents?: number }): Promise<{ refundRequest: Record<string, unknown> }> {
  return customerRequest(`/customer/orders/${encodeURIComponent(orderId)}/refund-requests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
