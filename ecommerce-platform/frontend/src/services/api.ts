import axios from "axios";
import type {
  AnalyticsOverview,
  AuthResponse,
  Cart,
  CreateOrderRequest,
  CustomerOrder,
  PagedResponse,
  PasswordChangeRequest,
  PaystackInitializeRequest,
  PaystackInitializeResponse,
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  RegisterResponse,
  UserProfile,
  UserAddress,
  UserAddressUpsertRequest,
  UserProfileUpdateRequest,
} from "../types";
import { clearAuthToken } from "../utils/auth";

const api = axios.create({
  // Prefer same-origin calls via Vite proxy to avoid browser CORS/network issues.
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

// On 401: clear an invalid/expired token and retry the request without auth.
// This prevents stale tokens from breaking public endpoints like product listing.
api.interceptors.response.use(
  (response) => response,
  async (error: { response?: { status?: number }; config: Record<string, unknown> }) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retried && localStorage.getItem("auth_token")) {
      originalRequest._retried = true;
      clearAuthToken();
      delete (originalRequest.headers as Record<string, unknown>)["Authorization"];
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async register(payload: {
    firstName: string;
    lastName: string;
    address: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>("/api/v1/auth/register", payload);
    return data;
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/v1/auth/verify-otp", { email, otp });
    return data;
  },

  async resendOtp(email: string): Promise<void> {
    await api.post("/api/v1/auth/resend-otp", { email });
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/api/v1/auth/login", { email, password });
    return data;
  },
};

export const userApi = {
  async getMe(token: string): Promise<UserProfile> {
    const { data } = await api.get<UserProfile>("/api/v1/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async updateMe(token: string, payload: UserProfileUpdateRequest): Promise<UserProfile> {
    const { data } = await api.put<UserProfile>("/api/v1/users/me", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async changePassword(token: string, payload: PasswordChangeRequest): Promise<{ message: string }> {
    const { data } = await api.put<{ message: string }>("/api/v1/users/me/password", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async listAddresses(token: string): Promise<UserAddress[]> {
    const { data } = await api.get<UserAddress[]>("/api/v1/users/me/addresses", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async createAddress(token: string, payload: UserAddressUpsertRequest): Promise<UserAddress> {
    const { data } = await api.post<UserAddress>("/api/v1/users/me/addresses", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async updateAddress(token: string, id: number, payload: UserAddressUpsertRequest): Promise<UserAddress> {
    const { data } = await api.put<UserAddress>(`/api/v1/users/me/addresses/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async setDefaultAddress(token: string, id: number): Promise<UserAddress> {
    const { data } = await api.put<UserAddress>(`/api/v1/users/me/addresses/${id}/default`, undefined, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async deleteAddress(token: string, id: number): Promise<void> {
    await api.delete(`/api/v1/users/me/addresses/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export const productApi = {
  async list(token?: string, page = 0, size = 20): Promise<PagedResponse<Product>> {
    const { data } = await api.get<PagedResponse<Product>>("/api/v1/products", {
      params: { page, size },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  },

  async search(query: string, token?: string): Promise<Product[]> {
    const { data } = await api.get<Product[]>("/api/v1/products/search", {
      params: { q: query },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  },

  async getById(id: number, token?: string): Promise<Product> {
    const { data } = await api.get<Product>(`/api/v1/products/${id}`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
    return data;
  },

  async create(token: string, payload: ProductCreateRequest): Promise<Product> {
    const { data } = await api.post<Product>("/api/v1/products", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async update(token: string, id: number, payload: ProductUpdateRequest): Promise<Product> {
    const { data } = await api.put<Product>(`/api/v1/products/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async remove(token: string, id: number): Promise<void> {
    await api.delete(`/api/v1/products/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export const adminApi = {
  async overview(token: string): Promise<AnalyticsOverview> {
    const { data } = await api.get<AnalyticsOverview>("/api/v1/admin/analytics/overview", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },
};

export const orderApi = {
  async listAll(token: string, page = 0, size = 25): Promise<PagedResponse<CustomerOrder>> {
    const { data } = await api.get<PagedResponse<CustomerOrder>>("/api/v1/orders", {
      params: { page, size },
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },

  async create(token: string, payload: CreateOrderRequest): Promise<CustomerOrder> {
    const { data } = await api.post<CustomerOrder>("/api/v1/orders", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },
};

export const paymentApi = {
  async initializePaystack(token: string, payload: PaystackInitializeRequest): Promise<PaystackInitializeResponse> {
    const { data } = await api.post<PaystackInitializeResponse>("/api/v1/payments/paystack/initialize", payload, {
      headers: { Authorization: `Bearer ${token}` },
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
  async getCart(token: string): Promise<Cart> {
    const { data } = await api.get<Cart>(`/api/v1/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async addItem(token: string, payload: AddCartItemPayload): Promise<Cart> {
    const { data } = await api.post<Cart>(`/api/v1/cart/items`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async removeItem(token: string, productId: number): Promise<Cart> {
    const { data } = await api.delete<Cart>(`/api/v1/cart/items/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  },

  async clear(token: string): Promise<void> {
    await api.delete(`/api/v1/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
