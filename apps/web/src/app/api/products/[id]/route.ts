import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const upstream = await fetch(`${env.PRODUCTS_API_URL}/products/${id}`, {
    method: 'DELETE',
  });

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
