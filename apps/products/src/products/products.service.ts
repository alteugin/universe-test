import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { Prisma, type Product } from '@prisma/client';
import { EVENT_TYPES } from '@universe-test/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { ProductListResponse, ProductResponse } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectMetric('products_created_total')
    private readonly createdCounter: Counter<string>,
    @InjectMetric('products_deleted_total')
    private readonly deletedCounter: Counter<string>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    // Write product + outbox event atomically. The OutboxPoller drains
    // unsent rows to SQS — guarantees the event survives a crash between
    // commit and SQS send.
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: dto });
      await tx.outboxEvent.create({
        data: {
          eventType: EVENT_TYPES.PRODUCT_CREATED,
          payload: {
            id: created.id,
            name: created.name,
            description: created.description,
            price: created.price,
          },
        },
      });
      return created;
    });

    this.createdCounter.inc();
    return this.toResponse(product);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      try {
        await tx.product.delete({ where: { id } });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          throw new NotFoundException(`Product ${id} not found`);
        }
        throw err;
      }
      await tx.outboxEvent.create({
        data: {
          eventType: EVENT_TYPES.PRODUCT_DELETED,
          payload: { id },
        },
      });
    });

    this.deletedCounter.inc();
  }

  async list({ page, limit }: ListProductsDto): Promise<ProductListResponse> {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count(),
    ]);

    return {
      items: items.map((p) => this.toResponse(p)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private toResponse(p: Product): ProductResponse {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
