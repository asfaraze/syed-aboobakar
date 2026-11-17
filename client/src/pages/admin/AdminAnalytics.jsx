import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Award,
  RefreshCw,
  Calendar,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminAnalytics() {
  const { isOwner, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchAnalytics();
    }
  }, [isOwner, token]);

  if (!isOwner) {
    return (
      <div className="p-12 text-center text-xs font-bold text-slate-500 bg-white rounded-3xl border border-slate-200">
        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        Financial analytics are restricted to the Store Owner only.
      </div>
    );
  }

  if (loading || !data) {
    return <div className="text-xs font-bold text-slate-400 py-10">Calculating financial analytics...</div>;
  }

  const { totals = {}, dailySales = [], topProducts = [] } = data;

  // Find max daily sales for bar scaling
  const maxDayNet = Math.max(1, ...dailySales.map(d => d.net_sales_sen || 0));

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Financial & Sales Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real database audit distinguishing gross sales, applied discounts, and collected payments
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Sales</span>
          <div className="text-2xl font-black text-slate-900">{totals.gross_sales_rm || 'RM 0.00'}</div>
          <p className="text-[10px] text-slate-500">Before promotions</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Total Discounts</span>
          <div className="text-2xl font-black text-rose-600">-{totals.total_discounts_rm || 'RM 0.00'}</div>
          <p className="text-[10px] text-slate-500">Coupons & deals</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Net Order Value</span>
          <div className="text-2xl font-black text-brand-600">{totals.net_sales_rm || 'RM 0.00'}</div>
          <p className="text-[10px] text-slate-500">{totals.total_orders || 0} valid orders</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Collected at Counter</span>
          <div className="text-2xl font-black text-emerald-600">{totals.collected_payments_rm || 'RM 0.00'}</div>
          <p className="text-[10px] text-slate-500">{totals.collected_orders || 0} completed orders</p>
        </div>
      </div>

      {/* Daily Sales Chart */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-brand-600" />
          <span>Daily Pickup Revenue (Past 14 Days)</span>
        </h3>

        {dailySales.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">No daily order records yet.</div>
        ) : (
          <div className="pt-6 pb-2">
            <div className="flex items-end space-x-2 sm:space-x-3 h-48 border-b border-slate-200 pb-2">
              {dailySales.map((d, i) => {
                const heightPercent = Math.max(8, Math.round(((d.net_sales_sen || 0) / maxDayNet) * 100));

                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    {/* Hover tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-md">
                      {d.date}: {d.formatted?.net} ({d.orders_count} orders)
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[36px] bg-brand-500 group-hover:bg-brand-600 rounded-t-xl transition-all"
                    ></div>
                    <span className="text-[9px] text-slate-500 font-bold mt-2 truncate w-full text-center">
                      {d.date?.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Selling Products */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Best-Selling Grocery Products</span>
        </h3>

        {topProducts.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No sales history recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-center">Quantity Sold</th>
                  <th className="py-3 px-4 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-black text-slate-700">#{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{p.product_name}</td>
                    <td className="py-3 px-3 text-slate-500">{p.unit}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                      {p.total_quantity_sold}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-brand-600 font-mono">
                      {p.revenue_rm}
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
