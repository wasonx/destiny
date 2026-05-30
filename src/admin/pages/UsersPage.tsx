import React, { useEffect, useState } from 'react';
import { GitMerge, RefreshCcw, Unlink2 } from 'lucide-react';
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
  identities?: Array<{
    id?: string;
    provider: string;
    provider_subject?: string;
    phone?: string | null;
    openid?: string | null;
    unionid?: string | null;
  }>;
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

function identityPath(userId: string, identityId: string) {
  return `/users/${userId}/identities/${identityId}`;
}

export default function UsersPage() {
  const [accountType, setAccountType] = useState<AccountType>('all');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

  async function unlinkIdentity(userId: string, identityId?: string) {
    if (!identityId) return;
    if (!window.confirm('确认解绑该身份？')) return;
    setError('');
    setMessage('');
    try {
      await adminRequest(identityPath(userId, identityId), { method: 'DELETE' });
      setMessage('身份已解绑');
      await loadUsers(accountType);
    } catch {
      setError('身份解绑失败，请确认客户至少保留一种登录身份');
    }
  }

  async function mergeCustomer(sourceUserId: string) {
    if (!mergeTargetId) {
      setError('请先填写目标客户 ID');
      return;
    }
    if (mergeTargetId === sourceUserId) {
      setError('源客户和目标客户不能相同');
      return;
    }
    if (!window.confirm(`确认将客户 ${sourceUserId} 合并到 ${mergeTargetId}？源客户会被禁用。`)) return;
    setError('');
    setMessage('');
    try {
      await adminRequest(`/users/${mergeTargetId}/merge-customer`, {
        method: 'POST',
        body: JSON.stringify({ sourceUserId, reason: 'customer.merge' }),
      });
      setMessage('客户已合并，源客户已禁用');
      await loadUsers(accountType);
    } catch {
      setError('客户合并失败，请确认两个客户 ID 都存在且均为客户账号');
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
          <input
            value={mergeTargetId}
            onChange={(event) => setMergeTargetId(event.target.value.trim())}
            placeholder="目标客户 ID"
            className="w-56 rounded-md border border-shadow-gray px-3 py-2 text-sm"
          />
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
      {message && <p className="mx-5 mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-serene-teal">{message}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
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
              <th>操作</th>
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
                <td className="max-w-[320px]">
                  {(user.identities || []).length ? (
                    <div className="grid gap-2">
                      {(user.identities || []).map((identity, index) => (
                        <div key={identity.id || `${identity.provider}-${index}`} className="flex items-start justify-between gap-2 rounded-md bg-surface px-2 py-1">
                          <div className="min-w-0">
                            <div className="font-medium">{identity.provider}</div>
                            <div className="truncate font-mono text-xs text-on-surface-variant">
                              {identity.provider_subject || identity.openid || identity.unionid || identity.phone || '-'}
                            </div>
                          </div>
                          {user.account_type === 'customer' && identity.id ? (
                            <button
                              type="button"
                              onClick={() => void unlinkIdentity(user.id, identity.id)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-shadow-gray px-2 py-1 text-xs"
                            >
                              <Unlink2 className="h-3 w-3" />
                              解绑身份
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : '-'}
                </td>
                <td>{user.status}</td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  {user.account_type === 'customer' ? (
                    <button
                      type="button"
                      onClick={() => void mergeCustomer(user.id)}
                      disabled={!mergeTargetId || mergeTargetId === user.id}
                      className="inline-flex items-center gap-1 rounded-md border border-shadow-gray px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      title="将当前客户合并到目标客户"
                    >
                      <GitMerge className="h-3 w-3" />
                      合并客户
                    </button>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td className="px-4 py-8 text-center text-on-surface-variant" colSpan={9}>暂无用户</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
