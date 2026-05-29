export const adminTokenKey = 'zhensuan_admin_token';

export function getAdminToken() {
  return window.localStorage.getItem(adminTokenKey) || '';
}

export function setAdminToken(token: string) {
  window.localStorage.setItem(adminTokenKey, token);
}

export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/destiny-api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAdminToken() ? `Bearer ${getAdminToken()}` : '',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  return response.json();
}
