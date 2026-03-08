import type { Product } from "../types";

const CATALOG_CACHE_KEY = "okanga-catalog-cache-v2";
const PRODUCT_CACHE_KEY = "okanga-product-cache-v1";
const CACHE_TTL_MS = 15 * 60 * 1000;

type CatalogCache = {
  products: Product[];
  currentPage: number;
  hasMore: boolean;
  pageSize: number;
  savedAt: number;
};

type ProductCacheEntry = {
  product: Product;
  savedAt: number;
};

type ProductCache = Record<string, ProductCacheEntry>;

const canUseStorage = () => typeof window !== "undefined";

const isFresh = (savedAt: number) => Date.now() - savedAt < CACHE_TTL_MS;

export const readCatalogCache = (): CatalogCache | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CatalogCache;
    if (!parsed.savedAt || !isFresh(parsed.savedAt)) {
      window.sessionStorage.removeItem(CATALOG_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const writeCatalogCache = (cache: Omit<CatalogCache, "savedAt">) => {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    CATALOG_CACHE_KEY,
    JSON.stringify({
      ...cache,
      savedAt: Date.now(),
    } satisfies CatalogCache)
  );
};

export const clearCatalogCache = () => {
  if (!canUseStorage()) {
    return;
  }
  window.sessionStorage.removeItem(CATALOG_CACHE_KEY);
};

const readProductCache = (): ProductCache => {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as ProductCache;
    const freshEntries = Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) => entry.savedAt && isFresh(entry.savedAt))
    );

    if (Object.keys(freshEntries).length !== Object.keys(parsed).length) {
      window.sessionStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(freshEntries));
    }

    return freshEntries;
  } catch {
    return {};
  }
};

const writeProductCache = (cache: ProductCache) => {
  if (!canUseStorage()) {
    return;
  }
  window.sessionStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
};

export const cacheProduct = (product: Product) => {
  if (!canUseStorage()) {
    return;
  }

  const cache = readProductCache();
  cache[String(product.id)] = {
    product,
    savedAt: Date.now(),
  };
  writeProductCache(cache);
};

export const cacheProducts = (products: Product[]) => {
  if (!canUseStorage()) {
    return;
  }

  const cache = readProductCache();
  const savedAt = Date.now();
  products.forEach((product) => {
    cache[String(product.id)] = {
      product,
      savedAt,
    };
  });
  writeProductCache(cache);
};

export const readCachedProduct = (productId: number) => {
  const cache = readProductCache();
  return cache[String(productId)]?.product ?? null;
};

export const clearProductCache = () => {
  if (!canUseStorage()) {
    return;
  }
  window.sessionStorage.removeItem(PRODUCT_CACHE_KEY);
};
