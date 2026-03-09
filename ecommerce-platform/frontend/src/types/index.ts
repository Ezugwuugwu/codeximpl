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
  imageCount?: number;
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

export type UserProfile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  address: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  createdAt: string;
};

export type UserProfileUpdateRequest = {
  firstName: string;
  lastName: string;
};

export type PasswordChangeRequest = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type UserAddress = {
  id: number;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  defaultAddress: boolean;
  complete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserAddressUpsertRequest = {
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  defaultAddress: boolean;
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
