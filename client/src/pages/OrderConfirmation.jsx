import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  Package,
  ArrowRight,
  ShieldCheck,
  Printer
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const { t } = useLanguage();

  const [order, setOrder] = useState(location.state?.order || null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    // Fire confetti on load
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    // Fetch full order details
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          setItems(data.items || []);
        }
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-xs font-bold text-slate-500">
        Loading order confirmation...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Success Hero Callout */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('orderConfirmed')}
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Thank you for shopping with Syed Aboobakar Kedai! Your groceries are reserved and will be ready for pickup during your chosen slot.
        </p>

        {/* Unique Pickup Code Highlight Box */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6 rounded-2xl shadow-lg max-w-md mx-auto space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-200 block">
            {t('pickupCode')}
          </span>
          <div className="text-4xl sm:text-5xl font-black tracking-widest text-amber-300 font-mono">
            {order.pickup_code || order.pickupCode}
          </div>
          <p className="text-xs text-brand-100 font-medium">
            {t('showCodeNotice')}
          </p>
        </div>

        {/* Order Number */}
        <div className="text-xs text-slate-500 font-bold">
          {t('orderNumber')}: <span className="text-slate-900 font-mono">{order.order_number || order.orderNumber}</span>
        </div>
      </div>

      {/* Pickup Schedule & Store Location Info */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-brand-600" />
            <span>Pickup Schedule</span>
          </h3>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <p className="text-slate-500 font-medium">{t('pickupDate')}:</p>
            <p className="font-bold text-slate-900 text-sm">{order.pickup_date || order.pickupDate}</p>
            <p className="text-slate-500 font-medium pt-1">{t('pickupSlot')}:</p>
            <p className="font-bold text-brand-600 text-sm">{order.pickup_slot || order.pickupSlot}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>Store Collection Point</span>
          </h3>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <p className="font-bold text-slate-900 text-sm">Syed Aboobakar Kedai</p>
            <p className="text-slate-600 font-medium">Jalan Pasar, Malaysia</p>
            <p className="text-slate-500 pt-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Daily Hours: 8:00 AM – 8:00 PM (MYT)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons: Track Order, Print */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to={`/track?orderNumber=${order.order_number || order.orderNumber}&code=${order.pickup_code || order.pickupCode}`}
          className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
        >
          <Package className="w-4 h-4" />
          <span>{t('trackOrder')}</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>Print Pickup Slip</span>
        </button>

        <Link
          to="/products"
          className="w-full sm:w-auto px-6 py-3 text-slate-600 hover:text-brand-600 font-bold text-xs transition text-center"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
