import type { Product } from "../types";

export const GUEST_CART_STORAGE_KEY = "okanga_guest_checkout_cart";
const fallbackImage = "https://picsum.photos/seed/product-fallback/1000/700";

export type GuestCartItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
  category: string;
};

type StoredGuestCart = {
  items: GuestCartItem[];
};

function dispatchGuestCartChange() {
  window.dispatchEvent(new Event("guest-cart-changed"));
}

function normalizeItem(item: Partial<GuestCartItem>): GuestCartItem | null {
  if (
    typeof item.productId !== "number" ||
    !Number.isFinite(item.productId) ||
    typeof item.productName !== "string" ||
    !item.productName.trim() ||
    typeof item.quantity !== "number" ||
    !Number.isFinite(item.quantity) ||
    item.quantity <= 0 ||
    typeof item.unitPrice !== "number" ||
    !Number.isFinite(item.unitPrice)
  ) {
    return null;
  }

  return {
    productId: item.productId,
    productName: item.productName.trim(),
    quantity: Math.max(1, Math.round(item.quantity)),
    unitPrice: Number(item.unitPrice),
    imageUrl: typeof item.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl : fallbackImage,
    category: typeof item.category === "string" && item.category.trim() ? item.category.trim() : "Product",
  };
}

function writeGuestCart(items: GuestCartItem[]) {
  const payload: StoredGuestCart = { items };
  localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(payload));
  dispatchGuestCartChange();
}

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredGuestCart>;
    if (!Array.isArray(parsed.items)) {
      return [];
    }

    const normalized = parsed.items
      .map((item) => normalizeItem(item))
      .filter((item): item is GuestCartItem => item !== null);

    if (normalized.length !== parsed.items.length) {
      writeGuestCart(normalized);
    }

    return normalized;
  } catch {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    dispatchGuestCartChange();
    return [];
  }
}

function toGuestCartItem(product: Product, quantity: number): GuestCartItem {
  return {
    productId: product.id,
    productName: product.name,
    quantity: Math.max(1, Math.round(quantity)),
    unitPrice: Number(product.price),
    imageUrl: product.imageUrls?.[0] || fallbackImage,
    category: product.category || "Product",
  };
}

export function hasGuestCartItems(): boolean {
  return readGuestCart().length > 0;
}

export function getGuestCartCount(items: GuestCartItem[] = readGuestCart()): number {
  return new Set(items.map((item) => item.productId)).size;
}

export function addGuestCartProduct(product: Product, quantity = 1) {
  const items = readGuestCart();
  const existingIndex = items.findIndex((item) => item.productId === product.id);
  const nextQuantity = Math.max(1, Math.round(quantity));

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    items[existingIndex] = {
      ...existing,
      productName: product.name,
      category: product.category || existing.category,
      imageUrl: product.imageUrls?.[0] || existing.imageUrl,
      unitPrice: Number(product.price),
      quantity: existing.quantity + nextQuantity,
    };
  } else {
    items.push(toGuestCartItem(product, nextQuantity));
  }

  writeGuestCart(items);
}

export function replaceGuestCartWithProduct(product: Product, quantity = 1) {
  writeGuestCart([toGuestCartItem(product, quantity)]);
}

export function updateGuestCartItemQuantity(productId: number, quantity: number) {
  const nextQuantity = Math.max(0, Math.round(quantity));
  if (nextQuantity === 0) {
    removeGuestCartItem(productId);
    return;
  }

  const items = readGuestCart().map((item) =>
    item.productId === productId
      ? {
          ...item,
          quantity: nextQuantity,
        }
      : item
  );
  writeGuestCart(items);
}

export function removeGuestCartItem(productId: number) {
  const items = readGuestCart().filter((item) => item.productId !== productId);
  if (items.length === 0) {
    clearGuestCart();
    return;
  }
  writeGuestCart(items);
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  dispatchGuestCartChange();
}

export function getGuestCartSubtotal(items: GuestCartItem[] = readGuestCart()): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
