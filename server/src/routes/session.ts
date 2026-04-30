import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { createSession, getSession, updateSession } from '../store.js';
import type { Session, Stage } from '../store.js';

export const sessionRouter = Router();

sessionRouter.post('/', (req, res) => {
  const { idea } = req.body as { idea: string };
  if (!idea?.trim()) {
    res.status(400).json({ error: '请输入你的想法' });
    return;
  }
  const id = uuid();
  const session = createSession(id, idea);
  res.json({ id, session });
});

sessionRouter.get('/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  res.json(session);
});

sessionRouter.patch('/:id/stage', (req, res) => {
  const { stage } = req.body as { stage: Stage };
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  const validStages: Stage[] = ['clarify', 'draft', 'review', 'frozen'];
  if (!validStages.includes(stage)) {
    res.status(400).json({ error: '无效的阶段' });
    return;
  }
  const prevStage = session.stage;
  const updated = updateSession(req.params.id, { stage });
  updated?.changelog.push({
    version: updated.version,
    action: 'stage_change',
    detail: `${prevStage} → ${stage}`,
  });
  res.json(updated);
});

sessionRouter.post('/:id/reset', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  const updated = updateSession(req.params.id, {
    stage: 'clarify',
    version: 0,
    requirement: null,
    tech: null,
    acceptance: null,
    prototype: null,
    messages: [],
  });
  updated?.changelog.push({
    version: 0,
    action: 'reset',
    detail: '推翻重来',
  });
  res.json(updated);
});
