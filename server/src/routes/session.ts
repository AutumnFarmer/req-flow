import { Router } from 'express';
import {
  acceptProposal,
  createSession,
  exportMarkdown,
  getSession,
  listSessionSummaries,
  persist,
  recordAuditEvent,
  rejectProposal,
  rollbackToSnapshot,
  runQualityCheck,
  submitReview,
} from '../store.js';
import type { ReviewStatus, Stage } from '../types.js';
import {
  type AccessRole,
  actorFromRequest,
  canAccessWorkspace,
  canUseRole,
  roleForbiddenMessage,
  workspaceFromRequest,
} from '../access.js';

export const sessionRouter = Router();

function ensureWorkspaceAccess(session: NonNullable<ReturnType<typeof getSession>>, req: Parameters<typeof canAccessWorkspace>[1], res: any) {
  if (canAccessWorkspace(session, req)) return true;
  res.status(403).json({ error: '无权访问该工作区会话' });
  return false;
}

function ensureRole(req: Parameters<typeof canUseRole>[0], res: any, minRole: AccessRole) {
  if (canUseRole(req, minRole)) return true;
  res.status(403).json({ error: roleForbiddenMessage(minRole) });
  return false;
}

sessionRouter.post('/', (req, res) => {
  if (!ensureRole(req, res, 'editor')) return;
  const { idea } = req.body as { idea: string };
  if (!idea?.trim()) {
    res.status(400).json({ error: '请输入你的想法' });
    return;
  }
  const session = createSession(idea, actorFromRequest(req), workspaceFromRequest(req));
  res.json({ id: session.id, session });
});

sessionRouter.get('/', (req, res) => {
  res.json({
    workspaceId: workspaceFromRequest(req),
    sessions: listSessionSummaries(workspaceFromRequest(req)),
  });
});

sessionRouter.get('/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  res.json(session);
});

sessionRouter.patch('/:id/stage', (req, res) => {
  const { stage } = req.body as { stage: Stage };
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  if (!ensureRole(req, res, 'admin')) return;
  const validStages: Stage[] = ['clarify', 'draft', 'review', 'frozen'];
  if (!validStages.includes(stage)) {
    res.status(400).json({ error: '无效的阶段' });
    return;
  }
  const report = runQualityCheck(session, stage);
  if (report.blockers.length > 0) {
    session.qualityReport = report;
    session.runtimeState = 'blocked';
    recordAuditEvent(session, 'stage.blocked', `阶段切换被质量闸门阻断：${stage}`, {
      targetStage: stage,
      blockerCount: report.blockers.length,
      warningCount: report.warnings.length,
    }, actorFromRequest(req));
    persist(session);
    res.status(409).json({ error: '质量闸门未通过，不能切换阶段', report, session });
    return;
  }
  const previousStage = session.stage;
  session.stage = stage;
  session.qualityReport = report;
  session.runtimeState = 'idle';
  recordAuditEvent(session, 'stage.changed', `阶段从 ${previousStage} 切换到 ${stage}`, {
    previousStage,
    targetStage: stage,
    score: report.score,
  }, actorFromRequest(req));
  persist(session);
  res.json(session);
});

sessionRouter.post('/:id/reset', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  if (!ensureRole(req, res, 'editor')) return;
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
  if (!ensureWorkspaceAccess(session, req, res)) return;
  if (!ensureRole(req, res, 'reviewer')) return;
  const report = runQualityCheck(session);
  session.qualityReport = report;
  session.runtimeState = report.blockers.length > 0 ? 'blocked' : 'idle';
  recordAuditEvent(session, 'quality.checked', '运行质量检查', {
    stage: session.stage,
    score: report.score,
    blockerCount: report.blockers.length,
    warningCount: report.warnings.length,
  }, actorFromRequest(req));
  persist(session);
  res.json({ report, session });
});

sessionRouter.post('/:id/proposals/:proposalId/accept', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  if (!ensureRole(req, res, 'editor')) return;
  try {
    res.json(acceptProposal(session, req.params.proposalId, actorFromRequest(req)));
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
  if (!ensureWorkspaceAccess(session, req, res)) return;
  if (!ensureRole(req, res, 'editor')) return;
  try {
    res.json(rejectProposal(session, req.params.proposalId, actorFromRequest(req)));
  } catch (err: any) {
    res.status(409).json({ error: err.message || '拒绝提案失败' });
  }
});

sessionRouter.get('/:id/audit', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  res.json(session.auditEvents);
});

sessionRouter.post('/:id/reviews', (req, res) => {
  const { status, comment = '', role = 'reviewer' } = req.body as {
    status: ReviewStatus;
    comment?: string;
    role?: string;
  };
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  if (!ensureRole(req, res, 'reviewer')) return;
  try {
    res.json(submitReview(session, status, comment, role, actorFromRequest(req)));
  } catch (err: any) {
    res.status(400).json({ error: err.message || '提交评审失败' });
  }
});

sessionRouter.get('/:id/snapshots', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  res.json(session.snapshots);
});

sessionRouter.post('/:id/rollback', (req, res) => {
  const { version } = req.body as { version: number };
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (!ensureWorkspaceAccess(session, req, res)) return;
  if (!ensureRole(req, res, 'admin')) return;
  if (!Number.isInteger(version)) {
    res.status(400).json({ error: '请输入要回滚的版本号' });
    return;
  }
  try {
    res.json(rollbackToSnapshot(session, version, actorFromRequest(req)));
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
  if (!ensureWorkspaceAccess(session, req, res)) return;
  recordAuditEvent(session, 'spec.exported', '导出 Markdown 规格包', {
    version: session.currentVersion,
    stage: session.stage,
  }, actorFromRequest(req));
  persist(session);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(exportMarkdown(session));
});
