import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Check,
  Tag,
  ShieldCheck,
  Clock,
  MapPin,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

export default function ProductDetails() {
  const { id } = useParams();
  const { t, getLocalizedName, getLocalizedDesc } = useLanguage();
  const { addToCart, cartItems } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          setRelated(data.related || []);
          setQty(1);
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="bg-slate-200 rounded-3xl h-96"></div>
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="text-xs text-slate-500">The product you are looking for may have been removed or is unavailable.</p>
        <Link to="/products" className="inline-block px-5 py-2.5 bg-brand-600 text-white font-bold text-xs rounded-xl">
          Browse All Products
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;
  const priceRM = (product.price_sen / 100).toFixed(2);
  const origPriceRM = product.original_price_sen ? (product.original_price_sen / 100).toFixed(2) : null;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* Back button */}
      <div>
        <Link
          to="/products"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
      </div>

      {/* Main Details Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Left: Product Image */}
        <div className="relative bg-slate-50 rounded-2xl p-8 flex items-center justify-center border border-slate-100 overflow-hidden">
          {product.discount_percent > 0 && (
            <div className="absolute top-4 left-4 z-10 bg-rose-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5" />
              <span>{product.discount_percent}% OFF</span>
            </div>
          )}
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full max-h-96 object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Right: Info & Actions */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block mb-1">
              {product.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {getLocalizedName(product)}
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">{product.unit}</p>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-3xl font-black text-slate-900">
              RM {priceRM}
            </span>
            {origPriceRM && (
              <span className="text-base text-slate-400 line-through">
                RM {origPriceRM}
              </span>
            )}
            {product.discount_percent > 0 && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                Save RM {((product.original_price_sen - product.price_sen) / 100).toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Availability */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-600">{t('availableStock')}:</span>
            {isOutOfStock ? (
              <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                {t('outOfStock')}
              </span>
            ) : isLowStock ? (
              <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                Only {product.stock_quantity} left in store
              </span>
            ) : (
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {product.stock_quantity} units available
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {t('description')}
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {getLocalizedDesc(product) || 'Fresh authentic Malaysian grocery product sourced directly for Syed Aboobakar Kedai.'}
            </p>
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden w-36">
              <button
                type="button"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                disabled={isOutOfStock || qty <= 1}
                className="w-10 h-11 text-slate-700 hover:bg-slate-200 font-bold transition flex items-center justify-center disabled:opacity-40"
              >
                -
              </button>
              <input
                type="number"
                value={qty}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setQty(Math.min(product.stock_quantity, Math.max(1, val)));
                }}
                disabled={isOutOfStock}
                className="w-16 h-11 text-center bg-transparent text-sm font-black text-slate-900 outline-none"
              />
              <button
                type="button"
                onClick={() => setQty(q => Math.min(product.stock_quantity, q + 1))}
                disabled={isOutOfStock || qty >= product.stock_quantity}
                className="w-10 h-11 text-slate-700 hover:bg-slate-200 font-bold transition flex items-center justify-center disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 py-3 px-6 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 transition shadow-md active:scale-98 ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : added
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>{t('addedToCart')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>{t('addToCart')} (RM {((product.price_sen * qty) / 100).toFixed(2)})</span>
                </>
              )}
            </button>
          </div>

          {/* In-Store Pickup Guarantee Notice */}
          <div className="bg-brand-50/70 p-4 rounded-2xl border border-brand-100 text-xs text-brand-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>In-Store Pickup Only Policy</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Order now, select your 2-hour slot, and collect fresh at Syed Aboobakar Kedai (Jalan Pasar, Malaysia) between 8:00 AM – 8:00 PM. No delivery charges.
            </p>
          </div>
        </div>
      </div>

      {/* You May Also Like Section */}
      {related.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-extrabold text-slate-900">
            {t('youMayAlsoLike')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
