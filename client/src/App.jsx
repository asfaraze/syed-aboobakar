import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';

// Providers
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import InstallAppPrompt from './components/InstallAppPrompt';

// Customer Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import CustomerAuth from './pages/CustomerAuth';
import CustomerProfile from './pages/CustomerProfile';
import ShopInfo from './pages/ShopInfo';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';
import AdminInventory from './pages/admin/AdminInventory';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminStaff from './pages/admin/AdminStaff';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminSettings from './pages/admin/AdminSettings';

function CustomerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <InstallAppPrompt />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <Routes>
              {/* Customer Facing Routes */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
                <Route path="/track" element={<OrderTracking />} />
                <Route path="/auth" element={<CustomerAuth />} />
                <Route path="/profile" element={<CustomerProfile />} />
                <Route path="/info" element={<ShopInfo />} />
              </Route>

              {/* Seller Admin Dashboard Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="staff" element={<AdminStaff />} />
                <Route path="audit" element={<AdminAuditLogs />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Routes>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
