import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getToken } from '@willsoto/nestjs-prometheus';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Products (e2e)', () => {
  let app: INestApplication;
  const now = new Date('2026-05-26T08:00:00.000Z');

  const txProduct = {
    create: jest.fn().mockImplementation(({ data }) => ({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ...data,
      createdAt: now,
      updatedAt: now,
    })),
  };
  const txOutbox = { create: jest.fn() };

  const prismaMock = {
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)({
          product: txProduct,
          outboxEvent: txOutbox,
        });
      }
      return [[], 0];
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: getToken('products_created_total'), useValue: { inc: jest.fn() } },
        { provide: getToken('products_deleted_total'), useValue: { inc: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /products → 201 with created product', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .send({ name: 'Foo', description: 'desc', price: 1.5 })
      .expect(201);

    expect(res.body.id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(txOutbox.create).toHaveBeenCalled();
  });

  it('POST /products with bad body → 400', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({ name: '', price: -1 })
      .expect(400);
  });

  it('GET /products → 200 with pagination shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/products?page=1&limit=10')
      .expect(200);

    expect(res.body).toMatchObject({ items: [], total: 0, page: 1, limit: 10 });
    expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
  });
});
