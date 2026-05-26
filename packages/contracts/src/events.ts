import { z } from 'zod';

export const QUEUE_NAMES = {
  PRODUCT_EVENTS: 'product-events',
  PRODUCT_EVENTS_DLQ: 'product-events-dlq',
} as const;

export const EVENT_TYPES = {
  PRODUCT_CREATED: 'product.created',
  PRODUCT_DELETED: 'product.deleted',
} as const;

const productCreatedPayloadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative(),
});

const productDeletedPayloadSchema = z.object({
  id: z.string().uuid(),
});

export const productCreatedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal(EVENT_TYPES.PRODUCT_CREATED),
  occurredAt: z.string().datetime(),
  payload: productCreatedPayloadSchema,
});

export const productDeletedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal(EVENT_TYPES.PRODUCT_DELETED),
  occurredAt: z.string().datetime(),
  payload: productDeletedPayloadSchema,
});

export const productEventSchema = z.discriminatedUnion('eventType', [
  productCreatedEventSchema,
  productDeletedEventSchema,
]);

export type ProductCreatedEvent = z.infer<typeof productCreatedEventSchema>;
export type ProductDeletedEvent = z.infer<typeof productDeletedEventSchema>;
export type ProductEvent = z.infer<typeof productEventSchema>;
