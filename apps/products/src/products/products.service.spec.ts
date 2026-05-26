import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getToken } from '@willsoto/nestjs-prometheus';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      delete: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    outboxEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let txProduct: { create: jest.Mock; delete: jest.Mock };
  let txOutbox: { create: jest.Mock };
  let createdCounter: { inc: jest.Mock };
  let deletedCounter: { inc: jest.Mock };

  beforeEach(async () => {
    txProduct = { create: jest.fn(), delete: jest.fn() };
    txOutbox = { create: jest.fn() };

    prisma = {
      product: {
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      outboxEvent: { create: jest.fn() },
      // Interactive transaction: callback receives a tx client.
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)({
            product: txProduct,
            outboxEvent: txOutbox,
          });
        }
        return arg;
      }),
    };
    createdCounter = { inc: jest.fn() };
    deletedCounter = { inc: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getToken('products_created_total'), useValue: createdCounter },
        { provide: getToken('products_deleted_total'), useValue: deletedCounter },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe('create', () => {
    it('persists product + outbox event in one transaction, then increments counter', async () => {
      const now = new Date('2026-05-26T08:00:00.000Z');
      txProduct.create.mockResolvedValue({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Foo',
        description: 'desc',
        price: 9.99,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.create({ name: 'Foo', description: 'desc', price: 9.99 });

      expect(txProduct.create).toHaveBeenCalledWith({
        data: { name: 'Foo', description: 'desc', price: 9.99 },
      });
      expect(txOutbox.create).toHaveBeenCalledWith({
        data: {
          eventType: 'product.created',
          payload: {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            name: 'Foo',
            description: 'desc',
            price: 9.99,
          },
        },
      });
      expect(createdCounter.inc).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    });
  });

  describe('delete', () => {
    it('deletes product + writes outbox event atomically', async () => {
      txProduct.delete.mockResolvedValue({});

      await service.delete('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

      expect(txProduct.delete).toHaveBeenCalledWith({
        where: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      });
      expect(txOutbox.create).toHaveBeenCalledWith({
        data: {
          eventType: 'product.deleted',
          payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        },
      });
      expect(deletedCounter.inc).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException on missing id without writing outbox', async () => {
      txProduct.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.delete('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(txOutbox.create).not.toHaveBeenCalled();
      expect(deletedCounter.inc).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns paginated response with computed totalPages', async () => {
      const now = new Date('2026-05-26T08:00:00.000Z');
      const items = Array.from({ length: 3 }, (_, i) => ({
        id: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa${i}`,
        name: `P${i}`,
        description: 'd',
        price: i,
        createdAt: now,
        updatedAt: now,
      }));
      prisma.$transaction.mockResolvedValueOnce([items, 25]);

      const result = await service.list({ page: 2, limit: 10 });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.items).toHaveLength(3);
    });
  });
});
