import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('sak_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [couponCode, setCouponCode] = useState(() => {
    return localStorage.getItem('sak_coupon') || '';
  });

  const [calculation, setCalculation] = useState({
    subtotal_sen: 0,
    discount_sen: 0,
    total_sen: 0,
    formatted: { subtotal: 'RM 0.00', discount: 'RM 0.00', total: 'RM 0.00' },
    coupon: null
  });

  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('sak_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('sak_coupon', couponCode);
  }, [couponCode]);

  // Recalculate server totals whenever cart items or coupon change
  useEffect(() => {
    const calculateTotals = async () => {
      if (cartItems.length === 0) {
        setCalculation({
          subtotal_sen: 0,
          discount_sen: 0,
          total_sen: 0,
          formatted: { subtotal: 'RM 0.00', discount: 'RM 0.00', total: 'RM 0.00' },
          coupon: null
        });
        setCalcError(null);
        return;
      }

      setCalculating(true);
      try {
        const payload = {
          items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
          couponCode: couponCode || null
        };

        const res = await fetch('/api/cart/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          setCalculation(data);
          setCalcError(null);
        } else {
          setCalcError(data.error);
        }
      } catch (err) {
        console.error('Cart calculation error:', err);
      } finally {
        setCalculating(false);
      }
    };

    calculateTotals();
  }, [cartItems, couponCode]);

  const addToCart = (product, qty = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const newQty = Math.min(product.stock_quantity, existing.quantity + qty);
        return prev.map(item => (item.productId === product.id ? { ...item, quantity: newQty } : item));
      } else {
        const newQty = Math.min(product.stock_quantity, Math.max(1, qty));
        return [...prev, { productId: product.id, quantity: newQty, product }];
      }
    });
  };

  const updateQuantity = (productId, qty) => {
    const newQty = parseInt(qty, 10);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const maxStock = item.product?.stock_quantity || 999;
          return { ...item, quantity: Math.min(maxStock, newQty) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setCouponCode('');
  };

  const applyCoupon = (code) => {
    setCouponCode(code.trim().toUpperCase());
  };

  const removeCoupon = () => {
    setCouponCode('');
  };

  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalItemCount,
        calculation,
        calculating,
        calcError,
        couponCode,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
