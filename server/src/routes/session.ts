import { Router } from 'express';
import {
  acceptProposal,
  createSession,
  exportMarkdown,
  getSession,
  persist,
  rejectProposal,
  rollbackToSnapshot,
  runQualityCheck,
} from '../store.js';
import type { Stage } from '../types.js';

export const sessionRouter = Router();

sessionRouter.post('/', (req, res) => {
  const { idea } = req.body as { idea: string };
  if (!idea?.trim()) {
    res.status(400).json({ error: '请输入你的想法' });
    return;
  }
  const session = createSession(idea);
  res.json({ id: session.id, session });
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
  const report = runQualityCheck(session, stage);
  if (report.blockers.length > 0) {
    session.qualityReport = report;
    session.runtimeState = 'blocked';
    persist(session);
    res.status(409).json({ error: '质量闸门未通过，不能切换阶段', report, session });
    return;
  }
  session.stage = stage;
  session.qualityReport = report;
  session.runtimeState = 'idle';
  persist(session);
  res.json(session);
});

sessionRouter.post('/:id/reset', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  res.status(409).json({
    error: 'v1.0 中 reset 需要先生成提案，请通过 /reset 命令发起受控重置。',
    session,
  });
});

sessionRouter.post('/:id/quality', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  const report = runQualityCheck(session);
  session.qualityReport = report;
  session.runtimeState = report.blockers.length > 0 ? 'blocked' : 'idle';
  persist(session);
  res.json({ report, session });
});

sessionRouter.post('/:id/proposals/:proposalId/accept', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  try {
    res.json(acceptProposal(session, req.params.proposalId));
  } catch (err: any) {
    res.status(409).json({ error: err.message || '接受提案失败' });
  }
});

sessionRouter.post('/:id/proposals/:proposalId/reject', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  try {
    res.json(rejectProposal(session, req.params.proposalId));
  } catch (err: any) {
    res.status(409).json({ error: err.message || '拒绝提案失败' });
  }
});

sessionRouter.get('/:id/snapshots', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  res.json(session.snapshots);
});

sessionRouter.post('/:id/rollback', (req, res) => {
  const { version } = req.body as { version: number };
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!Number.isInteger(version)) {
    res.status(400).json({ error: '请输入要回滚的版本号' });
    return;
  }
  try {
    res.json(rollbackToSnapshot(session, version));
  } catch (err: any) {
    res.status(404).json({ error: err.message || '回滚失败' });
  }
});

sessionRouter.get('/:id/export/markdown', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(exportMarkdown(session));
});
