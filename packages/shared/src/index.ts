// Core types — shared between server and client

export type UserRole = 'admin' | 'accountant' | 'sales' | 'purchase' | 'warehouse' | 'viewer';
export type PaymentMethod = 'bank' | 'cash' | 'cheque';
export type NormalBalance = 'debit' | 'credit';

// API response envelope types
export interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

export interface SingleResponse<T> {
  data: T;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// Pagination query helper
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export function parsePagination(query: PaginationQuery): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
  return { page, limit, offset: (page - 1) * limit };
}
