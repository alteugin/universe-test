import { Test } from '@nestjs/testing';
import { SqsService } from '@ssut/nestjs-sqs';
import { getToken } from '@willsoto/nestjs-prometheus';
import { productEventSchema, QUEUE_NAMES } from '@universe-test/contracts';
import { ProductEventsPublisher } from './product-events.publisher';

describe('ProductEventsPublisher', () => {
  let publisher: ProductEventsPublisher;
  let sqs: { send: jest.Mock };
  let counter: { inc: jest.Mock };

  beforeEach(async () => {
    sqs = { send: jest.fn().mockResolvedValue(undefined) };
    counter = { inc: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductEventsPublisher,
        { provide: SqsService, useValue: sqs },
        { provide: getToken('sqs_messages_published_total'), useValue: counter },
      ],
    }).compile();

    publisher = moduleRef.get(ProductEventsPublisher);
  });

  it('sends a contract-valid product.created envelope to the right queue', async () => {
    const event = {
      eventId: '11111111-1111-1111-1111-111111111111',
      eventType: 'product.created' as const,
      occurredAt: '2026-05-26T08:00:00.000Z',
      payload: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Foo',
        description: 'desc',
        price: 9.99,
      },
    };

    await publisher.dispatch(event);

    const [queue, message] = sqs.send.mock.calls[0];
    expect(queue).toBe(QUEUE_NAMES.PRODUCT_EVENTS);
    expect(message.id).toBe(event.eventId);
    expect(productEventSchema.safeParse(message.body).success).toBe(true);
    expect(counter.inc).toHaveBeenCalledWith({ event_type: 'product.created' });
  });

  it('sends a contract-valid product.deleted envelope', async () => {
    await publisher.dispatch({
      eventId: '11111111-1111-1111-1111-111111111111',
      eventType: 'product.deleted',
      occurredAt: '2026-05-26T08:00:00.000Z',
      payload: { id: '22222222-2222-2222-2222-222222222222' },
    });

    const [, message] = sqs.send.mock.calls[0];
    expect(productEventSchema.safeParse(message.body).success).toBe(true);
    expect(counter.inc).toHaveBeenCalledWith({ event_type: 'product.deleted' });
  });
});
