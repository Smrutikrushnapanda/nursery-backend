import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestLog } from './request-log.entity';
import { RequestLoggerMiddleware } from './request-logger.middleware';
import { LogReportService } from './log-report.service';
import { LogReportController } from './log-report.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RequestLog])],
  controllers: [LogReportController],
  providers: [LogReportService, RequestLoggerMiddleware],
})
export class LogReportModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}