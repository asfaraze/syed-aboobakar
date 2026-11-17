import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  ShieldCheck,
  Award,
  Lock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminCustomers() {
  const { isOwner, token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealedContacts, setRevealedContacts] = useState({});
  const [revealingId, setRevealingId] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const handleRevealContact = async (customerId, customerName) => {
    if (!isOwner) {
      alert('Permission Denied: Staff members are strictly prohibited from revealing customer contact details.');
      return;
    }

    if (!window.confirm(`Audit Log Notice: Revealing private contact information for "${customerName}" will be cryptographically recorded in the immutable audit log. Proceed?`)) {
      return;
    }

    setRevealingId(customerId);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/reveal`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedContacts(prev => ({
          ...prev,
          [customerId]: { email: data.email, phone: data.phone }
        }));
      } else {
        alert(data.error || 'Failed to reveal details');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setRevealingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Customer Directory & Spending Rankings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Privacy-compliant customer list with role-based masking and audit logging
          </p>
        </div>

        <button
          onClick={fetchCustomers}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Security Privacy Policy Banner */}
      <div className="bg-brand-50 border border-brand-200 p-4 rounded-3xl text-xs text-brand-900 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-extrabold text-brand-950">Customer Contact Privacy Policy</p>
          <p className="text-brand-800 text-[11px] leading-relaxed">
            Staff members see masked email addresses and phone numbers. Only the Store Owner can decrypt and reveal private contact information. Every reveal action is signed and permanently recorded in the tamper-evident audit log.
          </p>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No registered customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-3">Customer Name</th>
                  <th className="py-3 px-3">Email Address</th>
                  <th className="py-3 px-3">Phone Number</th>
                  <th className="py-3 px-3 text-center">Orders</th>
                  {isOwner && <th className="py-3 px-3">Total Spend</th>}
                  <th className="py-3 px-4 text-right">Privacy Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const isRevealed = revealedContacts[c.id];
                  const emailDisplay = isRevealed ? isRevealed.email : c.email;
                  const phoneDisplay = isRevealed ? isRevealed.phone : c.phone;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <span className="flex items-center space-x-1 font-black text-slate-700">
                          {c.rank <= 3 && <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span>#{c.rank}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {emailDisplay}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {phoneDisplay}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {c.total_orders}
                      </td>
                      {isOwner && (
                        <td className="py-3 px-3 font-black text-emerald-600 font-mono">
                          {c.total_spend_rm || 'RM 0.00'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        {isOwner ? (
                          isRevealed ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Revealed & Logged
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRevealContact(c.id, c.name)}
                              disabled={revealingId === c.id}
                              className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold rounded-xl transition flex items-center space-x-1 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{revealingId === c.id ? 'Logging...' : 'Show'}</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-1 justify-end">
                            <Lock className="w-3 h-3" />
                            <span>Masked (Staff)</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
