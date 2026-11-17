import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  Users,
  BarChart3,
  Tag,
  ShieldCheck,
  FileText,
  Settings,
  Volume2,
  VolumeX,
  LogOut,
  ArrowLeft,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function AdminLayout() {
  const { user, isOwner, isStaff, logout } = useAuth();
  const { soundEnabled, setSoundEnabled } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();

  // If not staff or owner, show unauthorized view
  if (!user || (!isOwner && !isStaff)) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Restricted Access</h2>
        <p className="text-xs text-slate-500">
          This portal is reserved for Syed Aboobakar Kedai owners and authorized staff members. Please log in with a staff account.
        </p>
        <Link
          to="/auth"
          className="inline-block px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Sign In to Seller Portal
        </Link>
      </div>
    );
  }

  const currentPath = location.pathname;

  // Sidebar navigation items with RBAC
  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard, ownerOnly: false },
    { label: 'Orders', path: '/admin/orders', icon: Package, ownerOnly: false },
    { label: 'Products', path: '/admin/products', icon: ShoppingBag, ownerOnly: false },
    { label: 'Inventory', path: '/admin/inventory', icon: Boxes, ownerOnly: false },
    { label: 'Customers', path: '/admin/customers', icon: Users, ownerOnly: false },
    { label: 'Coupons', path: '/admin/coupons', icon: Tag, ownerOnly: false },
    // Owner Only Tabs
    { label: 'Sales Analytics', path: '/admin/analytics', icon: BarChart3, ownerOnly: true },
    { label: 'Staff Accounts', path: '/admin/staff', icon: ShieldCheck, ownerOnly: true },
    { label: 'Audit Trail', path: '/admin/audit', icon: FileText, ownerOnly: true },
    { label: 'Shop Settings', path: '/admin/settings', icon: Settings, ownerOnly: true },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white shadow-sm">
                S
              </div>
              <div>
                <span className="font-extrabold text-sm block leading-tight text-white">
                  Seller Portal
                </span>
                <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider block">
                  Syed Aboobakar Kedai
                </span>
              </div>
            </Link>
          </div>

          {/* User Role Badge */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
              <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${
                isOwner ? 'bg-amber-400 text-slate-950' : 'bg-brand-600 text-white'
              }`}>
                {isOwner ? 'OWNER (FULL ACCESS)' : 'STAFF (LIMITED ACCESS)'}
              </span>
            </div>

            {/* Live Audio Alert Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={soundEnabled ? 'Mute new order sound alerts' : 'Enable new order sound alerts'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              if (item.ownerOnly && !isOwner) return null;
              const isActive = currentPath === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: View Customer Store & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-1 text-xs font-bold">
          <Link
            to="/"
            className="flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Customer Store</span>
          </Link>

          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}
