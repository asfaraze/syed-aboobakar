import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  User,
  Package,
  KeyRound,
  ShieldCheck,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function CustomerProfile() {
  const { t } = useLanguage();
  const { user, logout, token } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState(null);

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);

  // 2FA States
  const [twoFaData, setTwoFaData] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaMsg, setTwoFaMsg] = useState(null);

  // Orders State
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setName(user.name);
    setPhone(user.phone || '');
  }, [user]);

  // Fetch customer order history
  useEffect(() => {
    if (activeTab === 'orders') {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const res = await fetch('/api/orders/my-orders', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            setMyOrders(data.orders || []);
          }
        } catch (err) {
          console.error('Failed to load my orders:', err);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [activeTab]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, phone })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Update failed' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Network error' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Network error' });
    }
  };

  const handleSetup2FA = async () => {
    setTwoFaMsg(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFaData(data);
      }
    } catch (err) {}
  };

  const handleActivate2FA = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/2fa/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ token: twoFaCode })
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFaMsg({ type: 'success', text: '2FA has been successfully activated!' });
        setTwoFaData(null);
        setTwoFaCode('');
      } else {
        setTwoFaMsg({ type: 'error', text: data.error || 'Invalid 2FA code' });
      }
    } catch (err) {
      setTwoFaMsg({ type: 'error', text: 'Failed to verify 2FA' });
    }
  };

  const handleReorder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          addToCart({ id: item.product_id, name: item.product_name, unit: item.unit, price_sen: item.unit_price_sen }, item.quantity);
        }
        navigate('/cart');
      }
    } catch (err) {
      alert('Failed to re-order previous items.');
    }
  };

  const handleDeleteAccount = async () => {
    const pass = window.prompt('Enter your password to confirm permanent account deletion:');
    if (!pass) return;

    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ password: pass })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Your account has been deleted.');
        logout();
        navigate('/');
      } else {
        alert(data.error || 'Failed to delete account');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Profile Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md shadow-brand-600/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-black text-base text-slate-900 mt-2 truncate">{user.name}</h3>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
              {user.role}
            </span>
          </div>

          <div className="space-y-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                activeTab === 'profile' ? 'bg-brand-50 text-brand-700 font-black' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Personal Details</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                activeTab === 'orders' ? 'bg-brand-50 text-brand-700 font-black' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t('orders')}</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                activeTab === 'security' ? 'bg-brand-50 text-brand-700 font-black' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Security & 2FA</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="flex-1 w-full space-y-6">
          {/* TAB 1: Profile Details */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h2 className="text-lg font-black text-slate-900">Personal Information</h2>

              {profileMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                  profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('fullName')}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full text-xs font-medium p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('phoneNumber')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+6012-3456789"
                    className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Order History */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <h2 className="text-lg font-black text-slate-900">Pickup Order History</h2>

              {loadingOrders ? (
                <div className="text-xs text-slate-400">Loading your orders...</div>
              ) : myOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  You haven't placed any grocery pickup orders yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myOrders.map(order => (
                    <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{order.order_number}</span>
                          <span className="bg-brand-50 text-brand-700 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]">
                            {order.pickup_code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            order.status === 'Collected' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-1">
                          Pickup: <strong>{order.pickup_date}</strong> ({order.pickup_slot}) • Total: <strong>RM {((order.total_sen || 0) / 100).toFixed(2)}</strong>
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/track?orderNumber=${order.order_number}&code=${order.pickup_code}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition"
                        >
                          Track
                        </Link>
                        <button
                          onClick={() => handleReorder(order.id)}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl transition flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reorder</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Security & 2FA */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Change Password */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-1.5">
                  <KeyRound className="w-4 h-4 text-brand-600" />
                  <span>Change Password</span>
                </h3>

                {passwordMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {passwordMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">New Password (min 6 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Update Password
                  </button>
                </form>
              </div>

              {/* 2FA Setup */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Two-Factor Authentication (TOTP)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Protect your account with Google Authenticator or Microsoft Authenticator.
                </p>

                {twoFaMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    twoFaMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {twoFaMsg.text}
                  </div>
                )}

                {!twoFaData ? (
                  <button
                    onClick={handleSetup2FA}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Configure Authenticator App
                  </button>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 max-w-sm">
                    <p className="text-xs font-bold text-slate-800">Scan this QR Code in Authenticator:</p>
                    <img src={twoFaData.qrCode} alt="2FA QR Code" className="w-44 h-44 mx-auto rounded-xl border border-slate-200 p-2 bg-white" />
                    <p className="text-[11px] text-slate-500 font-mono text-center">Secret: {twoFaData.secret}</p>

                    <form onSubmit={handleActivate2FA} className="space-y-2">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={twoFaCode}
                        onChange={(e) => setTwoFaCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="w-full text-center text-sm font-black p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                      >
                        Verify & Activate 2FA
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Danger Zone: Account Deletion */}
              {user.role !== 'owner' && (
                <div className="bg-rose-50/50 rounded-3xl border border-rose-200 p-6 space-y-3">
                  <h3 className="text-sm font-bold text-rose-800 flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Delete Account</span>
                  </h3>
                  <p className="text-xs text-rose-600">
                    Permanently delete your profile. Previous order records will be preserved for store auditing compliance.
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
                  >
                    Delete My Account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
