import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

const counters = [
  makeCounterProvider({
    name: 'products_created_total',
    help: 'Total number of products created',
  }),
  makeCounterProvider({
    name: 'products_deleted_total',
    help: 'Total number of products deleted',
  }),
  makeCounterProvider({
    name: 'sqs_messages_published_total',
    help: 'Total number of SQS messages published',
    labelNames: ['event_type'],
  }),
  makeCounterProvider({
    name: 'outbox_dispatched_total',
    help: 'Total number of outbox events successfully dispatched to SQS',
    labelNames: ['event_type'],
  }),
  makeCounterProvider({
    name: 'outbox_dispatch_failures_total',
    help: 'Total number of outbox dispatch attempts that failed',
    labelNames: ['event_type'],
  }),
  makeGaugeProvider({
    name: 'outbox_pending',
    help: 'Number of outbox events not yet dispatched',
  }),
];

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: counters,
  exports: counters,
})
export class MetricsModule {}
