export const customerTokenKey = 'zhensuan_customer_token';

export function getCustomerToken() {
  return window.localStorage.getItem(customerTokenKey) || '';
}

export function setCustomerToken(token: string) {
  window.localStorage.setItem(customerTokenKey, token);
}

function authHeaders() {
  const token = getCustomerToken();
  return {
    Authorization: token ? `Bearer ${token}` : '',
  };
}

export async function sendOtp(phone: string) {
  const response = await fetch('/destiny-api/customer/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) throw new Error('验证码发送失败');
  return response.json();
}

export async function verifyOtp(phone: string, code: string) {
  const response = await fetch('/destiny-api/customer/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!response.ok) throw new Error('验证码不正确');
  const data = await response.json();
  setCustomerToken(data.token);
  return data;
}

export async function fetchValueState() {
  const response = await fetch('/destiny-api/customer/value-state', {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('权益状态获取失败');
  return response.json();
}

export interface CustomerReportRun {
  id: string;
  customer_id?: string;
  report_kind?: string;
  report_tier?: 'free' | 'full';
  input_params?: Record<string, unknown>;
  structured_context?: Record<string, unknown>;
  final_report?: Record<string, unknown>;
  source?: string;
  provenance?: Record<string, unknown>;
  created_at?: string;
}

export async function fetchCustomerReportRuns(): Promise<{ reportRuns: CustomerReportRun[] }> {
  const response = await fetch('/destiny-api/customer/report-runs', {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('报告历史获取失败');
  return response.json();
}

export async function fetchCustomerReportRun(id: string): Promise<{ reportRun: CustomerReportRun | null }> {
  const response = await fetch(`/destiny-api/customer/report-runs/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('报告详情获取失败');
  return response.json();
}
