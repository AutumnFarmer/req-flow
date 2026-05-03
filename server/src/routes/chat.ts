import { Router } from 'express';
import { z } from 'zod';
import {
  addMessage,
  generatePrototype,
  getSession,
  handleAssistantTurn,
  persist,
} from '../store.js';
import { handleLLMAssistantTurn, shouldUseLocalCommand } from '../llm.js';
import { type AccessRole, actorFromRequest, canAccessWorkspace, canUseRole, roleForbiddenMessage } from '../access.js';

export const chatRouter = Router();

const chatBodySchema = z.object({
  message: z.string().default(''),
  command: z.string().optional(),
});

function sendSse(res: any, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function streamText(res: any, content: string) {
  const chunks = content.match(/[\s\S]{1,12}/g) || [];
  for (const chunk of chunks) {
    sendSse(res, 'delta', { content: chunk });
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
}

function minRoleForCommand(command?: string): AccessRole {
  return command === 'review' || command === 'quality' || command === 'advise' ? 'reviewer' : 'editor';
}

chatRouter.post('/:id/stream', async (req, res) => {
  const parsed = chatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: '消息格式无效' });
    return;
  }

  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!canAccessWorkspace(session, req)) {
    res.status(403).json({ error: '无权访问该工作区会话' });
    return;
  }

  const { message, command } = parsed.data;
  const minRole = minRoleForCommand(command);
  if (!canUseRole(req, minRole)) {
    res.status(403).json({ error: roleForbiddenMessage(minRole) });
    return;
  }
  const normalizedMessage = message.trim() || command || '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    if (normalizedMessage) {
      addMessage(session, 'user', normalizedMessage);
    }
    const result = shouldUseLocalCommand(command)
      ? handleAssistantTurn(session, normalizedMessage, command)
      : await handleLLMAssistantTurn(session, normalizedMessage, command);
    addMessage(session, 'assistant', result.message);
    persist(session);

    await streamText(res, result.message);

    if (result.proposal) {
      sendSse(res, 'proposal', { proposalId: result.proposal.id });
    }
    if (result.qualityReport) {
      sendSse(res, 'quality', { report: result.qualityReport });
    }
    sendSse(res, 'done', {
      recommendedAction: result.recommendedAction,
      updates: result.proposal ? result.proposal.impactTargets : [],
    });
  } catch (err: any) {
    sendSse(res, 'error', { message: err.message || 'AI 编排服务异常', retryable: true });
  }

  res.end();
});

chatRouter.post('/:id/prototype', async (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!canAccessWorkspace(session, req)) {
    res.status(403).json({ error: '无权访问该工作区会话' });
    return;
  }
  if (!canUseRole(req, 'editor')) {
    res.status(403).json({ error: roleForbiddenMessage('editor') });
    return;
  }
  if (!session.requirement) {
    res.status(400).json({ error: '请先接受一版需求文档提案' });
    return;
  }
  const prototype = generatePrototype(session, actorFromRequest(req));
  res.json({ html: prototype.html, prototype, session });
});
