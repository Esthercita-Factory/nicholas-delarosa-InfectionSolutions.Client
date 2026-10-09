/** Tipos de las respuestas de la API (mismos nombres que los DTOs de Application, en camelCase). */

export const CUSTOMER_ROLE = 'Cliente';
export const ADMINISTRATOR_ROLE = 'Administrador';

/** IVA vigente. El catalogo trae precios sin IVA; la API suma el 19 % al registrar la compra. */
export const TAX_RATE = 0.19;

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface Customer {
  id: string;
  document: string;
  fullName: string;
  age: number;
  email: string;
  phone: string;
  address: string | null;
  isActive: boolean;
  hasPortalAccess: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  customer: Customer | null;
}

export interface AuthResponse {
  tokenType: string;
  accessToken: string;
  expiresAt: string;
  user: UserProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  document: string;
  fullName: string;
  age: number | null;
  email: string;
  phone: string;
  address: string | null;
  password: string;
  confirmPassword: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  /** Precio unitario sin IVA. */
  price: number;
  stock: number;
  isActive: boolean;
}

export interface ProductQuery {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export type SaleStatus = 'Completed' | 'Cancelled';

export interface SaleListItem {
  id: string;
  saleNumber: string;
  saleDate: string;
  customerName: string;
  customerDocument: string;
  itemCount: number;
  total: number;
  status: SaleStatus;
}

export interface SaleDetail {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  saleDate: string;
  status: SaleStatus;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  cancelledAt: string | null;
  details: SaleDetail[];
}

export interface SaleLineRequest {
  productId: string;
  quantity: number;
}

export interface CheckoutRequest {
  lines: SaleLineRequest[];
  notes: string | null;
}

export interface SaleCreatedResponse {
  sale: Sale;
  receiptEmailSent: boolean;
  sentTo: string;
}

/** Errores de la API (RFC 9457). "errors" trae los campos invalidos en camelCase. */
export interface ProblemDetails {
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}
