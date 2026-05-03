import type { Session } from './types.js';
import type { RequestHandler } from 'express';

export type AccessRole = 'viewer' | 'reviewer' | 'editor' | 'admin';

const ROLE_RANK: Record<AccessRole, number> = {
  viewer: 0,
  reviewer: 1,
  editor: 2,
  admin: 3,
};

export function actorFromRequest(req: { header: (name: string) => string | undefined }) {
  return req.header('x-reqflow-actor')?.trim() || 'local-user';
}

export function roleFromRequest(req: { header: (name: string) => string | undefined }): AccessRole {
  const rawRole = req.header('x-reqflow-role')?.trim().toLowerCase();
  if (rawRole === 'viewer' || rawRole === 'reviewer' || rawRole === 'editor' || rawRole === 'admin') {
    return rawRole;
  }
  return 'admin';
}

export function isValidRole(value: string | undefined): value is AccessRole {
  const role = value?.trim().toLowerCase();
  return role === 'viewer' || role === 'reviewer' || role === 'editor' || role === 'admin';
}

export function workspaceFromRequest(req: { header: (name: string) => string | undefined }) {
  return req.header('x-reqflow-workspace')?.trim() || 'default';
}

export function canAccessWorkspace(session: Session, req: { header: (name: string) => string | undefined }) {
  const requestedWorkspace = workspaceFromRequest(req);
  const sessionWorkspace = session.workspaceId || 'default';
  return requestedWorkspace === sessionWorkspace;
}

export function canUseRole(req: { header: (name: string) => string | undefined }, minRole: AccessRole) {
  return ROLE_RANK[roleFromRequest(req)] >= ROLE_RANK[minRole];
}

export function roleForbiddenMessage(minRole: AccessRole) {
  return `当前角色无权执行该操作，需要 ${minRole} 或更高权限`;
}

export function authMode() {
  return process.env.REQFLOW_AUTH_MODE === 'trusted-header' ? 'trusted-header' : 'local';
}

export const trustedHeaderAuth: RequestHandler = (req, res, next) => {
  if (authMode() !== 'trusted-header' || req.path === '/api/health' || req.path === '/api/ready') {
    next();
    return;
  }

  const actor = req.header('x-reqflow-actor')?.trim();
  const workspaceId = req.header('x-reqflow-workspace')?.trim();
  const role = req.header('x-reqflow-role')?.trim();

  if (!actor || !workspaceId || !role) {
    res.status(401).json({
      error: '可信身份头缺失：需要 x-reqflow-actor、x-reqflow-workspace、x-reqflow-role',
      requestId: res.locals.requestId,
    });
    return;
  }

  if (!isValidRole(role)) {
    res.status(403).json({
      error: '无效角色：x-reqflow-role 必须是 viewer、reviewer、editor 或 admin',
      requestId: res.locals.requestId,
    });
    return;
  }

  next();
};
