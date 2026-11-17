import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Clock, MapPin, Phone, ShieldCheck, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Col 1: Shop Brand & About */}
        <div>
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold text-white">Syed Aboobakar Kedai</span>
          </div>
          <p className="text-slate-400 mb-4 leading-relaxed">
            Your trusted local Malaysian grocery store offering fresh, high-quality groceries with convenient in-store pickup.
          </p>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-400 shrink-0" />
              <span>Daily: 8:00 AM – 8:00 PM (MYT)</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
              <span>Jalan Pasar, Malaysia</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-brand-400 shrink-0" />
              <span>+60 12-345 6789</span>
            </div>
          </div>
        </div>

        {/* Col 2: In-Store Pickup Policy */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center space-x-1.5 text-brand-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Pickup Only Notice</span>
          </h4>
          <p className="text-slate-400 leading-relaxed mb-3">
            We operate exclusively on an <strong>In-Store Pickup</strong> model. We do NOT provide home or hotel delivery.
          </p>
          <ul className="space-y-1 text-slate-300">
            <li className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero delivery fees</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>6 convenient 2-hour daily slots</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pay at the shop or online</span>
            </li>
          </ul>
        </div>

        {/* Col 3: 10 Categories */}
        <div>
          <h4 className="text-sm font-bold text-white mb-3">Browse Categories</h4>
          <ul className="grid grid-cols-2 gap-1.5 text-slate-400">
            <li><Link to="/products?category=Rice%20%26%20Grains" className="hover:text-brand-400 transition">Rice & Grains</Link></li>
            <li><Link to="/products?category=Oil%20%26%20Spices" className="hover:text-brand-400 transition">Oil & Spices</Link></li>
            <li><Link to="/products?category=Vegetables" className="hover:text-brand-400 transition">Vegetables</Link></li>
            <li><Link to="/products?category=Fruits" className="hover:text-brand-400 transition">Fruits</Link></li>
            <li><Link to="/products?category=Meat%20%26%20Fish" className="hover:text-brand-400 transition">Meat & Fish</Link></li>
            <li><Link to="/products?category=Dairy%20%26%20Eggs" className="hover:text-brand-400 transition">Dairy & Eggs</Link></li>
            <li><Link to="/products?category=Snacks" className="hover:text-brand-400 transition">Snacks</Link></li>
            <li><Link to="/products?category=Drinks" className="hover:text-brand-400 transition">Drinks</Link></li>
            <li><Link to="/products?category=Household" className="hover:text-brand-400 transition">Household</Link></li>
            <li><Link to="/products?category=Others" className="hover:text-brand-400 transition">Others</Link></li>
          </ul>
        </div>

        {/* Col 4: Quick Links */}
        <div>
          <h4 className="text-sm font-bold text-white mb-3">Customer Service</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link to="/track" className="hover:text-brand-400 transition">{t('trackOrder')}</Link></li>
            <li><Link to="/cart" className="hover:text-brand-400 transition">{t('shoppingCart')}</Link></li>
            <li><Link to="/profile" className="hover:text-brand-400 transition">{t('profile')}</Link></li>
            <li><Link to="/info" className="hover:text-brand-400 transition">Shop Location & Policy</Link></li>
            <li><Link to="/admin" className="hover:text-brand-400 transition font-semibold text-brand-400">Seller Dashboard Portal</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-slate-800 text-center text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 Syed Aboobakar Kedai (Malaysia). All rights reserved.</p>
        <p>Prices in Malaysian Ringgit (MYR / RM) • In-Store Pickup Model Only</p>
      </div>
    </footer>
  );
}
