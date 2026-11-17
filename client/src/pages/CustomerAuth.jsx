import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function CustomerAuth() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isRegister, setIsRegister] = useState(searchParams.get('tab') === 'register');

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          totpToken: requires2FA ? totpToken.trim() : undefined
        })
      });

      const data = await res.json();

      if (data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      // Successful login
      login(data.user, data.token);

      if (data.user.role === 'staff' || data.user.role === 'owner') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to communicate with server.');
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      login(data.user, data.token);
      navigate('/profile');
    } catch (err) {
      setErrorMsg('Network error. Failed to create account.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        {/* Toggle Login / Register */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(null); setRequires2FA(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              !isRegister ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('login')}
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(null); setRequires2FA(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              isRegister ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('register')}
          </button>
        </div>

        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-slate-900">
            {isRegister ? 'Create Customer Account' : requires2FA ? 'Two-Factor Verification' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-500">
            {isRegister
              ? 'Save your pickup details for faster grocery checkout'
              : requires2FA
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to track orders and reorder your favourite items'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2FA Prompt */}
        {requires2FA ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                6-Digit Authenticator Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-widest text-lg font-black p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-mono"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
          </form>
        ) : isRegister ? (
          /* Registration Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t('fullName')} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Phone Number (Malaysia)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+6012-3456789"
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Password (min 6 characters) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Security Assurance Notice */}
        <div className="pt-2 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Protected by 15-min lockout after 5 incorrect attempts</span>
        </div>
      </div>
    </div>
  );
}
