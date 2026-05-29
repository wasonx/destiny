import React, { useState } from 'react';
import { KeyRound, Smartphone } from 'lucide-react';
import { sendOtp, verifyOtp } from '../lib/customerAuth';

interface Props {
  onLoggedIn: () => void;
}

export default function LoginPanel({ onLoggedIn }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  async function handleSend() {
    await sendOtp(phone);
    setMessage('验证码已发送');
  }

  async function handleLogin() {
    await verifyOtp(phone, code);
    setMessage('登录成功');
    onLoggedIn();
  }

  return (
    <section className="rounded-lg border border-shadow-gray bg-white p-5">
      <h3 className="font-serif text-xl text-ink-blue mb-4">客户登录</h3>
      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <div className="flex items-center gap-2 rounded-md border border-shadow-gray px-3">
          <Smartphone className="h-4 w-4 text-serene-teal" />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="手机号" className="w-full py-3 outline-none" />
        </div>
        <button onClick={handleSend} className="rounded-md border border-shadow-gray px-4 py-3">发送验证码</button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px]">
        <div className="flex items-center gap-2 rounded-md border border-shadow-gray px-3">
          <KeyRound className="h-4 w-4 text-serene-teal" />
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="验证码" className="w-full py-3 outline-none" />
        </div>
        <button onClick={handleLogin} className="rounded-md bg-ink-blue px-4 py-3 text-white">登录</button>
      </div>
      {message ? <p className="mt-3 text-sm text-serene-teal">{message}</p> : null}
    </section>
  );
}
