'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Code2, Plus, Copy, Check, Layers, Globe, Tag, AlertTriangle,
  ShieldCheck, Sparkles, ChevronDown, ChevronUp, X
} from 'lucide-react';

type App = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  defaultScopes: string;
  createdAt: string;
};

const PRESET_SCOPES = [
  'read:health:metrics',
  'read:health:steps',
  'read:health:sleep',
  'read:location:current',
  'read:location:history',
  'read:profile:basic',
  'read:finance:summary',
];

export default function DeveloperPortal() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [customScope, setCustomScope] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apps');
      if (res.ok) setApps(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const addCustomScope = () => {
    const trimmed = customScope.trim().toLowerCase().replace(/\s+/g, ':');
    if (trimmed && !selectedScopes.has(trimmed)) {
      setSelectedScopes((prev) => new Set(prev).add(trimmed));
    }
    setCustomScope('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !description.trim() || selectedScopes.size === 0) {
      setError('Please fill in all fields and select at least one scope.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          defaultScopes: Array.from(selectedScopes),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to register app');
        return;
      }

      setSuccess(`App "${data.name}" registered! Client ID: ${data.clientId}`);
      setName('');
      setDescription('');
      setSelectedScopes(new Set());
      await fetchApps();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const slugify = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Code2 size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight m-0">
            Developer Portal
          </h1>
        </div>
        <p className="text-gray-500 text-sm m-0">
          Register and manage third-party applications that can request access to user data via the consent flow.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* ── Registration Form ── */}
        <div className="glass p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-5 m-0">
            <Plus size={18} className="text-indigo-500" />
            Register New App
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* App Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                App Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NutriTrack Pro"
                className="input-field"
              />
              {name && (
                <div className="text-xs text-indigo-600 mt-1.5 font-mono">
                  clientId: {slugify(name) || '…'}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your app does and why it needs access..."
                rows={3}
                className="input-field min-h-[80px] resize-y"
              />
            </div>

            {/* Scopes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Default Scopes
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_SCOPES.map((scope) => {
                  const selected = selectedScopes.has(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md cursor-pointer transition-all border ${
                        selected
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {selected ? '✓ ' : ''}{scope}
                    </button>
                  );
                })}
              </div>

              {/* Selected custom scopes */}
              {selectedScopes.size > 0 && Array.from(selectedScopes).filter(s => !PRESET_SCOPES.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  {Array.from(selectedScopes).filter(s => !PRESET_SCOPES.includes(s)).map((scope) => (
                    <span key={scope} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2 py-0.5 shadow-sm">
                      <span className="scope-tag !border-none !bg-transparent !p-0">{scope}</span>
                      <button type="button" onClick={() => toggleScope(scope)} className="text-rose-400 hover:text-rose-600 focus:outline-none p-0.5 leading-none">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Custom scope input */}
              <div className="flex gap-2">
                <input
                  value={customScope}
                  onChange={(e) => setCustomScope(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomScope(); } }}
                  placeholder="Add custom scope (e.g. read:calendar:events)"
                  className="input-field !text-xs !font-mono flex-1"
                />
                <button type="button" onClick={addCustomScope} className="btn-ghost shrink-0 !px-3">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />{error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm flex items-center gap-2">
                <ShieldCheck size={16} />{success}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 mt-2">
              {submitting ? <><span className="spinner w-4 h-4" /> Registering...</> : <><Sparkles size={16} /> Register App</>}
            </button>
          </form>
        </div>

        {/* ── Registered Apps List ── */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 m-0">
            <Layers size={18} className="text-indigo-500" />
            Registered Apps
            <span className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-100">
              {apps.length}
            </span>
          </h2>

          {loading ? (
            <div className="flex justify-center p-10 text-gray-400">
              <span className="spinner border-gray-200 border-t-indigo-500" />
            </div>
          ) : apps.length === 0 ? (
            <div className="glass p-10 text-center rounded-2xl">
              <Globe size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="m-0 text-gray-500">No apps registered yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {apps.map((app) => {
                const scopes: string[] = JSON.parse(app.defaultScopes || '[]');
                const isExpanded = expandedApp === app.id;
                return (
                  <div key={app.id} className="glass overflow-hidden">
                    {/* App header */}
                    <div
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                    >
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{app.name}</div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {scopes.length} scope{scopes.length !== 1 ? 's' : ''} · Registered {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="badge-requested !text-[10px] !py-0.5 !px-2">
                          <Tag size={10} />
                          {app.clientId}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50/30 animate-fade-in">
                        <p className="m-0 mb-4 text-sm text-gray-600">{app.description}</p>

                        {/* clientId copy */}
                        <div className="mb-4">
                          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Client ID</div>
                          <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                            <code className="flex-1 text-sm text-sky-600 font-mono px-2">{app.clientId}</code>
                            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(app.clientId, app.id); }} className="btn-ghost !px-2 !py-1.5 !text-[11px] border-transparent hover:border-gray-200 bg-gray-50">
                              {copiedId === app.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Scopes */}
                        <div>
                          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Default Scopes</div>
                          <div className="flex flex-wrap gap-1.5">
                            {scopes.map((s) => <span key={s} className="scope-tag">{s}</span>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
