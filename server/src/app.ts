import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { chatRouter } from './routes/chat.js';
import { sessionRouter } from './routes/session.js';
import { getProviderLabel, hasLLMConfig } from './ai.js';
import { authMode, trustedHeaderAuth } from './access.js';
import { getStorageStatus } from './db.js';
import {
  errorHandler,
  jsonParseErrorHandler,
  notFoundHandler,
  requestContext,
  requestLogger,
} from './middleware.js';

dotenv.config();

export const app = express();

app.use(requestContext);
app.use(requestLogger);
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(jsonParseErrorHandler);
app.use(trustedHeaderAuth);

app.use('/api/chat', chatRouter);
app.use('/api/session', sessionRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    authMode: authMode(),
    llm: {
      configured: hasLLMConfig(),
      provider: hasLLMConfig() ? getProviderLabel() : null,
    },
  });
});

app.get('/api/ready', (_req, res) => {
  const storage = getStorageStatus();
  const llmConfigured = hasLLMConfig();
  const ready = storage.ok && llmConfigured;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    authMode: authMode(),
    storage,
    llm: {
      configured: llmConfigured,
      provider: llmConfigured ? getProviderLabel() : null,
    },
  });
});

app.use('/api', notFoundHandler);

const clientDistDir = process.env.CLIENT_DIST_DIR?.trim();
if (clientDistDir) {
  const resolvedClientDist = path.resolve(clientDistDir);
  app.use(express.static(resolvedClientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(resolvedClientDist, 'index.html'));
  });
}

app.use(errorHandler);
