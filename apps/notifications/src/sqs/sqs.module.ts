import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SqsModule } from '@ssut/nestjs-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { QUEUE_NAMES } from '@universe-test/contracts';
import { ProductEventsConsumer } from './product-events.consumer';

@Module({
  imports: [
    SqsModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const sqsClient = new SQSClient({
          endpoint: config.get<string>('SQS_ENDPOINT'),
          region: config.getOrThrow<string>('AWS_REGION'),
          credentials: {
            accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
          },
        });

        return {
          producers: [],
          consumers: [
            {
              name: QUEUE_NAMES.PRODUCT_EVENTS,
              queueUrl: config.getOrThrow<string>('SQS_QUEUE_URL'),
              region: config.getOrThrow<string>('AWS_REGION'),
              sqs: sqsClient,
              batchSize: 10,
              waitTimeSeconds: 20,
            },
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [ProductEventsConsumer],
})
export class SqsConsumerModule {}
