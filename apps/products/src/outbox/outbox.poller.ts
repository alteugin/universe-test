import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductEventsPublisher } from '../sqs/product-events.publisher';
import { productEventSchema } from '@universe-test/contracts';

const POLL_INTERVAL_MS = 200;
const BATCH_SIZE = 10;

@Injectable()
export class OutboxPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPoller.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: ProductEventsPublisher,
    @InjectMetric('outbox_dispatched_total')
    private readonly dispatchedCounter: Counter<string>,
    @InjectMetric('outbox_dispatch_failures_total')
    private readonly failuresCounter: Counter<string>,
    @InjectMetric('outbox_pending')
    private readonly pendingGauge: Gauge<string>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);
    this.logger.log(`Outbox poller started (every ${POLL_INTERVAL_MS}ms)`);
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    // Let an in-flight tick finish before shutdown so we don't leave SQS sends
    // in a torn state.
    while (this.running) {
      await new Promise((r) => setTimeout(r, 50));
    }
    this.logger.log('Outbox poller stopped');
  }

  async tick(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      const batch = await this.prisma.outboxEvent.findMany({
        where: { dispatchedAt: null },
        take: BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      const pending = await this.prisma.outboxEvent.count({
        where: { dispatchedAt: null },
      });
      this.pendingGauge.set(pending);

      if (!batch.length) return;

      for (const row of batch) {
        const parsed = productEventSchema.safeParse({
          eventId: row.id,
          eventType: row.eventType,
          occurredAt: row.createdAt.toISOString(),
          payload: row.payload,
        });

        if (!parsed.success) {
          // Row is corrupt — mark as dispatched-with-error to stop infinite retries.
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: {
              dispatchedAt: new Date(),
              lastError: `schema_invalid: ${parsed.error.message}`,
            },
          });
          this.failuresCounter.inc({ event_type: row.eventType });
          this.logger.error(
            { eventId: row.id, issues: parsed.error.issues },
            'corrupt outbox row — sealing without dispatch',
          );
          continue;
        }

        const envelope = parsed.data;

        try {
          await this.publisher.dispatch(envelope);
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: { dispatchedAt: new Date() },
          });
          this.dispatchedCounter.inc({ event_type: envelope.eventType });
        } catch (err) {
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: {
              attempts: { increment: 1 },
              lastError: (err as Error).message,
            },
          });
          this.failuresCounter.inc({ event_type: envelope.eventType });
          this.logger.error(
            { err, eventId: row.id, attempts: row.attempts + 1 },
            'outbox dispatch failed — will retry on next tick',
          );
        }
      }
    } catch (err) {
      this.logger.error({ err }, 'outbox poll cycle failed');
    } finally {
      this.running = false;
    }
  }
}
