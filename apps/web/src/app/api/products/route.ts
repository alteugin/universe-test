import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = `${env.PRODUCTS_API_URL}/products?${url.searchParams.toString()}`;

  const upstream = await fetch(target, { cache: 'no-store' });
  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function POST(req: Request) {
  const upstream = await fetch(`${env.PRODUCTS_API_URL}/products`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await req.text(),
  });
  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
