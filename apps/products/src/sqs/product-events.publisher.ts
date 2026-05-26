import { Injectable, Logger } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { QUEUE_NAMES, type ProductEvent } from '@universe-test/contracts';

@Injectable()
export class ProductEventsPublisher {
  private readonly logger = new Logger(ProductEventsPublisher.name);

  constructor(
    private readonly sqs: SqsService,
    @InjectMetric('sqs_messages_published_total')
    private readonly publishedCounter: Counter<string>,
  ) {}

  async dispatch(event: ProductEvent): Promise<void> {
    await this.sqs.send(QUEUE_NAMES.PRODUCT_EVENTS, {
      id: event.eventId,
      body: event,
    });
    this.publishedCounter.inc({ event_type: event.eventType });
    this.logger.debug(
      { eventId: event.eventId, eventType: event.eventType },
      'event dispatched to SQS',
    );
  }
}
