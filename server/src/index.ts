import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat.js';
import { sessionRouter } from './routes/session.js';
import { getProviderLabel, hasLLMConfig } from './ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/chat', chatRouter);
app.use('/api/session', sessionRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    llm: {
      configured: hasLLMConfig(),
      provider: hasLLMConfig() ? getProviderLabel() : null,
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ReqFlow Server running on http://localhost:${PORT}`);
});
