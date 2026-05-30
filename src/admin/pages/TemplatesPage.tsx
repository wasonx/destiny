import React, { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Send } from 'lucide-react';
import { adminRequest } from '../api';

type ReportTemplate = {
  id: string;
  name: string;
  report_kind?: string;
  sections?: unknown[];
  tone?: string;
  disclaimer?: string;
  forbidden_expressions?: string[];
  risk_boundary?: string;
  template_scope?: Record<string, unknown>;
  status: string;
  version_no?: number;
};

const emptyForm = {
  name: '',
  report_kind: 'life',
  sections: '[\n  {"key": "summary", "title": "概要"}\n]',
  tone: '亲民、克制、可解释',
  disclaimer: '内容仅作自我探索与生活参考，不构成医疗、投资、法律或重大人生决策建议。',
  forbidden_expressions: '一定, 必定, 保证',
  risk_boundary: '',
  template_scope: '{"tier":["free","full"]}',
  changeSummary: '模板草稿更新',
};

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function listText(value?: string[]) {
  return (value || []).join(', ');
}

function safeJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export default function TemplatesPage() {
  const [status, setStatus] = useState('draft');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState('等待预览');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadTemplates(nextStatus = status) {
    const data = await adminRequest<{ templates: ReportTemplate[] }>(`/templates?status=${encodeURIComponent(nextStatus)}`);
    setTemplates(data.templates || []);
  }

  useEffect(() => {
    void loadTemplates(status);
  }, [status]);

  function selectTemplate(template: ReportTemplate) {
    setSelectedId(template.id);
    setForm({
      name: template.name || '',
      report_kind: template.report_kind || 'life',
      sections: JSON.stringify(template.sections || [], null, 2),
      tone: template.tone || '亲民、克制、可解释',
      disclaimer: template.disclaimer || emptyForm.disclaimer,
      forbidden_expressions: listText(template.forbidden_expressions),
      risk_boundary: template.risk_boundary || '',
      template_scope: JSON.stringify(template.template_scope || {}, null, 2),
      changeSummary: `更新 ${template.name || '报告模板'}`,
    });
  }

  function newDraft() {
    setSelectedId('');
    setForm(emptyForm);
    setMessage('');
    setError('');
  }

  function buildPayload() {
    return {
      name: form.name,
      report_kind: form.report_kind,
      sections: safeJson(form.sections, []),
      tone: form.tone,
      disclaimer: form.disclaimer,
      forbidden_expressions: splitList(form.forbidden_expressions),
      risk_boundary: form.risk_boundary,
      template_scope: safeJson(form.template_scope, {}),
    };
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (selectedId) {
        await adminRequest(`/templates/${encodeURIComponent(selectedId)}`, { method: 'PATCH', body: JSON.stringify(buildPayload()) });
      } else {
        const data = await adminRequest<{ template: ReportTemplate }>('/templates', { method: 'POST', body: JSON.stringify(buildPayload()) });
        setSelectedId(data.template.id);
      }
      setMessage('保存草稿成功');
      await loadTemplates();
    } catch {
      setError('保存草稿失败');
    }
  }

  async function publishTemplate() {
    if (!selectedId) {
      setError('请选择报告模板');
      return;
    }
    setError('');
    await adminRequest(`/templates/${encodeURIComponent(selectedId)}/publish`, { method: 'POST', body: JSON.stringify({ changeSummary: form.changeSummary }) });
    setMessage('发布成功');
    await loadTemplates();
  }

  async function disableTemplate() {
    if (!selectedId) {
      setError('请选择报告模板');
      return;
    }
    setError('');
    await adminRequest(`/templates/${encodeURIComponent(selectedId)}/disable`, { method: 'POST', body: JSON.stringify({ changeSummary: form.changeSummary }) });
    setMessage('停用成功');
    await loadTemplates();
  }

  async function previewTemplate() {
    const id = selectedId || 'draft';
    const data = await adminRequest<{ preview: unknown }>(`/templates/${encodeURIComponent(id)}/preview`, {
      method: 'POST',
      body: JSON.stringify(buildPayload()),
    });
    setPreview(JSON.stringify(data.preview, null, 2));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">报告模板</h2>
          <button onClick={() => void loadTemplates()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
            <RefreshCcw className="h-4 w-4" />
            刷新
          </button>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="mb-4 w-full rounded-md border border-shadow-gray px-3 py-2">
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="disabled">已停用</option>
        </select>
        <button onClick={newDraft} className="mb-4 flex w-full items-center justify-center gap-2 rounded-md bg-serene-teal px-4 py-3 text-white">
          <Plus className="h-4 w-4" />
          新建草稿
        </button>
        <div className="space-y-2">
          {templates.map((template) => (
            <button key={template.id} onClick={() => selectTemplate(template)} className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedId === template.id ? 'border-ink-blue bg-surface' : 'border-shadow-gray'}`}>
              <div className="font-medium">{template.name || '未命名模板'}</div>
              <div className="mt-1 text-xs text-on-surface-variant">版本 {template.version_no || 1} · {template.status}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <form onSubmit={saveDraft} className="rounded-lg border border-shadow-gray bg-white p-5">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="模板名称" className="mb-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <select value={form.report_kind} onChange={(event) => setForm({ ...form, report_kind: event.target.value })} className="mb-3 w-full rounded-md border border-shadow-gray px-3 py-2">
            <option value="life">免费版 / 完整版</option>
            <option value="free">免费版</option>
            <option value="full">完整版</option>
          </select>
          <textarea value={form.sections} onChange={(event) => setForm({ ...form, sections: event.target.value })} placeholder="段落结构 JSON" className="min-h-56 w-full rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" />
          <textarea value={form.disclaimer} onChange={(event) => setForm({ ...form, disclaimer: event.target.value })} placeholder="免责声明" className="mt-3 min-h-20 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value })} placeholder="表达语气" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.forbidden_expressions} onChange={(event) => setForm({ ...form, forbidden_expressions: event.target.value })} placeholder="禁用表达，用逗号分隔" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <textarea value={form.risk_boundary} onChange={(event) => setForm({ ...form, risk_boundary: event.target.value })} placeholder="风险边界" className="mt-3 min-h-20 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <textarea value={form.template_scope} onChange={(event) => setForm({ ...form, template_scope: event.target.value })} placeholder="适用范围 JSON" className="mt-3 min-h-20 w-full rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" />
          <input value={form.changeSummary} onChange={(event) => setForm({ ...form, changeSummary: event.target.value })} placeholder="变更摘要" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-4 py-2">
              <Send className="h-4 w-4" />
              保存草稿
            </button>
            <button type="button" onClick={() => void publishTemplate()} className="rounded-md bg-ink-blue px-4 py-2 text-white">发布</button>
            <button type="button" onClick={() => void disableTemplate()} className="rounded-md border border-shadow-gray px-4 py-2 text-cinnabar">停用</button>
            <button type="button" onClick={() => void previewTemplate()} className="rounded-md border border-shadow-gray px-4 py-2">预览</button>
          </div>
          {message && <p className="mt-3 text-sm text-serene-teal">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
        <section className="rounded-lg border border-shadow-gray bg-white p-5">
          <h3 className="font-serif text-xl mb-4">模板预览</h3>
          <pre className="max-h-64 overflow-auto rounded-md bg-surface p-3 text-xs">{preview}</pre>
        </section>
      </section>
    </div>
  );
}
