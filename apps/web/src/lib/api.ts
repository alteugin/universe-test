import type { CreateProductInput, Product, ProductListResponse } from './types';

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  list: (page: number, limit: number): Promise<ProductListResponse> =>
    request<ProductListResponse>(`/api/products?page=${page}&limit=${limit}`, {
      cache: 'no-store',
    }),

  create: (input: CreateProductInput): Promise<Product> =>
    request<Product>('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  remove: (id: string): Promise<void> =>
    request<void>(`/api/products/${id}`, { method: 'DELETE' }),
};
