import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  ArrowUpDown,
  History,
  Plus,
  Minus,
  CheckCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminInventory() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'movements'

  // Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stock replenishment');
  const [adjustError, setAdjustError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, movRes] = await Promise.all([
        fetch('/api/products?limit=100'),
        fetch('/api/admin/inventory-movements', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
      if (movRes.ok) {
        const movData = await movRes.json();
        setMovements(movData.movements || []);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError(null);
    try {
      const qtyNum = parseInt(adjustQty, 10);
      if (isNaN(qtyNum) || qtyNum === 0) {
        setAdjustError('Please enter a valid non-zero adjustment quantity (+ or -).');
        return;
      }

      const res = await fetch(`/api/products/${selectedProduct.id}/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          adjustment: qtyNum,
          reason: adjustReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedProduct(null);
        setAdjustQty('');
        fetchData();
      } else {
        setAdjustError(data.error || 'Failed to adjust stock');
      }
    } catch (err) {
      setAdjustError('Network error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor physical shelf stock, manage restocks, and review inventory audit trails
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'stock' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Current Stock Levels ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'movements' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Trail</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'stock' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Current Stock</th>
                  <th className="py-3 px-3">Low Threshold</th>
                  <th className="py-3 px-3">Stock Health</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isOutOfStock = p.stock_quantity <= 0;
                  const isLow = !isOutOfStock && p.stock_quantity <= p.low_stock_threshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-3 text-slate-500 font-medium">{p.category}</td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">
                        {p.stock_quantity} <span className="text-xs font-medium text-slate-400">({p.unit})</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.low_stock_threshold}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          isOutOfStock ? 'bg-rose-100 text-rose-800' :
                          isLow ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isOutOfStock ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => { setSelectedProduct(p); setAdjustQty(''); setAdjustError(null); }}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl transition text-[11px]"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Movements Log */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Quantity Change</th>
                  <th className="py-3 px-3">New Balance</th>
                  <th className="py-3 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{m.created_at}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{m.product_name}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={m.change_qty > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {m.change_qty > 0 ? `+${m.change_qty}` : m.change_qty}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{m.balance_qty}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">{m.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setSelectedProduct(null)}></div>
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Adjust Shelf Stock</h3>
              <button onClick={() => setSelectedProduct(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-900">{selectedProduct.name}</p>
              <p className="text-slate-500">
                Current Stock: <strong className="text-slate-800">{selectedProduct.stock_quantity} {selectedProduct.unit}</strong>
              </p>
            </div>

            {adjustError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Quantity Adjustment (positive to add, negative to deduct)
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 10 or -5"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Audit Log</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
