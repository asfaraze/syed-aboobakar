import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  X,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminCoupons() {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(10);
  const [minSpendRM, setMinSpendRM] = useState(30);
  const [maxDiscountRM, setMaxDiscountRM] = useState('');
  const [usageLimit, setUsageLimit] = useState(100);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [token]);

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`/api/coupons/${id}/toggle`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) fetchCoupons();
    } catch (err) {}
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const min_spend_sen = Math.round(parseFloat(minSpendRM) * 100) || 0;
      const max_discount_sen = maxDiscountRM ? Math.round(parseFloat(maxDiscountRM) * 100) : null;
      const discVal = discountType === 'fixed' ? Math.round(parseFloat(discountValue) * 100) : parseInt(discountValue, 10);

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: discVal,
          min_spend_sen,
          max_discount_sen,
          usage_limit: parseInt(usageLimit, 10) || 100
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setCode('');
        fetchCoupons();
      } else {
        setErrorMsg(data.error || 'Failed to create coupon');
      }
    } catch (err) {
      setErrorMsg('Network error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Promotional Coupons
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and manage percentage and fixed discount vouchers with server-side validation
          </p>
        </div>

        <button
          onClick={() => { setErrorMsg(null); setShowAddModal(true); }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Coupon</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No coupons created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Discount</th>
                  <th className="py-3 px-3">Min Spend</th>
                  <th className="py-3 px-3 text-center">Redemptions</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-black text-brand-700 text-sm">{c.code}</td>
                    <td className="py-3 px-3 capitalize font-medium text-slate-600">{c.discount_type}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : `RM ${(c.discount_value / 100).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      RM {((c.min_spend_sen || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {c.times_used} / {c.usage_limit || '∞'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(c.id)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition ${
                          c.is_active
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {c.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Create New Coupon</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. JIMAT15"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed RM</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Spend (RM)</label>
                  <input
                    type="number"
                    value={minSpendRM}
                    onChange={(e) => setMinSpendRM(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
