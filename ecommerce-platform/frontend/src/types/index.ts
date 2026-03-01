export type PagedResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  last: boolean;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  imageUrls: string[];
  rating?: number;
  reviewCount?: number;
  active?: boolean;
  updatedAt?: string;
};

export type ProductCreateRequest = {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  imageUrls: string[];
};

export type ProductUpdateRequest = ProductCreateRequest;

export type OrderItem = {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type CustomerOrder = {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export type AnalyticsOverview = {
  timestamp: string;
  productCount: number;
  openOrders: number;
  estimatedRevenueToday: number;
  conversionRate: number;
  alerts: string;
};

export type AuthResponse = {
  token: string;
  email: string;
  role: "USER" | "ADMIN";
};

export type RegisterResponse = {
  message: string;
  email: string;
};

export type CartItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type Cart = {
  userId: string;
  items: CartItem[];
  total: number;
};

export type CreateOrderRequest = {
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentIntentId?: string;
};

export type PaymentIntentCreateRequest = {
  userId: string;
  amount: number;
  currency: string;
};

export type PaymentIntentCreateResponse = {
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  status: string;
};

export type PaystackInitializeRequest = {
  email: string;
  amount: number;
  currency?: string;
};

export type PaystackInitializeResponse = {
  reference: string;
  accessCode: string;
  publicKey: string;
};
