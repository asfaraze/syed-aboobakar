import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Lock,
  ShieldCheck,
  CreditCard,
  User,
  Phone,
  Mail,
  FileText,
  Building
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Checkout() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { cartItems, calculation, clearCart } = useCart();
  const navigate = useNavigate();

  // Form states
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('shop'); // 'shop' default

  // Pickup slots states
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync user details if logged in
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
      if (!customerEmail && user.email) setCustomerEmail(user.email);
    }
  }, [user]);

  // Fetch 8-day valid dates window
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await fetch('/api/pickup/dates');
        if (res.ok) {
          const data = await res.json();
          setAvailableDates(data.dates || []);
          if (data.dates?.length > 0) {
            setSelectedDate(data.dates[0].date); // Default to today
          }
        }
      } catch (err) {
        console.error('Failed to load dates:', err);
      }
    };
    fetchDates();
  }, []);

  // Fetch slots whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const res = await fetch(`/api/pickup/slots/${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(data.slots || []);
          // Auto-select first available future slot
          const firstAvailable = data.slots?.find(s => s.isAvailable);
          if (firstAvailable) {
            setSelectedSlot(firstAvailable.slot);
          }
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate]);

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (!selectedDate || !selectedSlot) {
      setErrorMsg('Please choose an available pickup date and 2-hour pickup slot.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
        pickup_date: selectedDate,
        pickup_slot: selectedSlot,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        coupon_code: calculation.coupon ? calculation.coupon.code : null,
        payment_method: paymentMethod,
        notes: notes.trim() || null
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to place order.');
        setSubmitting(false);
        return;
      }

      // Order created successfully!
      clearCart();
      navigate(`/order-confirmation/${data.order.orderId}`, {
        state: { order: data.order }
      });
    } catch (err) {
      setErrorMsg('Network error. Please try placing your order again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title & Pickup Only Warning Banner */}
      <div className="space-y-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('checkoutTitle')}
        </h1>

        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-950">
          <Building className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-extrabold text-amber-900 uppercase tracking-wide">
              {t('pickupNoticeHead')}
            </h4>
            <p className="mt-0.5 text-amber-800 leading-relaxed font-medium">
              {t('pickupNoticeBody')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Pickup Scheduling & Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Customer Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
              <User className="w-4 h-4 text-brand-600" />
              <span>{t('customerDetails')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t('fullName')} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Nurul Huda binti Ali"
                    className="w-full text-xs font-medium pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t('phoneNumber')} *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +6012-3456789"
                    className="w-full text-xs font-medium pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t('emailAddress')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. customer@gmail.com"
                    className="w-full text-xs font-medium pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {t('notes')}
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special packing instructions or pickup requests..."
                  className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Step 2: Date & Slot Selection */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>{t('selectPickupDate')}</span>
            </h3>

            {/* 8-Day Date Selector Carousel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {availableDates.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    selectedDate === d.date
                      ? 'border-brand-600 bg-brand-50/70 text-brand-900 ring-2 ring-brand-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-extrabold uppercase tracking-wide block text-brand-600">
                    {d.label}
                  </span>
                  <span className="text-xs font-bold block text-slate-900 mt-0.5">
                    {d.date}
                  </span>
                </button>
              ))}
            </div>

            {/* 6 2-Hour Pickup Slots */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  <span>{t('selectPickupSlot')} (8:00 AM – 8:00 PM)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Asia/Kuala_Lumpur (MYT)
                </span>
              </label>

              {loadingSlots ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {availableSlots.map((s) => {
                    const isSelected = selectedSlot === s.slot;
                    return (
                      <button
                        key={s.slot}
                        type="button"
                        disabled={!s.isAvailable}
                        onClick={() => setSelectedSlot(s.slot)}
                        className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                          !s.isAvailable
                            ? 'bg-slate-50 border-slate-200 opacity-45 cursor-not-allowed text-slate-400'
                            : isSelected
                            ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/20 ring-2 ring-brand-600/30'
                            : 'border-slate-200 hover:border-brand-300 bg-white text-slate-800'
                        }`}
                      >
                        <span className={`text-xs font-extrabold block ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {s.slot}
                        </span>

                        <span className={`text-[10px] mt-1 font-medium ${isSelected ? 'text-brand-100' : 'text-slate-500'}`}>
                          {!s.isFuture
                            ? 'Slot passed'
                            : s.availableCapacity <= 0
                            ? 'Fully booked'
                            : `${s.availableCapacity} spots left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Payment Method */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-brand-600" />
              <span>{t('paymentMethod')}</span>
            </h3>

            <div className="space-y-3">
              {/* Pay at Shop (DEFAULT & ACTIVE) */}
              <label
                className={`flex items-start space-x-3 p-4 rounded-2xl border cursor-pointer transition ${
                  paymentMethod === 'shop'
                    ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-600/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="shop"
                  checked={paymentMethod === 'shop'}
                  onChange={() => setPaymentMethod('shop')}
                  className="mt-1 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {t('payAtShop')}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Pay securely at Syed Aboobakar Kedai counter with Cash, DuitNow QR or Card when collecting your groceries.
                  </span>
                </div>
              </label>

              {/* Online Billplz FPX (DISABLED BY DEFAULT) */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 opacity-60 flex items-start space-x-3 cursor-not-allowed">
                <input
                  type="radio"
                  name="payment_method"
                  value="billplz"
                  disabled
                  className="mt-1 text-slate-400"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700">
                      Billplz Online FPX Payment
                    </span>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.2 rounded">
                      Disabled: API Key Required
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Online FPX Malaysian bank transfers are disabled until the shop owner configures official Billplz API credentials.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Order Summary & Confirmation Button */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5 sticky top-24">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-100">
              Pickup Order Summary
            </h3>

            {/* Selected Slot Recap */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  <span>Pickup Date:</span>
                </span>
                <span>{selectedDate || 'Not selected'}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  <span>Pickup Slot:</span>
                </span>
                <span>{selectedSlot || 'Not selected'}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>Shop Location:</span>
                </span>
                <span className="text-right">Jalan Pasar, Malaysia</span>
              </div>
            </div>

            {/* Cart Items Recap */}
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
              {cartItems.map((item) => (
                <div key={item.productId} className="py-2 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-800">{item.quantity}x </span>
                    <span className="text-slate-700">{item.product?.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    RM {(((item.product?.price_sen || 0) * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>{t('subtotal')}</span>
                <span className="font-bold text-slate-800">{calculation.formatted.subtotal}</span>
              </div>
              {calculation.discount_sen > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>{t('discount')} ({calculation.coupon?.code})</span>
                  <span>-{calculation.formatted.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Pickup Fee</span>
                <span className="font-bold text-emerald-600">RM 0.00 (FREE)</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-base font-black text-slate-900">{t('total')}</span>
                <span className="text-2xl font-black text-brand-600">
                  {calculation.formatted.total}
                </span>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? t('processingOrder') : t('placeOrder')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
