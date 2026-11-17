import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Tag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { t, getLocalizedName } = useLanguage();
  const { addToCart, cartItems } = useCart();
  const [added, setAdded] = useState(false);

  const priceRM = (product.price_sen / 100).toFixed(2);
  const origPriceRM = product.original_price_sen ? (product.original_price_sen / 100).toFixed(2) : null;
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = !isOutOfStock && product.stock_quantity <= product.low_stock_threshold;

  // Check how many currently in cart
  const itemInCart = cartItems.find(i => i.productId === product.id);
  const qtyInCart = itemInCart ? itemInCart.quantity : 0;

  const handleAdd = (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-lg hover:border-brand-300 transition-all duration-200 flex flex-col overflow-hidden relative">
      {/* Discount Badge */}
      {product.discount_percent > 0 && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-rose-600 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-sm flex items-center space-x-0.5">
          <Tag className="w-3 h-3" />
          <span>-{product.discount_percent}%</span>
        </div>
      )}

      {/* Stock Status Badge */}
      <div className="absolute top-2.5 right-2.5 z-10">
        {isOutOfStock ? (
          <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            {t('outOfStock')}
          </span>
        ) : isLowStock ? (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
            {product.stock_quantity} left
          </span>
        ) : null}
      </div>

      {/* Product Image Link */}
      <Link to={`/product/${product.id}`} className="block relative pt-[85%] bg-slate-50 overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </Link>

      {/* Product Information */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            {product.category}
          </span>

          <Link to={`/product/${product.id}`} className="block">
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-brand-600 transition-colors line-clamp-2 min-h-[2.5rem] leading-snug">
              {getLocalizedName(product)}
            </h3>
          </Link>

          <p className="text-xs text-slate-500 mt-1 font-medium">{product.unit}</p>
        </div>

        {/* Pricing & Add to Cart button */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-base font-extrabold text-slate-900">
                RM {priceRM}
              </span>
              {origPriceRM && (
                <span className="text-xs text-slate-400 line-through">
                  RM {origPriceRM}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 transition shadow-2xs ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : added
                ? 'bg-emerald-600 text-white'
                : 'bg-brand-600 hover:bg-brand-700 text-white active:scale-95'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t('addedToCart')}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{qtyInCart > 0 ? `+${qtyInCart}` : t('addToCart')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
