import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartApi, orderApi } from "../services/api";
import type { Cart, CustomerOrder, Product } from "../types";
import { getAuthToken, getCurrentUserId } from "../utils/auth";

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  cartCount: number;
  refreshCart: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  placeOrder: (paymentIntentId?: string) => Promise<CustomerOrder>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    const token = getAuthToken();
    const userId = getCurrentUserId();
    if (!token || !userId) {
      setCart(null);
      return;
    }

    setLoading(true);
    try {
      const response = await cartApi.getCart(token);
      setCart(response);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart().catch(() => undefined);
  }, [refreshCart]);

  useEffect(() => {
    const handler = () => {
      refreshCart().catch(() => undefined);
    };

    window.addEventListener("auth-changed", handler);
    return () => window.removeEventListener("auth-changed", handler);
  }, [refreshCart]);

  const addToCart = useCallback(async (product: Product, quantity = 1) => {
    const token = getAuthToken();
    const userId = getCurrentUserId();
    if (!token || !userId) {
      throw new Error("Login required");
    }

    const updated = await cartApi.addItem(token, {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: Number(product.price),
    });
    setCart(updated);
  }, []);

  const removeFromCart = useCallback(async (productId: number) => {
    const token = getAuthToken();
    const userId = getCurrentUserId();
    if (!token || !userId) {
      throw new Error("Login required");
    }

    const updated = await cartApi.removeItem(token, productId);
    setCart(updated);
  }, []);

  const clearCart = useCallback(async () => {
    const token = getAuthToken();
    const userId = getCurrentUserId();
    if (!token || !userId) {
      throw new Error("Login required");
    }

    await cartApi.clear(token);
    setCart({
      userId,
      items: [],
      total: 0,
    });
  }, []);

  const placeOrder = useCallback(async (paymentIntentId?: string) => {
    const token = getAuthToken();
    const userId = getCurrentUserId();
    if (!token || !userId) {
      throw new Error("Login required");
    }
    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    const created = await orderApi.create(token, {
      items: cart.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      paymentIntentId,
    });

    await cartApi.clear(token);
    setCart({
      userId,
      items: [],
      total: 0,
    });

    return created;
  }, [cart]);

  const cartCount = useMemo(
    () => new Set((cart?.items ?? []).map((item) => item.productId)).size,
    [cart]
  );

  const value: CartContextValue = {
    cart,
    loading,
    cartCount,
    refreshCart,
    addToCart,
    removeFromCart,
    clearCart,
    placeOrder,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
