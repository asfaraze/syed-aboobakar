import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, X, Search, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';

export default function Products() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Filter States initialized from URL params
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true');
  const [discountOnly, setDiscountOnly] = useState(searchParams.get('discountOnly') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);

  const categories = [
    'All',
    'Rice & Grains',
    'Oil & Spices',
    'Vegetables',
    'Fruits',
    'Meat & Fish',
    'Dairy & Eggs',
    'Snacks',
    'Drinks',
    'Household',
    'Others'
  ];

  // Update query params when filters change
  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.set('category', category);
      if (search) params.set('search', search);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (inStock) params.set('inStock', 'true');
      if (discountOnly) params.set('discountOnly', 'true');
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '24');

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Filter error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredProducts();
  }, [category, sort, inStock, discountOnly, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFilteredProducts();
  };

  const handleResetFilters = () => {
    setCategory('All');
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setDiscountOnly(false);
    setSort('newest');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {category === 'All' ? t('allCategories') : category}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {products.length} of {totalCount} grocery items
          </p>
        </div>

        {/* Sorting Dropdown & Mobile Filter Button */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowMobileFilter(true)}
            className="md:hidden flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-800 transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{t('filters')}</span>
          </button>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              {t('sortBy')}:
            </span>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:border-brand-500 outline-none shadow-2xs"
            >
              <option value="newest">{t('sortNewest')}</option>
              <option value="price_asc">{t('sortPriceLow')}</option>
              <option value="price_desc">{t('sortPriceHigh')}</option>
              <option value="alpha">{t('sortAlpha')}</option>
              <option value="discount">{t('sortDiscount')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-8 mt-6">
        {/* Desktop Filter Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
                <Filter className="w-4 h-4 text-brand-600" />
                <span>{t('filters')}</span>
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-brand-600 hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('resetFilter')}</span>
              </button>
            </div>

            {/* Categories */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Categories
              </label>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setPage(1); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      category === cat
                        ? 'bg-brand-50 text-brand-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="border-t border-slate-100 pt-4">
              <label className="text-xs font-bold text-slate-700 block mb-2">
                {t('filterByPrice')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 p-2 border border-slate-200 rounded-lg text-xs outline-none"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 p-2 border border-slate-200 rounded-lg text-xs outline-none"
                />
              </div>
              <button
                onClick={() => { setPage(1); fetchFilteredProducts(); }}
                className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
              >
                {t('applyFilter')}
              </button>
            </div>

            {/* In-Stock & Discount Toggles */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => { setInStock(e.target.checked); setPage(1); }}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span>{t('inStockOnly')}</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={discountOnly}
                  onChange={(e) => { setDiscountOnly(e.target.checked); setPage(1); }}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span>{t('discountOnly')}</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Mobile Filter Drawer */}
        {showMobileFilter && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setShowMobileFilter(false)}
            ></div>
            <div className="relative w-80 max-w-full bg-white h-full p-5 overflow-y-auto space-y-5 z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-extrabold text-sm text-slate-900">{t('filters')}</h3>
                <button onClick={() => setShowMobileFilter(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Categories</label>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setShowMobileFilter(false); setPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium ${
                        category === cat ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="rounded text-brand-600 w-4 h-4"
                  />
                  <span>{t('inStockOnly')}</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={discountOnly}
                    onChange={(e) => setDiscountOnly(e.target.checked)}
                    className="rounded text-brand-600 w-4 h-4"
                  />
                  <span>{t('discountOnly')}</span>
                </label>
              </div>

              <button
                onClick={() => { setShowMobileFilter(false); fetchFilteredProducts(); }}
                className="w-full py-3 bg-brand-600 text-white rounded-xl text-xs font-bold"
              >
                View Results
              </button>
            </div>
          </div>
        )}

        {/* Main Products Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t('noProductsFound')}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try loosening your search terms or resetting price and stock filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {t('resetFilter')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
