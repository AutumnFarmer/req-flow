import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, RequestHandler } from 'express';

export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id')?.trim();
  const requestId = incoming || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (process.env.REQFLOW_REQUEST_LOGS === '0') return;
    const durationMs = Date.now() - startedAt;
    console.info(JSON.stringify({
      event: 'http.request',
      requestId: res.locals.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    }));
  });
  next();
};

export const jsonParseErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: '请求 JSON 格式无效',
      requestId: res.locals.requestId,
    });
    return;
  }
  next(err);
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: `接口不存在：${req.method} ${req.originalUrl}`,
    requestId: res.locals.requestId,
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || '服务端异常',
    requestId: res.locals.requestId,
  });
};
