import React from 'react';
import {
  Building,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ShopInfo() {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block">
          Official Store Policy
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Syed Aboobakar Kedai
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Serving Malaysian families with fresh, affordable, high quality daily grocery essentials.
        </p>
      </div>

      {/* Critical In-Store Pickup Model Notice */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-4 text-amber-950">
        <div className="flex items-center space-x-2 text-amber-900">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <h2 className="text-lg font-black tracking-tight">
            CRITICAL SHOPPING POLICY: IN-STORE PICKUP ONLY
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
          Syed Aboobakar Kedai operates strictly as an <strong>online ordering with in-store pickup</strong> grocery shop.
          We provide <strong>NO delivery services</strong>. There are no delivery drivers, no delivery addresses, and no hotel accounts.
          All customers collect their pre-packed grocery orders directly at our counter during their reserved 2-hour slot.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-bold text-amber-900">
          <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero Delivery Fees</span>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero In-Store Waiting Time</span>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pay In Cash, QR or Card</span>
          </div>
        </div>
      </div>

      {/* Business Hours & Daily 6 Slots */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center space-x-2 text-slate-900">
          <Clock className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-black">Operating Hours & 6 Daily Pickup Slots</h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Our store is open 7 days a week from <strong>8:00 AM to 8:00 PM Malaysia Time (Asia/Kuala_Lumpur)</strong>.
          Every morning fresh vegetables, dairy, poultry and fruits are delivered from Cameron Highlands and local suppliers.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { slot: '08:00 – 10:00', desc: 'Morning fresh arrival slot' },
            { slot: '10:00 – 12:00', desc: 'Pre-lunch pickup slot' },
            { slot: '12:00 – 14:00', desc: 'Afternoon collection slot' },
            { slot: '14:00 – 16:00', desc: 'Midday pickup slot' },
            { slot: '16:00 – 18:00', desc: 'After-work grocery slot' },
            { slot: '18:00 – 20:00', desc: 'Evening final collection slot' },
          ].map(s => (
            <div key={s.slot} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs font-black text-brand-700 block">{s.slot}</span>
              <span className="text-[11px] text-slate-500 font-medium block">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location & Map Placeholder */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-slate-900">
          <MapPin className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-black">Shop Location & Contact</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600">
          <div className="space-y-2">
            <p className="font-bold text-slate-800 text-sm">Syed Aboobakar Kedai</p>
            <p>Jalan Pasar, Malaysia</p>
            <p className="flex items-center space-x-1.5 pt-2">
              <Phone className="w-4 h-4 text-brand-600" />
              <span>Contact: +60 12-345 6789</span>
            </p>
            <p className="text-[11px] text-slate-400">
              Convenient parking available directly in front of the shop for quick order pickups.
            </p>
          </div>

          <div className="bg-slate-100 rounded-2xl h-44 flex flex-col items-center justify-center border border-slate-200 text-slate-400 p-4 text-center">
            <MapPin className="w-8 h-8 text-brand-500 mb-2" />
            <span className="font-bold text-xs text-slate-700">Map & Navigation Placeholder</span>
            <span className="text-[10px] text-slate-500 mt-1">Jalan Pasar, Malaysia • GPS: 3.1412° N, 101.6865° E</span>
          </div>
        </div>
      </div>
    </div>
  );
}
