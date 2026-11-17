import React, { useState, useEffect } from 'react';
import {
  Settings,
  CreditCard,
  Mail,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Save,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSettings() {
  const { isOwner, token } = useAuth();
  const [settings, setSettings] = useState({
    shop_name: 'Syed Aboobakar Kedai',
    operating_hours: '8:00 AM – 8:00 PM',
    default_slot_capacity: '10',
    billplz_enabled: 'false',
    billplz_api_key: '',
    billplz_collection_id: '',
    billplz_x_signature_key: '',
    smtp_enabled: 'false',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: 'noreply@syedaboobakarkedai.com'
  });
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...(data.settings || {}) }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) fetchSettings();
  }, [isOwner, token]);

  if (!isOwner) {
    return (
      <div className="p-12 text-center text-xs font-bold text-slate-500 bg-white rounded-3xl border border-slate-200">
        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        Store settings can only be altered by the Store Owner.
      </div>
    );
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavedMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSavedMsg('Store settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Store Settings & Integrations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure pickup slot capacities, Billplz FPX Malaysia gateway, and reports
          </p>
        </div>

        {/* CSV Export & Print */}
        <div className="flex items-center space-x-2">
          <a
            href="/api/admin/export-orders"
            download="syed_aboobakar_orders.csv"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Orders CSV</span>
          </a>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Store & Pickup Slot Capacity */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
            <Settings className="w-4 h-4 text-brand-600" />
            <span>Pickup Operations & Capacity Limit</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Business Name</label>
              <input
                type="text"
                value={settings.shop_name}
                onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Operating Hours</label>
              <input
                type="text"
                value={settings.operating_hours}
                onChange={(e) => setSettings({ ...settings, operating_hours: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Max Orders Allowed Per 2-Hour Slot (Overbooking Prevention)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.default_slot_capacity}
                onChange={(e) => setSettings({ ...settings, default_slot_capacity: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Slots will automatically close once this limit is reached.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Billplz FPX Malaysia (DISABLED BY DEFAULT) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-brand-600" />
              <span>Billplz FPX Malaysia Gateway (Optional)</span>
            </h3>

            <label className="flex items-center space-x-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={settings.billplz_enabled === 'true'}
                onChange={(e) => setSettings({ ...settings, billplz_enabled: e.target.checked ? 'true' : 'false' })}
                className="rounded text-brand-600 w-4 h-4"
              />
              <span className={settings.billplz_enabled === 'true' ? 'text-emerald-700' : 'text-slate-500'}>
                {settings.billplz_enabled === 'true' ? 'ENABLED' : 'DISABLED (Default)'}
              </span>
            </label>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-600 space-y-1.5 leading-relaxed">
            <p className="font-bold text-slate-800">Activation Instructions:</p>
            <p className="text-[11px]">
              1. Register a verified Billplz Malaysia merchant account with your SSM registration and business bank account.
            </p>
            <p className="text-[11px]">
              2. Generate your Sandbox or Production API Key and Collection ID in the Billplz merchant portal.
            </p>
            <p className="text-[11px]">
              3. Enter your keys below, enable the checkbox, and save changes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Billplz API Secret Key</label>
              <input
                type="password"
                value={settings.billplz_api_key}
                onChange={(e) => setSettings({ ...settings, billplz_api_key: e.target.value })}
                placeholder="sec-xxxxxxxxxxxx"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Billplz Collection ID</label>
              <input
                type="text"
                value={settings.billplz_collection_id}
                onChange={(e) => setSettings({ ...settings, billplz_collection_id: e.target.value })}
                placeholder="col-xxxxxx"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: SMTP Email Service (DISABLED BY DEFAULT) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-brand-600" />
              <span>Email Service (SMTP)</span>
            </h3>

            <label className="flex items-center space-x-2 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={settings.smtp_enabled === 'true'}
                onChange={(e) => setSettings({ ...settings, smtp_enabled: e.target.checked ? 'true' : 'false' })}
                className="rounded text-brand-600 w-4 h-4"
              />
              <span className={settings.smtp_enabled === 'true' ? 'text-emerald-700' : 'text-slate-500'}>
                {settings.smtp_enabled === 'true' ? 'ENABLED' : 'DISABLED (Default)'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">SMTP Server Host</label>
              <input
                type="text"
                value={settings.smtp_host}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                placeholder="smtp.mailgun.org or smtp.gmail.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">SMTP Port</label>
              <input
                type="number"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                placeholder="587"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">SMTP Username</label>
              <input
                type="text"
                value={settings.smtp_user}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">SMTP Password</label>
              <input
                type="password"
                value={settings.smtp_pass}
                onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Store Settings</span>
        </button>
      </form>
    </div>
  );
}
