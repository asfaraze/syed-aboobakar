import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ShoppingCart,
  Bell,
  Search,
  User,
  LogOut,
  Clock,
  MapPin,
  ChevronDown,
  ShieldCheck,
  CheckCircle,
  Package
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

export default function Navbar() {
  const { lang, setLang, t, getLocalizedName } = useLanguage();
  const { user, isStaff, isOwner, logout } = useAuth();
  const { totalItemCount } = useCart();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (err) {}
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Banner: In-Store Pickup ONLY Notice & Hours */}
      <div className="bg-brand-900 text-white text-xs py-1.5 px-4 font-medium">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-400 text-brand-950 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide">
              PICKUP ONLY
            </span>
            <span>{t('pickupOnlyNotice')}</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-300 text-[11px]">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>8:00 AM – 8:00 PM (MYT)</span>
            </span>
            <span className="hidden sm:flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Malaysia</span>
            </span>
            <Link to="/track" className="hover:text-white underline transition">
              {t('trackOrder')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center space-x-2.5 shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-600/30 group-hover:bg-brand-700 transition">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight block leading-tight group-hover:text-brand-600 transition">
              Syed Aboobakar
            </span>
            <span className="text-[11px] font-bold text-brand-600 tracking-wider uppercase block">
              Kedai Runcit Malaysia
            </span>
          </div>
        </Link>

        {/* Live Search Bar with Suggestions */}
        <div className="flex-1 max-w-xl relative hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-800 text-sm pl-10 pr-24 py-2.5 rounded-full border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-xs font-semibold shadow-sm transition"
            >
              Search
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="p-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3">
                Suggested Products
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {suggestions.map((item) => (
                  <Link
                    key={item.id}
                    to={`/product/${item.id}`}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center space-x-3 p-2.5 hover:bg-slate-50 transition"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-10 h-10 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {getLocalizedName(item)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.unit} • {item.category}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-brand-600">
                      RM {(item.price_sen / 100).toFixed(2)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Icons: Language, Notifications, Cart, User */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              <span>{lang === 'en' ? '🇬🇧 EN' : lang === 'ms' ? '🇲🇾 BM' : '🇮🇳 தமிழ்'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                <button
                  onClick={() => { setLang('en'); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between ${lang === 'en' ? 'text-brand-600 font-bold bg-brand-50' : 'text-slate-700'}`}
                >
                  <span>🇬🇧 English</span>
                  {lang === 'en' && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setLang('ms'); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between ${lang === 'ms' ? 'text-brand-600 font-bold bg-brand-50' : 'text-slate-700'}`}
                >
                  <span>🇲🇾 B. Malaysia</span>
                  {lang === 'ms' && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setLang('ta'); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 flex items-center justify-between ${lang === 'ta' ? 'text-brand-600 font-bold bg-brand-50' : 'text-slate-700'}`}
                >
                  <span>🇮🇳 தமிழ் (Tamil)</span>
                  {lang === 'ta' && <CheckCircle className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
              title={t('notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {t('notifications')} ({unreadCount})
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-brand-600 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3 text-left transition cursor-pointer ${n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-brand-50/50 hover:bg-brand-50'}`}
                      >
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Shopping Cart Icon with Badge */}
          <Link
            to="/cart"
            className="flex items-center space-x-1.5 p-2 px-3 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 font-semibold text-xs transition relative"
          >
            <ShoppingCart className="w-4 h-4 text-brand-600" />
            <span className="hidden sm:inline">{t('cart')}</span>
            <span className="bg-brand-600 text-white text-[11px] px-1.5 py-0.2 rounded-full font-bold ml-1">
              {totalItemCount}
            </span>
          </Link>

          {/* User Account / Login */}
          <div className="relative" ref={userRef}>
            {user ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-1.5 p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[90px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <Link
                to="/auth"
                className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t('login')}</span>
              </Link>
            )}

            {showUserMenu && user && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                    {user.role}
                  </span>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{t('profile')}</span>
                </Link>

                <Link
                  to="/profile?tab=orders"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>{t('orders')}</span>
                </Link>

                {isStaff && (
                  <Link
                    to="/admin"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span>{t('adminDashboard')}</span>
                  </Link>
                )}

                <div className="border-t border-slate-100 my-1"></div>

                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-4 pb-2.5 md:hidden">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-slate-100 text-slate-800 text-xs pl-9 pr-16 py-2 rounded-xl border border-slate-200 outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <button
            type="submit"
            className="absolute right-1 top-1 bottom-1 px-3 bg-brand-600 text-white rounded-lg text-[10px] font-bold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category Navigation Bar */}
      <nav className="bg-slate-50 border-t border-slate-100 overflow-x-auto scrollbar-none py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs font-semibold whitespace-nowrap">
          <Link
            to="/products"
            className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-500 transition shadow-2xs"
          >
            {t('allCategories')}
          </Link>
          {[
            { id: 'Rice & Grains', labelKey: 'cat_rice' },
            { id: 'Oil & Spices', labelKey: 'cat_oil' },
            { id: 'Vegetables', labelKey: 'cat_vegetables' },
            { id: 'Fruits', labelKey: 'cat_fruits' },
            { id: 'Meat & Fish', labelKey: 'cat_meat' },
            { id: 'Dairy & Eggs', labelKey: 'cat_dairy' },
            { id: 'Snacks', labelKey: 'cat_snacks' },
            { id: 'Drinks', labelKey: 'cat_drinks' },
            { id: 'Household', labelKey: 'cat_household' },
            { id: 'Others', labelKey: 'cat_others' }
          ].map(cat => (
            <Link
              key={cat.id}
              to={`/products?category=${encodeURIComponent(cat.id)}`}
              className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-brand-600 text-slate-600 transition"
            >
              {t(cat.labelKey)}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
