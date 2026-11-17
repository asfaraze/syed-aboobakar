import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  MapPin,
  CheckCircle,
  Tag,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch initial products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?page=1&limit=24&sort=newest`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setHasMore(data.pagination.page < data.pagination.totalPages);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Load more products
  const handleLoadMore = async () => {
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/products?page=${nextPage}&limit=12&sort=newest`);
      if (res.ok) {
        const data = await res.json();
        setProducts(prev => [...prev, ...(data.products || [])]);
        setPage(nextPage);
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (err) {}
  };

  // Discounted deals
  const discountedProducts = products.filter(p => p.discount_percent > 0).slice(0, 4);

  // 10 Categories with colors & icons
  const categories = [
    { id: 'Rice & Grains', labelKey: 'cat_rice', icon: '🌾', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'Oil & Spices', labelKey: 'cat_oil', icon: '🌶️', color: 'bg-orange-50 text-orange-800 border-orange-200' },
    { id: 'Vegetables', labelKey: 'cat_vegetables', icon: '🥬', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'Fruits', labelKey: 'cat_fruits', icon: '🍎', color: 'bg-rose-50 text-rose-800 border-rose-200' },
    { id: 'Meat & Fish', labelKey: 'cat_meat', icon: '🍗', color: 'bg-red-50 text-red-800 border-red-200' },
    { id: 'Dairy & Eggs', labelKey: 'cat_dairy', icon: '🥛', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
    { id: 'Snacks', labelKey: 'cat_snacks', icon: '🍪', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'Drinks', labelKey: 'cat_drinks', icon: '☕', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'Household', labelKey: 'cat_household', icon: '🧼', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    { id: 'Others', labelKey: 'cat_others', icon: '📦', color: 'bg-slate-50 text-slate-800 border-slate-200' }
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Promotional Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-blue-950 text-white rounded-3xl mx-4 mt-4 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 bg-brand-700/60 backdrop-blur-sm text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>In-Store Pickup Only • Zero Delivery Charges</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {t('bannerTitle')}
            </h1>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
              {t('bannerSubtitle')}
            </p>

            {/* Operating Info Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-200">
              <span className="flex items-center space-x-1.5 bg-brand-950/40 px-3 py-1.5 rounded-xl border border-brand-700/40">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>8:00 AM – 8:00 PM (Daily)</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-brand-950/40 px-3 py-1.5 rounded-xl border border-brand-700/40">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Jalan Pasar, Malaysia</span>
              </span>
              <span className="flex items-center space-x-1.5 bg-brand-950/40 px-3 py-1.5 rounded-xl border border-brand-700/40">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pay at the Shop</span>
              </span>
            </div>

            <div className="pt-3">
              <Link
                to="/products"
                className="inline-flex items-center space-x-2 bg-amber-400 hover:bg-amber-300 text-brand-950 font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span>{t('shopNow')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Pickup Slots Card Preview */}
          <div className="w-full md:w-80 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-white shadow-xl">
            <h3 className="font-extrabold text-sm mb-1 flex items-center space-x-1.5 text-amber-300">
              <Clock className="w-4 h-4" />
              <span>{t('pickupSlotsTitle')}</span>
            </h3>
            <p className="text-xs text-slate-300 mb-3">{t('pickupSlotsSubtitle')}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              {['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00'].map(s => (
                <div key={s} className="bg-brand-950/60 px-2 py-1.5 rounded-lg border border-brand-600/30 text-center">
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10 Categories Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t('allCategories')}
            </h2>
            <p className="text-xs text-slate-500">Fresh daily essentials sourced across Malaysia</p>
          </div>
          <Link to="/products" className="text-xs font-bold text-brand-600 hover:underline flex items-center space-x-1">
            <span>{t('viewAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${encodeURIComponent(cat.id)}`}
              className={`p-3.5 rounded-2xl border ${cat.color} hover:shadow-md transition-all duration-200 flex flex-col items-center text-center group`}
            >
              <span className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <span className="text-xs font-bold tracking-tight">
                {t(cat.labelKey)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Special Deals & Discounts Section */}
      {discountedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {t('specialDiscounts')}
                </h2>
                <p className="text-xs text-slate-500">Exclusive savings on Malaysian household essentials</p>
              </div>
            </div>
            <Link
              to="/products?discountOnly=true"
              className="text-xs font-bold text-rose-600 hover:underline flex items-center space-x-1"
            >
              <span>{t('viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {discountedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* All Available Products Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t('featuredProducts')}
            </h2>
            <p className="text-xs text-slate-500">Browse all 50+ fresh grocery staples</p>
          </div>
          <Link to="/products" className="text-xs font-bold text-brand-600 hover:underline">
            {t('viewAll')}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 h-72 animate-pulse flex flex-col justify-between">
                <div className="bg-slate-100 rounded-xl h-36 w-full"></div>
                <div className="space-y-2">
                  <div className="bg-slate-100 h-4 rounded w-3/4"></div>
                  <div className="bg-slate-100 h-3 rounded w-1/2"></div>
                </div>
                <div className="bg-slate-100 h-8 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {t('loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
