'use client';

import { useState } from 'react';
import {
  ShieldCheck, X, Clock, CheckCircle2, Key, AlertTriangle,
  Activity, MapPin, Heart, Moon, TrendingUp, Navigation
} from 'lucide-react';

const DURATION_OPTIONS = [
  { label: '1 Minute (for testing)', value: 60 * 1000 },
  { label: '1 Hour', value: 60 * 60 * 1000 },
  { label: '1 Day', value: 24 * 60 * 60 * 1000 },
  { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', value: 30 * 24 * 60 * 60 * 1000 },
];

const SCOPE_ICONS: Record<string, React.ReactNode> = {
  'read:health:metrics': <Heart size={14} />,
  'read:health:steps':   <Activity size={14} />,
  'read:health:sleep':   <Moon size={14} />,
  'read:location:current': <Navigation size={14} />,
  'read:location:history': <MapPin size={14} />,
};

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'read:health:metrics':    'Heart rate, blood oxygen, resting HR',
  'read:health:steps':      'Daily step count, calories, active minutes',
  'read:health:sleep':      'Sleep duration and stage breakdown',
  'read:location:current':  'Your current GPS location',
  'read:location:history':  'Recently visited places',
};

type App = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  defaultScopes: string;
};

type GrantResult = {
  accessToken: string;
  expiresAt: string;
  consentId: string;
};

type Props = {
  app: App;
  userId: string;
  onClose: () => void;
  onGranted: (result: GrantResult) => void;
};

export default function ConsentModal({ app, userId, onClose, onGranted }: Props) {
  const defaultScopes: string[] = JSON.parse(app.defaultScopes || '[]');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(defaultScopes));
  const [durationMs, setDurationMs] = useState(DURATION_OPTIONS[2].value); // Default: 1 Day
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleGrant = async () => {
    if (selectedScopes.size === 0) {
      setError('Please select at least one scope to grant access.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Step 1: Create REQUESTED consent entry
      const reqRes = await fetch('/api/consents/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: app.clientId, userId }),
      });

      if (!reqRes.ok) {
        const d = await reqRes.json();
        throw new Error(d.error || 'Failed to create consent request');
      }
      const consent = await reqRes.json();

      // Step 2: Grant with user-chosen scopes and duration
      const grantRes = await fetch('/api/consents/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentId: consent.id,
          grantedScopes: Array.from(selectedScopes),
          durationMs,
        }),
      });

      if (!grantRes.ok) {
        const d = await grantRes.json();
        throw new Error(d.error || 'Failed to grant consent');
      }
      const result = await grantRes.json();

      onGranted({
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        consentId: consent.id,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-0 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="m-0 text-lg font-bold text-gray-900 tracking-tight">
                {app.name}
              </h2>
              <p className="m-0 text-xs text-gray-500 mt-0.5">
                is requesting access to your data
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* App description */}
        <div className="px-6 pt-4">
          <p className="m-0 text-sm text-gray-600 leading-relaxed">
            {app.description}
          </p>
        </div>

        <div className="border-t border-gray-100 my-5" />

        {/* Scope checkboxes */}
        <div className="px-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="m-0 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Requested Permissions
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {defaultScopes.map((scope) => {
              const checked = selectedScopes.has(scope);
              return (
                <label
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                    checked ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Custom Checkbox */}
                  <div className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-colors border-2 ${
                    checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                  }`}>
                    {checked && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                  </div>

                  {/* Icon */}
                  <span className={`shrink-0 ${checked ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {SCOPE_ICONS[scope] ?? <TrendingUp size={14} />}
                  </span>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-mono font-medium ${checked ? 'text-indigo-900' : 'text-gray-700'}`}>
                      {scope}
                    </div>
                    <div className={`text-xs mt-0.5 ${checked ? 'text-indigo-600/80' : 'text-gray-500'}`}>
                      {SCOPE_DESCRIPTIONS[scope] ?? 'Access to this data category'}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 my-5" />

        {/* Duration selector */}
        <div className="px-6">
          <label className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Clock size={14} className="-mt-0.5" />
            Access Duration
          </label>
          <select
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
            className="input-field !py-2.5 !text-sm"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2 text-rose-600 text-sm">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 pt-5 flex gap-3">
          <button onClick={handleDeny} className="btn-ghost flex-1 !py-3 bg-gray-50 hover:bg-gray-100">
            <X size={16} />
            Deny Request
          </button>
          <button
            onClick={handleGrant}
            disabled={loading || selectedScopes.size === 0}
            className="btn-primary flex-1 !py-3 shadow-md shadow-indigo-200"
          >
            {loading ? (
              <><span className="spinner w-4 h-4 border-indigo-200 border-t-white" /> Granting...</>
            ) : (
              <><Key size={16} /> Grant Access</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
