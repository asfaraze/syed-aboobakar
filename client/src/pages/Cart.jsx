import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Tag,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { t, getLocalizedName } = useLanguage();
  const {
    cartItems,
    calculation,
    calculating,
    calcError,
    couponCode,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon
  } = useCart();

  const [inputCode, setInputCode] = useState('');
  const navigate = useNavigate();

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (inputCode.trim()) {
      applyCoupon(inputCode);
      setInputCode('');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">{t('cartEmpty')}</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Explore our wide selection of fresh Malaysian groceries, spices, rice and snacks.
        </p>
        <div className="pt-2">
          <Link
            to="/products"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            <span>{t('startShopping')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-6">
        {t('shoppingCart')} ({cartItems.length} {t('itemsInCart')})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Cart Items Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs divide-y divide-slate-100">
          {cartItems.map((item) => {
            const prod = item.product || {};
            const itemPriceRM = ((prod.price_sen || 0) / 100).toFixed(2);
            const itemTotalRM = (((prod.price_sen || 0) * item.quantity) / 100).toFixed(2);

            return (
              <div key={item.productId} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                {/* Product Image */}
                <Link to={`/product/${item.productId}`} className="w-20 h-20 bg-slate-50 rounded-2xl p-2 shrink-0 border border-slate-100 flex items-center justify-center">
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-full h-full object-contain"
                  />
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {prod.category}
                  </span>
                  <Link to={`/product/${item.productId}`} className="text-sm font-bold text-slate-900 hover:text-brand-600 truncate block">
                    {getLocalizedName(prod)}
                  </Link>
                  <p className="text-xs text-slate-500 font-medium">{prod.unit}</p>
                  <p className="text-xs font-bold text-brand-600 mt-0.5">
                    RM {itemPriceRM} each
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-black text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= (prod.stock_quantity || 999)}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition font-bold disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right min-w-[70px]">
                  <span className="text-sm font-black text-slate-900 block">
                    RM {itemTotalRM}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition mt-0.5"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Order Summary & Coupon */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <h3 className="font-black text-base text-slate-900 pb-3 border-b border-slate-100">
              Order Summary
            </h3>

            {/* Coupon Code Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-brand-600" />
                <span>{t('couponCode')}</span>
              </label>

              {couponCode ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800">
                  <span>Coupon applied: {couponCode}</span>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    {t('removeCoupon')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="e.g. WELCOME10, KEDAI5"
                    className="flex-1 uppercase text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                  >
                    {t('applyCoupon')}
                  </button>
                </form>
              )}

              {calcError && (
                <div className="mt-2 text-[11px] font-semibold text-rose-600 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{calcError}</span>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>{t('subtotal')}</span>
                <span className="font-bold text-slate-800">{calculation.formatted.subtotal}</span>
              </div>

              {calculation.discount_sen > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>{t('discount')}</span>
                  <span>-{calculation.formatted.discount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>Pickup / Handling Fee</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-base font-black text-slate-900">{t('total')}</span>
                <span className="text-2xl font-black text-brand-600">
                  {calculating ? 'Calculating...' : calculation.formatted.total}
                </span>
              </div>
            </div>

            {/* In-Store Pickup Reminder Notice */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] font-medium text-amber-900 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">In-Store Pickup ONLY</p>
                <p className="text-amber-800 mt-0.5">
                  Collection at Syed Aboobakar Kedai, Jalan Pasar, Malaysia (8:00 AM – 8:00 PM).
                </p>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={() => navigate('/checkout')}
              disabled={calculating || !!calcError}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white rounded-2xl font-black text-xs shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{t('proceedToCheckout')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
