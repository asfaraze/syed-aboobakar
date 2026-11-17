import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Upload,
  Download,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const initialForm = {
    name: '',
    name_ms: '',
    name_ta: '',
    category: 'Rice & Grains',
    price_rm: '',
    original_price_rm: '',
    discount_percent: 0,
    stock_quantity: 20,
    low_stock_threshold: 5,
    unit: '1 unit',
    description: '',
    description_ms: '',
    description_ta: '',
    image_url: ''
  };
  const [form, setForm] = useState(initialForm);

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [csvReport, setCsvReport] = useState(null);

  const categories = [
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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (search) params.set('search', search);
      params.set('limit', '100');

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const price_sen = Math.round(parseFloat(form.price_rm) * 100);
      const original_price_sen = form.original_price_rm ? Math.round(parseFloat(form.original_price_rm) * 100) : null;

      const payload = {
        name: form.name,
        name_ms: form.name_ms,
        name_ta: form.name_ta,
        category: form.category,
        price_sen,
        original_price_sen,
        discount_percent: parseInt(form.discount_percent, 10) || 0,
        stock_quantity: parseInt(form.stock_quantity, 10) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 5,
        unit: form.unit,
        description: form.description,
        description_ms: form.description_ms,
        description_ta: form.description_ta,
        image_url: form.image_url || '/placeholder-grocery.png'
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setShowEditModal(false);
        setEditingProduct(null);
        setForm(initialForm);
        fetchProducts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save product');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) fetchProducts();
    } catch (err) {}
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      name_ms: p.name_ms || '',
      name_ta: p.name_ta || '',
      category: p.category,
      price_rm: (p.price_sen / 100).toFixed(2),
      original_price_rm: p.original_price_sen ? (p.original_price_sen / 100).toFixed(2) : '',
      discount_percent: p.discount_percent || 0,
      stock_quantity: p.stock_quantity,
      low_stock_threshold: p.low_stock_threshold || 5,
      unit: p.unit,
      description: p.description || '',
      description_ms: p.description_ms || '',
      description_ta: p.description_ta || '',
      image_url: p.image_url || ''
    });
    setShowEditModal(true);
  };

  const handleBulkImport = async () => {
    if (!csvContent.trim()) {
      alert('Please paste CSV contents or upload a file');
      return;
    }
    try {
      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ csvData: csvContent })
      });
      const data = await res.json();
      setCsvReport(data);
      if (data.importedCount > 0) {
        fetchProducts();
      }
    } catch (err) {
      alert('CSV import failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Product Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, edit, adjust prices, and import Malaysian grocery items
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setEditingProduct(null); setForm(initialForm); setShowAddModal(true); }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>

          <button
            onClick={() => { setCsvContent(''); setCsvReport(null); setShowCsvModal(true); }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk CSV Import</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl text-slate-800 outline-none"
        >
          <option value="All">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <form onSubmit={(e) => { e.preventDefault(); fetchProducts(); }} className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name, category..."
            className="flex-1 bg-slate-50 border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading products...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Price (RM)</th>
                  <th className="py-3 px-3">Stock</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 flex items-center space-x-3">
                      <img src={p.image_url} alt="" className="w-10 h-10 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 block truncate max-w-xs">{p.name}</span>
                        {p.name_ms && <span className="text-[10px] text-slate-400 block truncate max-w-xs">{p.name_ms}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600">{p.category}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">RM {(p.price_sen / 100).toFixed(2)}</span>
                      {p.original_price_sen && (
                        <span className="text-[10px] text-slate-400 line-through block">
                          RM {(p.original_price_sen / 100).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        p.stock_quantity <= 0 ? 'bg-rose-100 text-rose-800' :
                        p.stock_quantity <= p.low_stock_threshold ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.stock_quantity} left
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{p.unit}</td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 hover:bg-brand-50 text-brand-600 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}></div>
          <div className="relative bg-white rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingProduct ? 'Edit Grocery Product' : 'Add New Grocery Product'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Product Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Name (Bahasa Malaysia)</label>
                    <input
                      type="text"
                      value={form.name_ms}
                      onChange={(e) => setForm({ ...form, name_ms: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Name (Tamil)</label>
                    <input
                      type="text"
                      value={form.name_ta}
                      onChange={(e) => setForm({ ...form, name_ta: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Unit / Size (e.g. 10kg, 1L, 500g) *</label>
                    <input
                      type="text"
                      required
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Price (RM) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={form.price_rm}
                      onChange={(e) => setForm({ ...form, price_rm: e.target.value })}
                      placeholder="12.50"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Original Price (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.original_price_rm}
                      onChange={(e) => setForm({ ...form, original_price_rm: e.target.value })}
                      placeholder="15.00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Discount %</label>
                    <input
                      type="number"
                      value={form.discount_percent}
                      onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={form.low_stock_threshold}
                      onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description</label>
                  <textarea
                    rows="2"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowCsvModal(false)}></div>
          <div className="relative bg-white rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Bulk CSV Product Import</h3>
              <button onClick={() => setShowCsvModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste your CSV lines or download the official template to populate your real store inventory.
            </p>

            <div className="flex justify-start">
              <a
                href="/api/products/csv-template"
                download="syed_aboobakar_products_template.csv"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Template</span>
              </a>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                CSV Data (comma-separated):
              </label>
              <textarea
                rows="6"
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={'name,name_ms,name_ta,category,price_rm,stock,unit,description,image_url\n"Jasmine Rice 10kg","Beras Jasmine","ஜாஸ்மின்","Rice & Grains",39.90,50,"10kg","Description",""'}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              ></textarea>
            </div>

            {csvReport && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-emerald-700">{csvReport.message}</p>
                {csvReport.errors?.length > 0 && (
                  <div className="text-rose-600 mt-2 space-y-0.5">
                    <p className="font-bold">Errors encountered:</p>
                    {csvReport.errors.map((err, i) => (
                      <p key={i} className="text-[11px]">Row {err.row}: {err.error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Import Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
