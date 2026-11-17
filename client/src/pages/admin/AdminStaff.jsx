import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  CheckCircle,
  XCircle,
  X,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminStaff() {
  const { isOwner, token } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) fetchStaff();
  }, [isOwner, token]);

  if (!isOwner) {
    return (
      <div className="p-12 text-center text-xs font-bold text-slate-500 bg-white rounded-3xl border border-slate-200">
        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        Staff account administration is strictly restricted to the Store Owner.
      </div>
    );
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, email, phone, password })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        fetchStaff();
      } else {
        setErrorMsg(data.error || 'Failed to create staff');
      }
    } catch (err) {
      setErrorMsg('Network error');
    }
  };

  const handleToggleStatus = async (staffId) => {
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/toggle`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) fetchStaff();
    } catch (err) {}
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setShowResetModal(false);
        setSelectedStaff(null);
        setNewPassword('');
        alert('Staff password has been reset successfully.');
      } else {
        setErrorMsg(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setErrorMsg('Network error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Staff Account Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and maintain staff accounts with role-based restrictions
          </p>
        </div>

        <button
          onClick={() => { setErrorMsg(null); setShowCreateModal(true); }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Staff Account</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading staff accounts...</div>
        ) : staffList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No staff accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Email Address</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">2FA Status</th>
                  <th className="py-3 px-3">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{s.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        s.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'
                      }`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600">
                      {s.totp_enabled ? (
                        <span className="text-emerald-600 flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Enabled</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Not set up</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {s.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {s.role !== 'owner' && (
                        <>
                          <button
                            onClick={() => { setSelectedStaff(s); setNewPassword(''); setErrorMsg(null); setShowResetModal(true); }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleToggleStatus(s.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                              s.is_active ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {s.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Create Staff Account</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ahmad Razak"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@syedaboobakarkedai.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+6019-8765432"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Temporary Password (min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowResetModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Reset Password: {selectedStaff.name}</h3>
              <button onClick={() => setShowResetModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Password (min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
