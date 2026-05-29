import React from 'react';

export default function UsersPage() {
  return (
    <div className="rounded-lg border border-shadow-gray bg-white p-6">
      <h2 className="font-serif text-2xl mb-4">用户管理</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-on-surface-variant"><th className="py-2">账号类别</th><th>登录方式</th><th>状态</th></tr></thead>
        <tbody>
          <tr className="border-t border-shadow-gray"><td className="py-3">客户</td><td>微信登录、手机验证码、扫码登录</td><td>启用</td></tr>
          <tr className="border-t border-shadow-gray"><td className="py-3">后端编辑人员</td><td>账号密码</td><td>启用</td></tr>
          <tr className="border-t border-shadow-gray"><td className="py-3">平台管理人员</td><td>账号密码</td><td>启用</td></tr>
        </tbody>
      </table>
    </div>
  );
}
