import { Module } from '@nestjs/common';
import { SqsProducerModule } from '../sqs/sqs.module';
import { OutboxPoller } from './outbox.poller';

@Module({
  imports: [SqsProducerModule],
  providers: [OutboxPoller],
})
export class OutboxModule {}
