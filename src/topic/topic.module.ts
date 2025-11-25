import { Module } from '@nestjs/common';
import { TopicService } from './topic.service';
import { TopicController } from './topic.controller';
import { CategoryModule } from 'src/category/category.module';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [CategoryModule, StorageModule],
  controllers: [TopicController],
  providers: [TopicService],
})
export class TopicModule {}
