'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldOff, Clock, CheckCircle, XCircle,
  Trash2, Activity, RefreshCw, Link2, Hash,
  TrendingUp, Wifi, WifiOff
} from 'lucide-react';
import { formatDistanceToNow, formatDistance } from 'date-fns';

type Consent = {
  id: string;
  status: string;
  grantedScopes: string;
  expiresAt: string | null;
  createdAt: string;
  app: { id: string; name: string; description: string; clientId: string };
  user: { name: string; email: string };
};

type AuditLog = {
  id: string;
  requestedScope: string;
  status: string;
  accessedAt: string;
  previousHash: string;
  currentHash: string;
  consent: { app: { name: string } };
  app: { name: string };
};

function ConsentCountdown({ expiresAt }: { expiresAt: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const expiry = new Date(expiresAt);
  const now = new Date();
  if (expiry <= now) return <span className="text-amber-500 font-medium">Expired</span>;
  return (
    <span className="text-emerald-600 font-medium font-mono">
      {formatDistance(expiry, now, { includeSeconds: true })}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ACTIVE' ? 'badge-active'
    : status === 'REVOKED' ? 'badge-revoked'
    : status === 'EXPIRED' ? 'badge-expired'
    : 'badge-requested';
  const Icon = status === 'ACTIVE' ? Wifi
    : status === 'REVOKED' ? WifiOff
    : status === 'EXPIRED' ? Clock
    : Activity;
  return (
    <span className={cls}>
      <Icon size={12} />
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'consents' | 'audit'>('consents');
  const [consents, setConsents] = useState<Consent[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [consentsRes, logsRes] = await Promise.all([
        fetch('/api/consents'),
        fetch('/api/audit-logs'),
      ]);
      if (consentsRes.ok) setConsents(await consentsRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await fetch(`/api/consents/${id}/revoke`, { method: 'PATCH' });
      await fetchData();
    } finally {
      setRevoking(null);
    }
  };

  const activeConsents = consents.filter((c) => c.status === 'ACTIVE');
  const allOtherConsents = consents.filter((c) => c.status !== 'ACTIVE');

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight m-0">
            Privacy Dashboard
          </h1>
        </div>
        <p className="text-gray-500 text-sm m-0">
          Logged in as{' '}
          <span className="font-semibold text-indigo-700">
            {consents[0]?.user?.name ?? 'Alice Johnson'}
          </span>{' '}
          · Manage all third-party data access permissions in one place.
        </p>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Connections', value: activeConsents.length, colorClass: 'text-emerald-600', Icon: Wifi },
          { label: 'Total Consents', value: consents.length, colorClass: 'text-indigo-600', Icon: Link2 },
          { label: 'Audit Events', value: logs.length, colorClass: 'text-sky-600', Icon: TrendingUp },
          { label: 'Denied Accesses', value: logs.filter(l => l.status === 'DENIED').length, colorClass: 'text-rose-600', Icon: ShieldOff },
        ].map(({ label, value, colorClass, Icon }) => (
          <div key={label} className="glass glass-hover p-5 rounded-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className={`text-3xl font-bold tracking-tight leading-none mb-1 ${colorClass}`}>
                  {loading ? '—' : value}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {label}
                </div>
              </div>
              <Icon size={20} className={`${colorClass} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'consents' ? 'active' : ''}`} onClick={() => setActiveTab('consents')}>
            Active Connections
          </button>
          <button className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            Audit Trail
          </button>
        </div>
        <button onClick={fetchData} className="btn-ghost !px-3 !py-1.5 !text-xs border-gray-200">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center items-center gap-3 py-20 text-gray-400">
          <span className="spinner border-gray-200 border-t-indigo-500" />
          Loading data...
        </div>
      ) : (
        <>
          {/* Active Connections Tab */}
          {activeTab === 'consents' && (
            <div className="animate-fade-in">
              {/* Active consents */}
              {activeConsents.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                    Active · {activeConsents.length}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeConsents.map((consent) => (
                      <ConsentCard key={consent.id} consent={consent} onRevoke={handleRevoke} revoking={revoking} />
                    ))}
                  </div>
                </div>
              )}

              {/* Other consents */}
              {allOtherConsents.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                    Inactive History · {allOtherConsents.length}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allOtherConsents.map((consent) => (
                      <ConsentCard key={consent.id} consent={consent} onRevoke={handleRevoke} revoking={revoking} />
                    ))}
                  </div>
                </div>
              )}

              {consents.length === 0 && (
                <div className="glass p-16 text-center rounded-2xl flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <ShieldOff size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-semibold mb-1">No active connections</p>
                  <p className="text-gray-500 text-sm m-0">
                    Visit the <a href="/sandbox" className="text-indigo-600 hover:underline">Sandbox</a> to simulate an app access request.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && (
            <div className="animate-fade-in glass rounded-2xl overflow-hidden shadow-sm">
              {logs.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                     <TrendingUp size={32} className="text-gray-400" />
                  </div>
                  <p className="m-0 text-gray-500">No audit events yet. Test the API from the Sandbox.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-200">
                      <tr>
                        {['Timestamp', 'App', 'Scope Requested', 'Status', 'Hash Chain'].map(h => (
                          <th key={h} className="px-6 py-4 font-semibold tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log, idx) => (
                        <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                            {new Date(log.accessedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {log.app?.name ?? log.consent?.app?.name ?? 'Unknown'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="scope-tag">{log.requestedScope}</span>
                          </td>
                          <td className="px-6 py-4">
                            {log.status === 'ALLOWED' ? (
                              <span className="badge-allowed"><CheckCircle size={12} /> ALLOWED</span>
                            ) : (
                              <span className="badge-denied"><XCircle size={12} /> DENIED</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Hash size={14} className="text-indigo-400" />
                              <span title={`Prev: ${log.previousHash}\nCurr: ${log.currentHash}`}
                                className="text-xs font-mono text-indigo-600 cursor-help hover:underline">
                                {log.currentHash.substring(0, 12)}…
                              </span>
                              {idx < logs.length - 1 && (
                                <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">linked</span>
                              )}
                              {idx === logs.length - 1 && (
                                <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">genesis</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ConsentCard({
  consent,
  onRevoke,
  revoking,
}: {
  consent: Consent;
  onRevoke: (id: string) => void;
  revoking: string | null;
}) {
  const scopes: string[] = JSON.parse(consent.grantedScopes || '[]');
  const isActive = consent.status === 'ACTIVE';
  const isRevoking = revoking === consent.id;

  return (
    <div className={`glass glass-hover p-5 rounded-2xl flex flex-col gap-4 ${isActive ? 'border-indigo-100 shadow-sm bg-white' : 'bg-gray-50/50'}`}>
      {/* App header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold text-gray-900 text-base mb-0.5">
            {consent.app.name}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {consent.app.clientId}
          </div>
        </div>
        <StatusBadge status={consent.status} />
      </div>

      {/* Description */}
      <p className="m-0 text-sm text-gray-600 leading-relaxed">
        {consent.app.description}
      </p>

      {/* Granted scopes */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
          Granted Scopes
        </div>
        <div className="flex flex-wrap gap-2">
          {scopes.map((scope) => (
            <span key={scope} className="scope-tag">{scope}</span>
          ))}
        </div>
      </div>

      {/* Expiry timer */}
      {consent.expiresAt && (
        <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-3 mt-1">
          <span className="flex items-center gap-1.5 text-gray-500 font-medium">
            <Clock size={14} />
            {isActive ? 'Expires in' : 'Expired'}
          </span>
          <span>
            {isActive
              ? <ConsentCountdown expiresAt={consent.expiresAt} />
              : <span className="text-gray-400 font-medium">{formatDistanceToNow(new Date(consent.expiresAt), { addSuffix: true })}</span>
            }
          </span>
        </div>
      )}

      {/* Granted time */}
      <div className="flex justify-between text-xs text-gray-400 font-medium">
        <span>Granted</span>
        <span>{formatDistanceToNow(new Date(consent.createdAt), { addSuffix: true })}</span>
      </div>

      {/* Revoke button */}
      {isActive && (
        <button
          onClick={() => onRevoke(consent.id)}
          disabled={isRevoking}
          className="btn-danger w-full mt-2"
        >
          {isRevoking ? <span className="spinner border-rose-200 border-t-rose-600 w-3 h-3" /> : <Trash2 size={16} />}
          {isRevoking ? 'Revoking...' : 'Revoke Access'}
        </button>
      )}
    </div>
  );
}
