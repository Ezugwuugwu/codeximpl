import axios from "axios";
import type {
  AnalyticsOverview,
  AuthResponse,
  Cart,
  CreateOrderRequest,
  CustomerOrder,
  PaymentIntentCreateRequest,
  PaymentIntentCreateResponse,
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
} from "../types";

const api = axios.create({
  // Prefer same-origin calls via Vite proxy to avoid browser CORS/network issues.
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
    return data;
  },
};

export const productApi = {
  async list(token?: string): Promise<Product[]> {
    const { data } = await api.get<Product[]>("/api/products", {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
    return data;
  },

  async getById(id: number, token?: string): Promise<Product> {
    const { data } = await api.get<Product>(`/api/products/${id}`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
    return data;
  },

  async create(token: string, payload: ProductCreateRequest): Promise<Product> {
    const { data } = await api.post<Product>("/api/products", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async update(token: string, id: number, payload: ProductUpdateRequest): Promise<Product> {
    const { data } = await api.put<Product>(`/api/products/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async remove(token: string, id: number): Promise<void> {
    await api.delete(`/api/products/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export const adminApi = {
  async overview(token: string): Promise<AnalyticsOverview> {
    const { data } = await api.get<AnalyticsOverview>("/api/admin/analytics/overview", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },
};

export const orderApi = {
  async listAll(token: string): Promise<CustomerOrder[]> {
    const { data } = await api.get<CustomerOrder[]>("/api/orders", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async create(token: string, payload: CreateOrderRequest): Promise<CustomerOrder> {
    const { data } = await api.post<CustomerOrder>("/api/orders", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },
};

export const paymentApi = {
  async createIntent(token: string, payload: PaymentIntentCreateRequest): Promise<PaymentIntentCreateResponse> {
    const { data } = await api.post<PaymentIntentCreateResponse>("/api/payments/intent", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },
};

type AddCartItemPayload = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export const cartApi = {
  async getCart(token: string, userId: string): Promise<Cart> {
    const { data } = await api.get<Cart>(`/api/cart/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async addItem(token: string, userId: string, payload: AddCartItemPayload): Promise<Cart> {
    const { data } = await api.post<Cart>(`/api/cart/${encodeURIComponent(userId)}/items`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async removeItem(token: string, userId: string, productId: number): Promise<Cart> {
    const { data } = await api.delete<Cart>(`/api/cart/${encodeURIComponent(userId)}/items/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async clear(token: string, userId: string): Promise<void> {
    await api.delete(`/api/cart/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
