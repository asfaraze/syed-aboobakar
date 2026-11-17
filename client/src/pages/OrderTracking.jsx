import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function OrderTracking() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [identifier, setIdentifier] = useState(searchParams.get('code') || '');
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(null);

  // If parameters are in URL, auto-search
  useEffect(() => {
    if (orderNumber && identifier) {
      handleTrack();
    }
  }, []);

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    if (!orderNumber.trim() || !identifier.trim()) {
      setErrorMsg('Please enter both Order Number and Phone Number or Pickup Code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCancelSuccess(null);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          identifier: identifier.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
        setItems(data.items || []);
      } else {
        setErrorMsg(data.error || 'No matching order found.');
        setOrder(null);
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to track order.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!window.confirm(t('confirmCancelOrder'))) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by customer via tracking page' })
      });

      const data = await res.json();
      if (res.ok) {
        setCancelSuccess(data.message);
        setOrder(prev => ({ ...prev, status: 'Cancelled' }));
      } else {
        alert(data.error || 'Failed to cancel order.');
      }
    } catch (err) {
      alert('Network error while cancelling order.');
    } finally {
      setCancelling(false);
    }
  };

  // 5 Status Stages
  const stages = [
    { key: 'Placed', label: t('statusPlaced'), step: 1 },
    { key: 'Confirmed', label: t('statusConfirmed'), step: 2 },
    { key: 'Preparing', label: t('statusPreparing'), step: 3 },
    { key: 'Ready for pickup', label: t('statusReady'), step: 4 },
    { key: 'Collected', label: t('statusCollected'), step: 5 }
  ];

  const currentStageIndex = order ? stages.findIndex(s => s.key === order.status) : -1;
  const canCancel = order && (order.status === 'Placed' || order.status === 'Confirmed');

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Search Order Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('trackYourOrder')}
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Enter your order number along with your phone number or 4-digit pickup code.
        </p>
      </div>

      {/* Tracking Input Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs max-w-2xl mx-auto">
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('orderNumber')}
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. SAK-20261117-XXXX"
                className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('enterPhoneOrCode')}
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 0123456789 or PK-1234"
                className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-brand-600/30 flex items-center justify-center space-x-1.5"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Searching...' : t('trackBtn')}</span>
          </button>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      </div>

      {/* Order Progress Details */}
      {order && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8 animate-fade-in">
          {/* Order Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">
                Pickup Order
              </span>
              <h2 className="text-xl font-black text-slate-900 font-mono">
                {order.order_number}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: {order.customer_name} • Placed on {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Pickup Code Callout */}
            <div className="bg-brand-50 border-2 border-brand-200 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-wider block">
                {t('pickupCode')}
              </span>
              <span className="text-2xl font-black text-brand-900 font-mono">
                {order.pickup_code}
              </span>
            </div>
          </div>

          {/* 5-Stage Visual Progress Tracker */}
          {order.status === 'Cancelled' ? (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center space-y-1 text-rose-900">
              <XCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <h3 className="font-extrabold text-base">This Order Has Been Cancelled</h3>
              <p className="text-xs text-rose-700">Reserved items have been returned to stock.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between relative mb-2">
                {/* Horizontal Progress Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
                <div
                  className="absolute top-1/2 left-0 h-1 bg-brand-600 -translate-y-1/2 z-0 transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStageIndex / (stages.length - 1)) * 100)}%` }}
                ></div>

                {stages.map((stage, idx) => {
                  const isCompleted = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stage.key} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isCompleted
                            ? 'bg-brand-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        } ${isCurrent ? 'ring-4 ring-brand-100 scale-110' : ''}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stage.step}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-bold mt-2 text-center max-w-[70px] leading-tight ${
                        isCurrent ? 'text-brand-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pickup Details Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">{t('pickupDate')}</span>
              <span className="font-bold text-slate-900 block mt-0.5">{order.pickup_date}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">{t('pickupSlot')}</span>
              <span className="font-bold text-brand-600 block mt-0.5">{order.pickup_slot}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Pickup Point</span>
              <span className="font-bold text-slate-900 block mt-0.5">Syed Aboobakar Kedai (8AM – 8PM)</span>
            </div>
          </div>

          {/* Itemized Order List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Reserved Groceries
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{item.product_name}</span>
                    <span className="text-slate-500 ml-1.5">({item.unit}) × {item.quantity}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    RM {((item.total_price_sen || 0) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total & Cancel Action */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block">Total Due at Counter</span>
              <span className="text-2xl font-black text-brand-600">
                {order.formatted?.total || `RM ${((order.total_sen || 0) / 100).toFixed(2)}`}
              </span>
            </div>

            {canCancel && (
              <div className="space-y-1 text-right">
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-4 py-2 border border-rose-300 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition"
                >
                  {cancelling ? 'Cancelling...' : t('cancelOrder')}
                </button>
                <p className="text-[10px] text-slate-400">
                  {t('cannotCancelNotice')}
                </p>
              </div>
            )}
          </div>

          {cancelSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-center">
              {cancelSuccess}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
