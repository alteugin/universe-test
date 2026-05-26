import { Injectable, Logger } from '@nestjs/common';
import { SqsMessageHandler, SqsConsumerEventHandler } from '@ssut/nestjs-sqs';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import type { Message } from '@aws-sdk/client-sqs';
import { QUEUE_NAMES, productEventSchema } from '@universe-test/contracts';

@Injectable()
export class ProductEventsConsumer {
  private readonly logger = new Logger(ProductEventsConsumer.name);

  constructor(
    @InjectMetric('sqs_messages_consumed_total')
    private readonly consumedCounter: Counter<string>,
    @InjectMetric('sqs_messages_failed_total')
    private readonly failedCounter: Counter<string>,
  ) {}

  @SqsMessageHandler(QUEUE_NAMES.PRODUCT_EVENTS, false)
  async handleMessage(message: Message): Promise<void> {
    if (!message.Body) {
      this.logger.warn({ messageId: message.MessageId }, 'empty message body');
      return;
    }

    const parsed = productEventSchema.safeParse(JSON.parse(message.Body));
    if (!parsed.success) {
      this.failedCounter.inc({ reason: 'schema_invalid' });
      this.logger.error(
        { messageId: message.MessageId, issues: parsed.error.issues },
        'invalid event envelope — message will be retried then DLQ',
      );
      throw new Error('Invalid event envelope');
    }

    const event = parsed.data;
    this.consumedCounter.inc({ event_type: event.eventType });
    this.logger.log(
      {
        eventId: event.eventId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        payload: event.payload,
      },
      `received ${event.eventType}`,
    );
  }

  @SqsConsumerEventHandler(QUEUE_NAMES.PRODUCT_EVENTS, 'processing_error')
  onError(error: Error, message: Message): void {
    this.failedCounter.inc({ reason: 'processing_error' });
    this.logger.error({ err: error, messageId: message?.MessageId }, 'processing error');
  }
}
