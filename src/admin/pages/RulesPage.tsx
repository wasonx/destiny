import React, { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Send } from 'lucide-react';
import { adminRequest } from '../api';

type AnalysisRule = {
  id: string;
  name: string;
  priority?: number;
  weight?: number;
  condition?: Record<string, unknown>;
  conclusion?: string;
  advice?: string;
  risk_boundary?: string;
  knowledge_entry_ids?: string[];
  graph_node_keys?: string[];
  trigger_explanation?: string;
  status: string;
  version_no?: number;
};

const emptyForm = {
  name: '',
  priority: '100',
  weight: '0',
  condition: '{\n  "all": [\n    {"field": "elements.木", "operator": "gte", "value": 2}\n  ]\n}',
  conclusion: '',
  advice: '',
  risk_boundary: '',
  knowledge_entry_ids: '',
  graph_node_keys: '',
  trigger_explanation: '',
  changeSummary: '规则草稿更新',
};

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function listText(value?: string[]) {
  return (value || []).join(', ');
}

function safeJson(value: string) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

export default function RulesPage() {
  const [status, setStatus] = useState('draft');
  const [rules, setRules] = useState<AnalysisRule[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [testResult, setTestResult] = useState('等待运行');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRules(nextStatus = status) {
    const data = await adminRequest<{ rules: AnalysisRule[] }>(`/rules?status=${encodeURIComponent(nextStatus)}`);
    setRules(data.rules || []);
  }

  useEffect(() => {
    void loadRules(status);
  }, [status]);

  function selectRule(rule: AnalysisRule) {
    setSelectedId(rule.id);
    setForm({
      name: rule.name || '',
      priority: String(rule.priority ?? 100),
      weight: String(rule.weight ?? 0),
      condition: JSON.stringify(rule.condition || {}, null, 2),
      conclusion: rule.conclusion || '',
      advice: rule.advice || '',
      risk_boundary: rule.risk_boundary || '',
      knowledge_entry_ids: listText(rule.knowledge_entry_ids),
      graph_node_keys: listText(rule.graph_node_keys),
      trigger_explanation: rule.trigger_explanation || '',
      changeSummary: `更新 ${rule.name || '分析规则'}`,
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
      priority: Number(form.priority || 100),
      weight: Number(form.weight || 0),
      condition: safeJson(form.condition),
      conclusion: form.conclusion,
      advice: form.advice,
      risk_boundary: form.risk_boundary,
      knowledge_entry_ids: splitList(form.knowledge_entry_ids),
      graph_node_keys: splitList(form.graph_node_keys),
      trigger_explanation: form.trigger_explanation,
    };
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (selectedId) {
        await adminRequest(`/rules/${encodeURIComponent(selectedId)}`, { method: 'PATCH', body: JSON.stringify(buildPayload()) });
      } else {
        const data = await adminRequest<{ rule: AnalysisRule }>('/rules', { method: 'POST', body: JSON.stringify(buildPayload()) });
        setSelectedId(data.rule.id);
      }
      setMessage('保存草稿成功');
      await loadRules();
    } catch {
      setError('保存草稿失败');
    }
  }

  async function publishRule() {
    if (!selectedId) {
      setError('请选择分析规则');
      return;
    }
    setError('');
    await adminRequest(`/rules/${encodeURIComponent(selectedId)}/publish`, { method: 'POST', body: JSON.stringify({ changeSummary: form.changeSummary }) });
    setMessage('发布成功');
    await loadRules();
  }

  async function disableRule() {
    if (!selectedId) {
      setError('请选择分析规则');
      return;
    }
    setError('');
    await adminRequest(`/rules/${encodeURIComponent(selectedId)}/disable`, { method: 'POST', body: JSON.stringify({ changeSummary: form.changeSummary }) });
    setMessage('停用成功');
    await loadRules();
  }

  async function runTest() {
    const data = await adminRequest<{ hits: unknown[] }>('/rules/test', {
      method: 'POST',
      body: JSON.stringify({ rules: [{ ...buildPayload(), status: 'draft' }], facts: { elements: { 木: 2 } } }),
    });
    setTestResult(JSON.stringify(data.hits || [], null, 2));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-shadow-gray bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">分析规则</h2>
          <button onClick={() => void loadRules()} className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-3 py-2 text-sm">
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
          {rules.map((rule) => (
            <button key={rule.id} onClick={() => selectRule(rule)} className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedId === rule.id ? 'border-ink-blue bg-surface' : 'border-shadow-gray'}`}>
              <div className="font-medium">{rule.name || '未命名规则'}</div>
              <div className="mt-1 text-xs text-on-surface-variant">版本 {rule.version_no || 1} · {rule.status}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <form onSubmit={saveDraft} className="rounded-lg border border-shadow-gray bg-white p-5">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="规则名称" className="mb-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <input value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} type="number" placeholder="优先级" className="rounded-md border border-shadow-gray px-3 py-2" />
            <input value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} type="number" placeholder="权重" className="rounded-md border border-shadow-gray px-3 py-2" />
          </div>
          <textarea value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} className="min-h-56 w-full rounded-md border border-shadow-gray px-3 py-2 font-mono text-xs" />
          <input value={form.conclusion} onChange={(event) => setForm({ ...form, conclusion: event.target.value })} placeholder="命中解释" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <textarea value={form.advice} onChange={(event) => setForm({ ...form, advice: event.target.value })} placeholder="建议内容" className="mt-3 min-h-20 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.knowledge_entry_ids} onChange={(event) => setForm({ ...form, knowledge_entry_ids: event.target.value })} placeholder="关联知识，使用知识条目 ID 或标题" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.graph_node_keys} onChange={(event) => setForm({ ...form, graph_node_keys: event.target.value })} placeholder="关联图谱节点，如 element.wood" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <textarea value={form.risk_boundary} onChange={(event) => setForm({ ...form, risk_boundary: event.target.value })} placeholder="风险边界" className="mt-3 min-h-24 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <textarea value={form.trigger_explanation} onChange={(event) => setForm({ ...form, trigger_explanation: event.target.value })} placeholder="触发说明" className="mt-3 min-h-20 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <input value={form.changeSummary} onChange={(event) => setForm({ ...form, changeSummary: event.target.value })} placeholder="变更摘要" className="mt-3 w-full rounded-md border border-shadow-gray px-3 py-2" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-md border border-shadow-gray px-4 py-2">
              <Send className="h-4 w-4" />
              保存草稿
            </button>
            <button type="button" onClick={() => void publishRule()} className="rounded-md bg-ink-blue px-4 py-2 text-white">发布</button>
            <button type="button" onClick={() => void disableRule()} className="rounded-md border border-shadow-gray px-4 py-2 text-cinnabar">停用</button>
            <button type="button" onClick={() => void runTest()} className="rounded-md border border-shadow-gray px-4 py-2">测试运行</button>
          </div>
          {message && <p className="mt-3 text-sm text-serene-teal">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
        <section className="rounded-lg border border-shadow-gray bg-white p-5">
          <h3 className="font-serif text-xl mb-4">规则测试</h3>
          <pre className="max-h-56 overflow-auto rounded-md bg-surface p-3 text-xs">{testResult}</pre>
        </section>
      </section>
    </div>
  );
}
