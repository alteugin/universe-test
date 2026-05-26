import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
} from '@willsoto/nestjs-prometheus';

const counters = [
  makeCounterProvider({
    name: 'sqs_messages_consumed_total',
    help: 'Total number of SQS messages consumed successfully',
    labelNames: ['event_type'],
  }),
  makeCounterProvider({
    name: 'sqs_messages_failed_total',
    help: 'Total number of SQS messages that failed processing',
    labelNames: ['reason'],
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
