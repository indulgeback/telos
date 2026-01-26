// Package middleware 提供 Express 中间件
//
// requestLogger 中间件为每个 HTTP 请求自动添加日志记录：
//   - 生成请求 ID（支持 X-Request-ID 头）
//   - 记录请求开始（方法、路径、查询参数、IP）
//   - 记录响应完成（状态码、耗时）
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // 生成请求 ID（支持客户端传入的 X-Request-ID）
  req.id = (req.header('X-Request-ID') as string) || randomUUID();

  const startTime = Date.now();

  // 记录请求开始
  logger.info({
    msg: 'Incoming request',
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.header('user-agent'),
  });

  // 捕获响应完成事件
  const originalSend = res.send;
  res.send = function (data: any) {
    res.send = originalSend;

    const duration = Date.now() - startTime;

    // 记录响应完成
    logger.info({
      msg: 'Request completed',
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalSend.apply(res, arguments as unknown as Parameters<typeof originalSend>);
  };

  next();
}
