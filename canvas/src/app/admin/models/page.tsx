"use client";

import { useState, useEffect, useCallback } from "react";

interface ModelConfig {
  id: number;
  displayName: string;
  provider: string;
  modelId: string;
  endpointType: string;
  billingType: string;
  platformCost: string | null;
  userCreditCost: string;
  enabled: boolean;
  userSelectable: boolean;
  sortOrder: number;
  concurrencyLimit: number;
  timeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
}

interface EditForm {
  displayName: string;
  provider: string;
  modelId: string;
  endpointType: string;
  billingType: string;
  platformCost: string;
  userCreditCost: string;
  enabled: boolean;
  userSelectable: boolean;
  sortOrder: number;
  concurrencyLimit: number;
  timeoutSeconds: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  google: "Google",
};

const ENDPOINT_LABELS: Record<string, string> = {
  openai_images: "OpenAI Images",
  gemini_generate_content: "Gemini GenerateContent",
};

const BILLING_LABELS: Record<string, string> = {
  metered: "按量计费",
  per_request: "按次计费",
};

function providerBadgeCls(provider: string): string {
  return provider === "openai"
    ? "bg-green-900/30 text-green-400"
    : "bg-blue-900/30 text-blue-400";
}

const defaultForm: EditForm = {
  displayName: "",
  provider: "openai",
  modelId: "",
  endpointType: "openai_images",
  billingType: "metered",
  platformCost: "",
  userCreditCost: "0.07",
  enabled: true,
  userSelectable: true,
  sortOrder: 0,
  concurrencyLimit: 3,
  timeoutSeconds: 120,
};

export default function AdminModelsPage() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/models");
      const data = await res.json();
      if (data.success) {
        setModels(data.data.models);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchModels());
  }, [fetchModels]);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setError("");
    setShowModal(true);
  }

  function openEdit(model: ModelConfig) {
    setEditingId(model.id);
    setForm({
      displayName: model.displayName,
      provider: model.provider,
      modelId: model.modelId,
      endpointType: model.endpointType,
      billingType: model.billingType,
      platformCost: model.platformCost ?? "",
      userCreditCost: model.userCreditCost,
      enabled: model.enabled,
      userSelectable: model.userSelectable,
      sortOrder: model.sortOrder,
      concurrencyLimit: model.concurrencyLimit,
      timeoutSeconds: model.timeoutSeconds,
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.displayName || !form.modelId || !form.userCreditCost) {
      setError("请填写必填字段");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        displayName: form.displayName,
        provider: form.provider,
        modelId: form.modelId,
        endpointType: form.endpointType,
        billingType: form.billingType,
        platformCost: form.platformCost ? parseFloat(form.platformCost) : null,
        userCreditCost: parseFloat(form.userCreditCost),
        enabled: form.enabled,
        userSelectable: form.userSelectable,
        sortOrder: form.sortOrder,
        concurrencyLimit: form.concurrencyLimit,
        timeoutSeconds: form.timeoutSeconds,
      };

      const url = editingId ? `/api/admin/models/${editingId}` : "/api/admin/models";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "保存失败");
        return;
      }

      setShowModal(false);
      await fetchModels();
    } catch {
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(model: ModelConfig) {
    await fetch(`/api/admin/models/${model.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !model.enabled }),
    });
    await fetchModels();
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除这个模型配置吗？")) return;
    await fetch(`/api/admin/models/${id}`, { method: "DELETE" });
    await fetchModels();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-fg">模型管理</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity"
        >
          添加模型
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="text-left px-4 py-3 text-muted font-medium">模型</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Provider</th>
              <th className="text-left px-4 py-3 text-muted font-medium">接口类型</th>
              <th className="text-left px-4 py-3 text-muted font-medium">计费方式</th>
              <th className="text-left px-4 py-3 text-muted font-medium">用户扣费</th>
              <th className="text-left px-4 py-3 text-muted font-medium">并发限制</th>
              <th className="text-left px-4 py-3 text-muted font-medium">状态</th>
              <th className="text-left px-4 py-3 text-muted font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  加载中...
                </td>
              </tr>
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  暂无模型配置，点击&ldquo;添加模型&rdquo;创建
                </td>
              </tr>
            ) : (
              models.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-border hover:bg-surface2 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-fg">{m.displayName}</div>
                    <div className="text-xs text-muted font-mono">{m.modelId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${providerBadgeCls(m.provider)}`}
                    >
                      {PROVIDER_LABELS[m.provider] || m.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {ENDPOINT_LABELS[m.endpointType] || m.endpointType}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {BILLING_LABELS[m.billingType] || m.billingType}
                  </td>
                  <td className="px-4 py-3">{parseFloat(m.userCreditCost).toFixed(2)}</td>
                  <td className="px-4 py-3">{m.concurrencyLimit}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleEnabled(m)}
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        m.enabled
                          ? "bg-green-900/30 text-green-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {m.enabled ? "启用" : "禁用"}
                    </button>
                    {!m.userSelectable && (
                      <span className="ml-1 text-xs text-muted">(不可选)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="text-xs text-accent hover:opacity-80"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-xs text-red-400 hover:opacity-80"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg w-full max-w-lg p-6">
            <h2 className="text-lg font-medium text-fg mb-4">
              {editingId ? "编辑模型" : "添加模型"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-900/30 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-muted mb-1">
                  展示名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="GPT Image2"
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">
                    Provider <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="google">Google</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">
                    接口类型 <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.endpointType}
                    onChange={(e) => setForm({ ...form, endpointType: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="openai_images">OpenAI Images</option>
                    <option value="gemini_generate_content">Gemini GenerateContent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">
                  Model ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.modelId}
                  onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                  placeholder="gpt-image-2"
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">计费方式</label>
                  <select
                    value={form.billingType}
                    onChange={(e) => setForm({ ...form, billingType: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="metered">按量计费</option>
                    <option value="per_request">按次计费</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">
                    用户扣费积分 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.userCreditCost}
                    onChange={(e) => setForm({ ...form, userCreditCost: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">平台成本</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.platformCost}
                  onChange={(e) => setForm({ ...form, platformCost: e.target.value })}
                  placeholder="留空表示未知"
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">并发限制</label>
                  <input
                    type="number"
                    min="1"
                    value={form.concurrencyLimit}
                    onChange={(e) => setForm({ ...form, concurrencyLimit: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">超时(秒)</label>
                  <input
                    type="number"
                    min="10"
                    value={form.timeoutSeconds}
                    onChange={(e) => setForm({ ...form, timeoutSeconds: parseInt(e.target.value) || 120 })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">排序</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    className="rounded border-border"
                  />
                  启用
                </label>

                <label className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={form.userSelectable}
                    onChange={(e) => setForm({ ...form, userSelectable: e.target.checked })}
                    className="rounded border-border"
                  />
                  前台可选
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-muted text-sm hover:text-fg"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
