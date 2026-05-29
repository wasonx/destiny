import React, { useState } from 'react';
import { Lock, LogIn, User } from 'lucide-react';
import { setAdminToken } from '../api';

interface Props {
  onLoggedIn: () => void;
}

export default function LoginPage({ onLoggedIn }: Props) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/destiny-api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('账号或密码不正确');
      const data = await response.json();
      setAdminToken(data.token);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f4] flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-shadow-gray bg-white p-6 shadow-sm">
        <p className="text-xs text-wisdom-gold mb-2">ZHENSUAN ADMIN</p>
        <h1 className="font-serif text-2xl text-ink-blue mb-6">甄算后台登录</h1>
        <label className="block text-sm mb-2">账号</label>
        <div className="mb-4 flex items-center gap-2 rounded-md border border-shadow-gray px-3">
          <User className="h-4 w-4 text-serene-teal" />
          <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full py-3 outline-none" />
        </div>
        <label className="block text-sm mb-2">密码</label>
        <div className="mb-4 flex items-center gap-2 rounded-md border border-shadow-gray px-3">
          <Lock className="h-4 w-4 text-serene-teal" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full py-3 outline-none" />
        </div>
        {error ? <p className="mb-4 rounded-md bg-vital-vermillion/10 px-3 py-2 text-sm text-vital-vermillion">{error}</p> : null}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-ink-blue px-4 py-3 text-white">
          <LogIn className="h-4 w-4" />
          {loading ? '登录中' : '登录'}
        </button>
      </form>
    </div>
  );
}
