import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  RefreshCw,
  Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/orders/admin/all?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
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
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const toggleExpand = async (orderId) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!expandedItems[orderId]) {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setExpandedItems(prev => ({ ...prev, [orderId]: data.items || [] }));
        }
      } catch (err) {}
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Order Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, verify, prepare, and complete customer grocery pickup orders
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl text-slate-800 outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="Placed">Placed</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Preparing">Preparing</option>
          <option value="Ready for pickup">Ready for pickup</option>
          <option value="Collected">Collected</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl text-slate-800 outline-none"
        />

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone, pickup code..."
            className="flex-1 bg-slate-50 border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No orders match your filter criteria.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {orders.map((o) => {
              const isExpanded = expandedId === o.id;
              const items = expandedItems[o.id] || [];

              return (
                <div key={o.id} className="p-4 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{o.order_number}</span>
                        <span className="bg-brand-50 text-brand-700 font-mono font-black px-2 py-0.5 rounded-md text-xs border border-brand-200">
                          {o.pickup_code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          o.status === 'Collected' ? 'bg-emerald-100 text-emerald-800' :
                          o.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' :
                          o.status === 'Ready for pickup' ? 'bg-brand-100 text-brand-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {o.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          o.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {o.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        Customer: <strong className="text-slate-900">{o.customer_name}</strong> ({o.customer_phone}) • Pickup: <strong className="text-slate-900">{o.pickup_date}</strong> ({o.pickup_slot})
                      </p>
                    </div>

                    {/* Status Update Actions */}
                    <div className="flex items-center space-x-2">
                      <select
                        value={o.status}
                        disabled={o.status === 'Cancelled' || o.status === 'Collected'}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        className="bg-white border border-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none disabled:opacity-50"
                      >
                        <option value="Placed">Placed</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Preparing">Preparing</option>
                        <option value="Ready for pickup">Ready for pickup</option>
                        <option value="Collected">Collected</option>
                        <option value="Cancelled">Cancel Order</option>
                      </select>

                      <button
                        onClick={() => toggleExpand(o.id)}
                        className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Item Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/70 p-4 rounded-2xl">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Itemized Grocery Order
                      </h4>
                      <div className="divide-y divide-slate-200/60 border border-slate-200/60 rounded-xl overflow-hidden bg-white">
                        {items.length === 0 ? (
                          <div className="p-3 text-slate-400">Loading item snapshot...</div>
                        ) : (
                          items.map((it, i) => (
                            <div key={i} className="p-2.5 px-3 flex justify-between">
                              <div>
                                <span className="font-bold text-slate-800">{it.product_name}</span>
                                <span className="text-slate-500 ml-1.5">({it.unit}) × {it.quantity}</span>
                              </div>
                              <span className="font-bold text-slate-900">
                                RM {((it.total_price_sen || 0) / 100).toFixed(2)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex justify-between items-baseline pt-2 text-xs font-bold">
                        <span className="text-slate-500">Payment: {o.payment_method === 'shop' ? 'Pay at the Shop (Cash/QR/Card)' : o.payment_method}</span>
                        <span className="text-base font-black text-brand-600">
                          Total: RM {((o.total_sen || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
