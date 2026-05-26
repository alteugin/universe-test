'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { CreateProductDialog } from './CreateProductDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { PaginationBar } from './PaginationBar';

const LIMIT = 10;

export function ProductsTable() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', page, LIMIT],
    queryFn: () => api.list(page, LIMIT),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <CreateProductDialog />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data.items.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No products yet. Click <span className="font-medium">Create Product</span> to add one.
                    </td>
                  </tr>
                )}
                {data.items.map((product) => (
                  <tr key={product.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">${product.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <DeleteConfirmDialog product={product} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
