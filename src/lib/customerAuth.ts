export const customerTokenKey = 'zhensuan_customer_token';

export function getCustomerToken() {
  return window.localStorage.getItem(customerTokenKey) || '';
}

export function setCustomerToken(token: string) {
  window.localStorage.setItem(customerTokenKey, token);
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
    headers: {
      Authorization: getCustomerToken() ? `Bearer ${getCustomerToken()}` : '',
    },
  });
  if (!response.ok) throw new Error('权益状态获取失败');
  return response.json();
}
