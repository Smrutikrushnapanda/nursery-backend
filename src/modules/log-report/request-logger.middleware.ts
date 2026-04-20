import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestLog } from './request-log.entity';

type JwtUser = { userId?: string; sub?: string };

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(RequestLog)
    private readonly logRepo: Repository<RequestLog>,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const method = req.method;
    const endpoint = req.originalUrl.split('?')[0]; // strip query params
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      null;

    res.on('finish', () => {
      const userId = (req as any).user
        ? ((req as any).user as JwtUser).userId ?? ((req as any).user as JwtUser).sub ?? null
        : null;

      this.logRepo
        .save(
          this.logRepo.create({
            method,
            endpoint,
            userId,
            ip,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          }),
        )
        .catch(() => null); // never crash the app on log failure
    });

    next();
  }
}