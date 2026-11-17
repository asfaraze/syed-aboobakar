import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminOverview() {
  const { isOwner, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/admin/overview', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [token]);

  const handleQuickStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/admin/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOverview();
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading || !data) {
    return <div className="text-xs font-bold text-slate-500 py-10">Loading dashboard overview...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily operations and pickup schedules for Syed Aboobakar Kedai
          </p>
        </div>
        <button
          onClick={fetchOverview}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Today's Orders */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Orders</span>
            <Package className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{data.todayOrders}</div>
          <p className="text-[10px] text-slate-500 font-medium">Scheduled for today</p>
        </div>

        {/* Today's Sales (OWNER ONLY) */}
        {isOwner ? (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Today's Sales</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-600">
              {data.financials?.today_sales_rm || 'RM 0.00'}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Net expected revenue</p>
          </div>
        ) : (
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1 opacity-70">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Sales Revenue</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-400">Restricted</div>
            <p className="text-[10px] text-slate-400">Owner role required</p>
          </div>
        )}

        {/* Pending Orders */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Orders</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">{data.pendingOrders}</div>
          <p className="text-[10px] text-slate-500 font-medium">Placed, Confirmed, Preparing</p>
        </div>

        {/* Ready For Pickup */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ready for Pickup</span>
            <CheckCircle className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-3xl font-black text-brand-600">{data.readyOrders}</div>
          <p className="text-[10px] text-slate-500 font-medium">Awaiting customer collection</p>
        </div>

        {/* Total Products */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Catalog Items</span>
            <ShoppingBag className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{data.totalProducts}</div>
          <p className="text-[10px] text-slate-500 font-medium">Across all 10 categories</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-600">{data.lowStockCount}</div>
          <p className="text-[10px] text-slate-500 font-medium">At or below threshold</p>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base text-slate-900">Recent Customer Orders</h3>
          <Link to="/admin/orders" className="text-xs font-bold text-brand-600 hover:underline flex items-center space-x-1">
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-y border-slate-100">
              <tr>
                <th className="py-3 px-3">Order Number</th>
                <th className="py-3 px-3">Pickup Code</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Slot</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.order_number}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md">
                        {o.pickup_code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{o.customer_name}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {o.pickup_date} <br />
                      <span className="text-[10px] text-slate-400">{o.pickup_slot}</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      RM {((o.total_sen || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        o.status === 'Collected' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' :
                        o.status === 'Ready for pickup' ? 'bg-brand-100 text-brand-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {o.status === 'Placed' && (
                        <button
                          onClick={() => handleQuickStatus(o.id, 'Confirmed')}
                          className="px-2 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 font-bold rounded-lg transition text-[10px]"
                        >
                          Confirm
                        </button>
                      )}
                      {o.status === 'Confirmed' && (
                        <button
                          onClick={() => handleQuickStatus(o.id, 'Preparing')}
                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-lg transition text-[10px]"
                        >
                          Prepare
                        </button>
                      )}
                      {o.status === 'Preparing' && (
                        <button
                          onClick={() => handleQuickStatus(o.id, 'Ready for pickup')}
                          className="px-2 py-1 bg-brand-600 text-white hover:bg-brand-700 font-bold rounded-lg transition text-[10px]"
                        >
                          Ready
                        </button>
                      )}
                      {o.status === 'Ready for pickup' && (
                        <button
                          onClick={() => handleQuickStatus(o.id, 'Collected')}
                          className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-lg transition text-[10px]"
                        >
                          Collect
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
