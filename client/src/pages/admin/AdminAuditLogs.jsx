import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminAuditLogs() {
  const { isOwner, token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setIntegrity(data.integrity || null);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) fetchLogs();
  }, [isOwner, token]);

  if (!isOwner) {
    return (
      <div className="p-12 text-center text-xs font-bold text-slate-500 bg-white rounded-3xl border border-slate-200">
        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        Audit logs can only be inspected by the Store Owner.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Integrity Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Cryptographic Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident append-only log with SHA-256 hash chaining verification
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Verify & Refresh</span>
        </button>
      </div>

      {/* Integrity Verification Card */}
      {integrity && (
        <div className={`p-4 rounded-3xl border flex items-center justify-between text-xs font-bold ${
          integrity.isValid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center space-x-2">
            {integrity.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <p className="font-extrabold">
                {integrity.isValid
                  ? 'Cryptographic Hash Chain: VERIFIED INTACT'
                  : 'INTEGRITY ALERT: Tampering Detected in Audit Log!'}
              </p>
              <p className="text-[11px] font-normal text-slate-600 mt-0.5">
                {integrity.isValid
                  ? `All ${integrity.count} audit records sequentially match their SHA-256 genesis signatures.`
                  : `Chain link broken at record #${integrity.corruptedId} (${integrity.reason}).`}
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-mono bg-white px-2.5 py-1 rounded-xl shadow-2xs">
            {integrity.count} Records
          </span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-3">Actor</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Details</th>
                  <th className="py-3 px-4">Hash Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{log.created_at}</td>
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">
                      {log.user_name} <span className="text-[10px] text-slate-400 font-normal">({log.role})</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                        log.action.includes('REVEAL') ? 'bg-amber-100 text-amber-900' :
                        log.action.includes('FAIL') ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[10px] truncate max-w-[120px]" title={log.record_hash}>
                      {log.record_hash?.substring(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
