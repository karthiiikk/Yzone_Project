'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical, Zap, Play, Key, AlertTriangle, CheckCircle2,
  XCircle, ChevronDown, Copy, Check, RefreshCw, Shield, Lock,
  Unlock, Terminal, ArrowRight, Clock
} from 'lucide-react';
import ConsentModal from '@/components/ConsentModal';

type App = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  defaultScopes: string;
  createdAt: string;
};

type Consent = {
  id: string;
  status: string;
  grantedScopes: string;
  expiresAt: string | null;
  app: { name: string; clientId: string };
};

type GrantedToken = {
  appName: string;
  clientId: string;
  accessToken: string;
  expiresAt: string;
  consentId: string;
  grantedScopes: string[];
};

type ApiResult = {
  status: number;
  ok: boolean;
  data: unknown;
  duration: number;
};

export default function Sandbox() {
  const [apps, setApps] = useState<App[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Session tokens (granted this session)
  const [sessionTokens, setSessionTokens] = useState<GrantedToken[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // API Tester state
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [manualToken, setManualToken] = useState('');
  const [selectedScope, setSelectedScope] = useState('');
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, userRes, consentsRes] = await Promise.all([
        fetch('/api/apps'),
        fetch('/api/users'),
        fetch('/api/consents'),
      ]);
      if (appsRes.ok) setApps(await appsRes.json());
      if (userRes.ok) {
        const u = await userRes.json();
        setUserId(u.id);
      }
      if (consentsRes.ok) {
        const all = await consentsRes.json();
        setConsents(all.filter((c: Consent) => c.status === 'ACTIVE'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derive all unique scopes from every registered app — updates live as apps are added
  const allScopes = Array.from(
    new Set(
      apps.flatMap((app) => {
        try { return JSON.parse(app.defaultScopes) as string[]; }
        catch { return []; }
      })
    )
  );

  // Auto-select the first available scope when apps load or change
  useEffect(() => {
    if (allScopes.length > 0 && (!selectedScope || !allScopes.includes(selectedScope))) {
      setSelectedScope(allScopes[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps]);

  const handleGranted = (app: App, result: { accessToken: string; expiresAt: string; consentId: string }) => {
    const newToken: GrantedToken = {
      appName: app.name,
      clientId: app.clientId,
      accessToken: result.accessToken,
      expiresAt: result.expiresAt,
      consentId: result.consentId,
      grantedScopes: JSON.parse(app.defaultScopes || '[]'),
    };
    setSessionTokens((prev) => [newToken, ...prev]);
    setSelectedToken(result.accessToken);
    setShowModal(false);
    fetchData();
  };

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const fetchProtectedData = async () => {
    const token = manualToken.trim() || selectedToken;
    if (!token) return;

    setApiLoading(true);
    setApiResult(null);
    const start = performance.now();

    try {
      const url = `/api/v1/protected-data?scope=${encodeURIComponent(selectedScope)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const duration = Math.round(performance.now() - start);
      const data = await res.json();
      setApiResult({ status: res.status, ok: res.ok, data, duration });
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      setApiResult({ status: 0, ok: false, data: { error: 'Network error' }, duration });
    } finally {
      setApiLoading(false);
      fetchData(); // Refresh audit logs
    }
  };

  const activeToken = manualToken.trim() || selectedToken;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm">
            <FlaskConical size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight m-0">
            API Sandbox
          </h1>
        </div>
        <p className="text-gray-500 text-sm m-0">
          Simulate the full OAuth 2.0 consent flow and test the protected data endpoint with real JWT tokens.
        </p>
      </div>

      {/* ── Section A: Simulate Consent Request ── */}
      <div className="glass p-6 lg:p-8 rounded-2xl mb-8">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2 m-0">
          <Zap size={18} className="text-amber-500" />
          Step 1 — Simulate App Access Request
        </h2>
        <p className="text-sm text-gray-500 mb-6 m-0">
          Select a registered app to trigger the OAuth-style consent modal. You will receive a signed JWT access token upon granting.
        </p>

        {loading ? (
          <div className="flex justify-center p-6 text-gray-400">
             <span className="spinner border-gray-200 border-t-indigo-500" />
          </div>
        ) : apps.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
            No apps registered. Visit the <a href="/developer" className="text-indigo-600 hover:underline">Developer Portal</a> to register one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => {
              const scopes: string[] = JSON.parse(app.defaultScopes || '[]');
              return (
                <div key={app.id} className="glass-light glass-hover p-5 flex flex-col gap-3 rounded-xl bg-gray-50">
                  <div>
                    <div className="font-bold text-gray-900 text-sm mb-0.5">{app.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{app.clientId}</div>
                  </div>
                  <p className="m-0 text-xs text-gray-600 leading-relaxed line-clamp-2">{app.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {scopes.slice(0, 2).map(s => <span key={s} className="scope-tag">{s}</span>)}
                    {scopes.length > 2 && <span className="text-[10px] text-gray-500 self-center">+{scopes.length - 2} more</span>}
                  </div>
                  <button
                    onClick={() => { setSelectedApp(app); setShowModal(true); }}
                    className="btn-primary w-full py-2 mt-2"
                    disabled={!userId}
                  >
                    <ArrowRight size={16} />
                    Request Access
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Session tokens from this session */}
        {sessionTokens.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key size={14} />
              Tokens Granted This Session
            </div>
            <div className="flex flex-col gap-3">
              {sessionTokens.map((t, i) => (
                <div key={i} className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 mb-3">
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">{t.appName}</span>
                      <span className="text-[11px] text-gray-500 ml-2">
                        <Clock size={12} className="inline mr-1 -mt-0.5" />
                        Expires {new Date(t.expiresAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyToken(t.accessToken)} className="btn-ghost !px-2 !py-1 !text-[11px] border-emerald-200 bg-white">
                        {copiedToken === t.accessToken ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copiedToken === t.accessToken ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => setSelectedToken(t.accessToken)}
                        className={`px-3 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                          selectedToken === t.accessToken
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {selectedToken === t.accessToken ? '✓ Selected' : 'Use in Tester'}
                      </button>
                    </div>
                  </div>
                  <div className="code-block !text-[10px] !p-2 !bg-white/80">
                    {t.accessToken.substring(0, 80)}…
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Section B: API Tester ── */}
      <div className="glass p-6 lg:p-8 rounded-2xl">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2 m-0">
          <Terminal size={18} className="text-indigo-500" />
          Step 2 — 3rd-Party API Tester
        </h2>
        <p className="text-sm text-gray-500 mb-6 m-0">
          Send a real HTTP request to <code className="bg-gray-100 text-sky-600 px-1.5 py-0.5 rounded font-mono text-[11px]">GET /api/v1/protected-data</code> with your JWT token and see the live response.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Controls */}
          <div className="flex flex-col gap-5">
            {/* Token selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Key size={14} className="inline -mt-0.5 mr-1" />
                Access Token (JWT)
              </label>
              {sessionTokens.length > 0 && (
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="input-field mb-2 !py-2 !text-xs"
                >
                  <option value="">— Select from session tokens —</option>
                  {sessionTokens.map((t, i) => (
                    <option key={i} value={t.accessToken}>{t.appName} · {t.clientId}</option>
                  ))}
                </select>
              )}
              <textarea
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Or paste a JWT token directly here..."
                rows={3}
                className="input-field !font-mono !text-xs min-h-[70px] resize-y"
              />
            </div>

            {/* Scope selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <Shield size={14} className="inline -mt-0.5 mr-1" />
                Requested Scope
              </label>
              <select value={selectedScope} onChange={(e) => setSelectedScope(e.target.value)} className="input-field !py-2.5 !text-sm">
                {allScopes.length === 0 ? (
                  <option value="">No scopes available — register an app first</option>
                ) : (
                  allScopes.map((s) => <option key={s} value={s}>{s}</option>)
                )}
              </select>
              <div className="text-[11px] text-gray-500 mt-2">
                URL: <code className="font-mono text-sky-600 bg-gray-50 px-1 rounded">/api/v1/protected-data?scope={selectedScope}</code>
              </div>
            </div>

            {/* Token status indicator */}
            {activeToken ? (
              <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700">
                <Unlock size={16} />
                Token loaded · {activeToken.length} chars
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-600">
                <Lock size={16} />
                No token loaded. Grant access above or paste a token.
              </div>
            )}

            <button
              onClick={fetchProtectedData}
              disabled={!activeToken || apiLoading}
              className="btn-primary w-full py-3"
            >
              {apiLoading ? (
                <><span className="spinner w-4 h-4 border-indigo-200 border-t-white" /> Sending Request...</>
              ) : (
                <><Play size={16} /> Fetch Protected Data</>
              )}
            </button>
          </div>

          {/* Response Panel */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal size={14} />
              Live Response
            </div>
            <div className="bg-[#1e1e1e] rounded-xl border border-gray-200 min-h-[320px] overflow-hidden flex flex-col shadow-inner">
              {/* Status bar */}
              <div className="px-4 py-2.5 border-b border-[#333] flex justify-between items-center bg-[#252526]">
                <span className="text-[11px] text-gray-400 font-mono">
                  GET /api/v1/protected-data
                </span>
                {apiResult && (
                  <div className="flex items-center gap-3">
                    <span className={
                      apiResult.status === 200 ? 'text-emerald-400 font-bold font-mono text-xs' :
                      apiResult.status >= 400 ? 'text-rose-400 font-bold font-mono text-xs' :
                      'text-amber-400 font-bold font-mono text-xs'
                    }>
                      {apiResult.ok ? (
                        <><CheckCircle2 size={12} className="inline -mt-0.5 mr-1" /> {apiResult.status} OK</>
                      ) : (
                        <><XCircle size={12} className="inline -mt-0.5 mr-1" /> {apiResult.status || 'ERR'} {apiResult.status === 403 ? 'Forbidden' : apiResult.status === 401 ? 'Unauthorized' : 'Error'}</>
                      )}
                    </span>
                    <span className="text-[10px] text-gray-500">{apiResult.duration}ms</span>
                  </div>
                )}
              </div>

              {/* Response body */}
              <div className="p-4 flex-1">
                {!apiResult && !apiLoading && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-gray-500 gap-3">
                    <Terminal size={32} className="opacity-50" />
                    <span className="text-xs">Response will appear here</span>
                  </div>
                )}
                {apiLoading && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-gray-400 gap-3">
                    <span className="spinner w-6 h-6 border-gray-600 border-t-indigo-500" />
                    <span className="text-xs">Sending request...</span>
                  </div>
                )}
                {apiResult && (
                  <div>
                    {/* Visual status card */}
                    <div className={`p-3 rounded-lg mb-4 flex items-center gap-3 border ${
                      apiResult.ok ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
                    }`}>
                      {apiResult.ok
                        ? <CheckCircle2 size={24} className="text-emerald-400" />
                        : <XCircle size={24} className="text-rose-400" />
                      }
                      <div>
                        <div className={`font-bold text-sm ${apiResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {apiResult.ok ? '✓ Access Granted' : '✗ Access Denied'}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {apiResult.ok ? 'Audit log written: ALLOWED' : 'Audit log written: DENIED'}
                        </div>
                      </div>
                    </div>

                    {/* JSON response */}
                    <div className="font-mono text-xs text-[#9cdcfe] whitespace-pre-wrap break-all leading-relaxed">
                      {JSON.stringify(apiResult.data, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Consent Modal ── */}
      {showModal && selectedApp && userId && (
        <ConsentModal
          app={selectedApp}
          userId={userId}
          onClose={() => { setShowModal(false); setSelectedApp(null); }}
          onGranted={(result) => handleGranted(selectedApp, result)}
        />
      )}
    </div>
  );
}
