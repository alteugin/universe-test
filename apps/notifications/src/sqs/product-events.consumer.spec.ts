import { Test } from '@nestjs/testing';
import { getToken } from '@willsoto/nestjs-prometheus';
import type { Message } from '@aws-sdk/client-sqs';
import { ProductEventsConsumer } from './product-events.consumer';

describe('ProductEventsConsumer', () => {
  let consumer: ProductEventsConsumer;
  let consumedCounter: { inc: jest.Mock };
  let failedCounter: { inc: jest.Mock };

  beforeEach(async () => {
    consumedCounter = { inc: jest.fn() };
    failedCounter = { inc: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductEventsConsumer,
        { provide: getToken('sqs_messages_consumed_total'), useValue: consumedCounter },
        { provide: getToken('sqs_messages_failed_total'), useValue: failedCounter },
      ],
    }).compile();

    consumer = moduleRef.get(ProductEventsConsumer);
  });

  const makeMessage = (body: unknown): Message => ({
    MessageId: 'msg-1',
    Body: JSON.stringify(body),
  });

  it('processes a valid product.created event', async () => {
    const event = {
      eventId: '11111111-1111-1111-1111-111111111111',
      eventType: 'product.created' as const,
      occurredAt: '2026-05-26T08:00:00.000Z',
      payload: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Foo',
        description: 'desc',
        price: 5,
      },
    };

    await consumer.handleMessage(makeMessage(event));
    expect(consumedCounter.inc).toHaveBeenCalledWith({ event_type: 'product.created' });
    expect(failedCounter.inc).not.toHaveBeenCalled();
  });

  it('throws on schema-invalid body and increments failed counter', async () => {
    const badMessage = makeMessage({ eventType: 'unknown', foo: 'bar' });
    await expect(consumer.handleMessage(badMessage)).rejects.toThrow('Invalid event envelope');
    expect(failedCounter.inc).toHaveBeenCalledWith({ reason: 'schema_invalid' });
    expect(consumedCounter.inc).not.toHaveBeenCalled();
  });

  it('skips messages with empty body', async () => {
    await consumer.handleMessage({ MessageId: 'msg-x' } as Message);
    expect(consumedCounter.inc).not.toHaveBeenCalled();
  });
});
