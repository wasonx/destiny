import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { adminRequest } from '../api';

type AccountType = 'all' | 'customer' | 'editor' | 'admin';

type UserRow = {
  id: string;
  account_type: 'customer' | 'editor' | 'admin';
  status: string;
  display_name?: string;
  phone?: string | null;
  username?: string | null;
  role?: string | null;
  identities?: Array<{ provider: string; provider_subject?: string; phone?: string | null }>;
  created_at?: string;
};

const accountLabels = {
  customer: '客户',
  editor: '后端编辑人员',
  admin: '平台管理人员',
};

function loginMethods(user: UserRow) {
  if (user.account_type === 'customer') {
    const providers = new Set((user.identities || []).map((identity) => identity.provider));
    const methods = [];
    if (providers.has('wechat')) methods.push('微信登录');
    if (providers.has('phone') || user.phone) methods.push('手机验证码');
    methods.push('扫码登录');
    return Array.from(new Set(methods)).join('、');
  }
  return '账号密码';
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('zh-CN');
}

export default function UsersPage() {
  const [accountType, setAccountType] = useState<AccountType>('all');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState('');

  async function loadUsers(nextType = accountType) {
    setError('');
    try {
      const query = nextType === 'all' ? '' : `?accountType=${encodeURIComponent(nextType)}`;
      const data = await adminRequest<{ users: UserRow[] }>(`/users${query}`);
      setUsers(data.users || []);
    } catch {
      setError('用户列表读取失败');
    }
  }

  useEffect(() => {
    void loadUsers(accountType);
  }, [accountType]);

  return (
    <div className="rounded-lg border border-shadow-gray bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-shadow-gray p-5">
        <div>
          <h2 className="font-serif text-2xl">用户管理</h2>
          <p className="mt-1 text-sm text-on-surface-variant">客户、后端编辑人员、平台管理人员统一查看。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType)} className="rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <option value="all">全部账号</option>
            <option value="customer">客户</option>
            <option value="editor">后端编辑人员</option>
            <option value="admin">平台管理人员</option>
          </select>
          <button onClick={() => void loadUsers()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </div>

      {error && <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-shadow-gray bg-surface text-left text-on-surface-variant">
              <th className="px-4 py-3">账号类别</th>
              <th>显示名称</th>
              <th>登录方式</th>
              <th>账号</th>
              <th>手机号</th>
              <th>身份绑定</th>
              <th>状态</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-shadow-gray last:border-0">
                <td className="px-4 py-3 font-medium">{accountLabels[user.account_type]}</td>
                <td>{user.display_name || '-'}</td>
                <td>{loginMethods(user)}</td>
                <td>{user.username || '-'}</td>
                <td>{user.phone || '-'}</td>
                <td className="max-w-[240px] truncate">{(user.identities || []).map((identity) => identity.provider).join('、') || '-'}</td>
                <td>{user.status}</td>
                <td>{formatDate(user.created_at)}</td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td className="px-4 py-8 text-center text-on-surface-variant" colSpan={8}>暂无用户</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
