import React, { useEffect, useRef, useState } from 'react';
import * as QRCode from 'qrcode';
import { KeyRound, QrCode, Smartphone } from 'lucide-react';
import { createQrLoginSession, fetchQrLoginStatus, sendOtp, verifyOtp } from '../lib/customerAuth';

interface Props {
  onLoggedIn: () => void;
}

export default function LoginPanel({ onLoggedIn }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const qrPollTimer = useRef<number | null>(null);

  function clearQrPollTimer() {
    if (qrPollTimer.current) {
      window.clearTimeout(qrPollTimer.current);
      qrPollTimer.current = null;
    }
  }

  useEffect(() => () => clearQrPollTimer(), []);

  async function handleSend() {
    await sendOtp(phone);
    setMessage('验证码已发送');
  }

  async function handleLogin() {
    await verifyOtp(phone, code);
    setMessage('登录成功');
    onLoggedIn();
  }

  async function pollQrLoginStatus(token: string) {
    const status = await fetchQrLoginStatus(token);
    setQrStatus(status.status);
    if (status.status === 'confirmed' && status.customerToken) {
      clearQrPollTimer();
      setMessage('扫码登录成功');
      onLoggedIn();
      return;
    }
    if (status.status === 'expired' || status.status === 'cancelled') {
      clearQrPollTimer();
      setMessage('二维码已失效，请刷新后重试');
      return;
    }
    qrPollTimer.current = window.setTimeout(() => {
      pollQrLoginStatus(token).catch(() => {
        clearQrPollTimer();
        setMessage('扫码登录状态获取失败');
      });
    }, 1800);
  }

  async function startQrLogin() {
    clearQrPollTimer();
    setQrLoading(true);
    setQrStatus('');
    setMessage('');
    try {
      const session = await createQrLoginSession();
      const image = await QRCode.toDataURL(JSON.stringify({
        type: 'zhensuan_customer_qr_login',
        token: session.token,
      }), {
        margin: 1,
        width: 180,
      });
      setQrImage(image);
      setQrStatus(session.status);
      await pollQrLoginStatus(session.token);
    } catch (error) {
      clearQrPollTimer();
      setQrImage('');
      setMessage('二维码生成失败，请稍后重试');
    } finally {
      setQrLoading(false);
    }
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
      <div className="mt-5 border-t border-shadow-gray pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-blue">
            <QrCode className="h-4 w-4 text-serene-teal" />
            <span>扫码登录</span>
          </div>
          <button onClick={startQrLogin} disabled={qrLoading} className="rounded-md border border-shadow-gray px-4 py-2 text-sm">
            {qrLoading ? '生成中' : qrImage ? '刷新二维码' : '生成二维码'}
          </button>
        </div>
        {qrImage ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-md bg-rice-paper p-4 text-center">
            <img src={qrImage} alt="扫码登录二维码" className="h-[180px] w-[180px]" />
            <p className="text-xs text-mist-gray">{qrStatus === 'pending' ? '请用甄好算微信小程序扫码确认' : qrStatus}</p>
          </div>
        ) : null}
      </div>
      {message ? <p className="mt-3 text-sm text-serene-teal">{message}</p> : null}
    </section>
  );
}
