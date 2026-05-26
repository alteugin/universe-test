import { Test } from '@nestjs/testing';
import { getToken } from '@willsoto/nestjs-prometheus';
import { PrismaService } from '../prisma/prisma.service';
import { ProductEventsPublisher } from '../sqs/product-events.publisher';
import { OutboxPoller } from './outbox.poller';

describe('OutboxPoller', () => {
  let poller: OutboxPoller;
  let prisma: {
    outboxEvent: { findMany: jest.Mock; update: jest.Mock; count: jest.Mock };
  };
  let publisher: { dispatch: jest.Mock };
  let dispatched: { inc: jest.Mock };
  let failures: { inc: jest.Mock };
  let pending: { set: jest.Mock };

  beforeEach(async () => {
    prisma = {
      outboxEvent: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    publisher = { dispatch: jest.fn().mockResolvedValue(undefined) };
    dispatched = { inc: jest.fn() };
    failures = { inc: jest.fn() };
    pending = { set: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OutboxPoller,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductEventsPublisher, useValue: publisher },
        { provide: getToken('outbox_dispatched_total'), useValue: dispatched },
        { provide: getToken('outbox_dispatch_failures_total'), useValue: failures },
        { provide: getToken('outbox_pending'), useValue: pending },
      ],
    }).compile();

    poller = moduleRef.get(OutboxPoller);
  });

  const validRow = (overrides: Partial<{ id: string; eventType: string; payload: object }> = {}) => ({
    id: '11111111-1111-1111-1111-111111111111',
    eventType: 'product.created',
    payload: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Foo',
      description: 'd',
      price: 1,
    },
    createdAt: new Date('2026-05-26T08:00:00.000Z'),
    dispatchedAt: null,
    attempts: 0,
    lastError: null,
    ...overrides,
  });

  it('dispatches pending rows and marks them as sent', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([validRow()]);

    await poller.tick();

    expect(publisher.dispatch).toHaveBeenCalledTimes(1);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: { dispatchedAt: expect.any(Date) },
    });
    expect(dispatched.inc).toHaveBeenCalledWith({ event_type: 'product.created' });
  });

  it('on dispatch failure: increments attempts + records error, leaves row pending for retry', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([validRow()]);
    publisher.dispatch.mockRejectedValue(new Error('SQS unreachable'));

    await poller.tick();

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: { attempts: { increment: 1 }, lastError: 'SQS unreachable' },
    });
    expect(failures.inc).toHaveBeenCalledWith({ event_type: 'product.created' });
  });

  it('seals a corrupt row (schema-invalid) so it does not retry forever', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      validRow({ payload: { foo: 'not a valid payload' } as object }),
    ]);

    await poller.tick();

    expect(publisher.dispatch).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      data: {
        dispatchedAt: expect.any(Date),
        lastError: expect.stringContaining('schema_invalid'),
      },
    });
  });

  it('updates pending gauge each tick', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([]);
    prisma.outboxEvent.count.mockResolvedValue(42);

    await poller.tick();

    expect(pending.set).toHaveBeenCalledWith(42);
  });
});
