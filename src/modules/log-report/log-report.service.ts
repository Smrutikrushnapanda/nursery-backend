import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestLog } from './request-log.entity';

export interface LogReportFilter {
  method?: string;
  userId?: string;
  status?: number;
  endpoint?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class LogReportService {
  constructor(
    @InjectRepository(RequestLog)
    private readonly logRepo: Repository<RequestLog>,
  ) {}

  async findAll(filter: LogReportFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 50));

    const qb = this.logRepo
      .createQueryBuilder('l')
      .orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter.method) {
      qb.andWhere('l.method = :method', { method: filter.method.toUpperCase() });
    }
    if (filter.userId) {
      qb.andWhere('l.userId = :userId', { userId: filter.userId });
    }
    if (filter.status) {
      qb.andWhere('l.statusCode = :statusCode', { statusCode: filter.status });
    }
    if (filter.endpoint) {
      qb.andWhere('l.endpoint ILIKE :endpoint', { endpoint: `%${filter.endpoint}%` });
    }
    if (filter.from) {
      qb.andWhere('l.createdAt >= :from', { from: new Date(filter.from) });
    }
    if (filter.to) {
      qb.andWhere('l.createdAt <= :to', { to: new Date(filter.to) });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      rows,
    };
  }

  async getSummary() {
    const raw = await this.logRepo
      .createQueryBuilder('l')
      .select('l.method', 'method')
      .addSelect('l.statusCode', 'statusCode')
      .addSelect('COUNT(*)', 'count')
      .addSelect('ROUND(AVG(l.durationMs))', 'avgDurationMs')
      .groupBy('l.method')
      .addGroupBy('l.statusCode')
      .orderBy('count', 'DESC')
      .getRawMany<{ method: string; statusCode: number; count: string; avgDurationMs: string }>();

    return raw.map((r) => ({
      method: r.method,
      statusCode: Number(r.statusCode),
      count: Number(r.count),
      avgDurationMs: Number(r.avgDurationMs),
    }));
  }
}