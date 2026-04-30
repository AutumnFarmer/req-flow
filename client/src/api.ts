import type { DocTab, QualityReport, Session, Stage } from './types';

const API = '/api';

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || fallback);
  }
  return res.json();
}

export async function createSession(idea: string): Promise<Session> {
  const res = await fetch(`${API}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea }),
  });
  const data = await readJson<{ session: Session }>(res, '创建会话失败');
  return data.session;
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${API}/session/${id}`);
  return readJson<Session>(res, '获取会话失败');
}

export async function updateStage(id: string, stage: Stage): Promise<Session> {
  const res = await fetch(`${API}/session/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  return readJson<Session>(res, '更新阶段失败');
}

export async function runQuality(id: string): Promise<Session> {
  const res = await fetch(`${API}/session/${id}/quality`, { method: 'POST' });
  const data = await readJson<{ session: Session }>(res, '质量检查失败');
  return data.session;
}

export async function acceptProposal(id: string, proposalId: string): Promise<Session> {
  const res = await fetch(`${API}/session/${id}/proposals/${proposalId}/accept`, { method: 'POST' });
  return readJson<Session>(res, '接受提案失败');
}

export async function rejectProposal(id: string, proposalId: string): Promise<Session> {
  const res = await fetch(`${API}/session/${id}/proposals/${proposalId}/reject`, { method: 'POST' });
  return readJson<Session>(res, '拒绝提案失败');
}

export async function rollbackSession(id: string, version: number): Promise<Session> {
  const res = await fetch(`${API}/session/${id}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });
  return readJson<Session>(res, '回滚失败');
}

export async function generatePrototype(id: string): Promise<Session> {
  const res = await fetch(`${API}/chat/${id}/prototype`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await readJson<{ session: Session }>(res, '生成原型失败');
  return data.session;
}

export async function exportMarkdown(id: string): Promise<string> {
  const res = await fetch(`${API}/session/${id}/export/markdown`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '导出失败');
  }
  return res.text();
}

export function streamChat(
  id: string,
  message: string,
  command?: string,
  onDelta?: (content: string) => void,
  onDone?: (updates: string[]) => void,
  onError?: (message: string) => void,
  onQuality?: (report: QualityReport) => void,
) {
  const controller = new AbortController();

  fetch(`${API}/chat/${id}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, command }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError?.(err.error || 'AI 服务异常');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const lines = rawEvent.split('\n');
          const event = lines.find((line) => line.startsWith('event: '))?.slice(7);
          const dataLine = lines.find((line) => line.startsWith('data: '));
          if (!dataLine) continue;
          try {
            const parsed = JSON.parse(dataLine.slice(6));
            if (event === 'delta' && parsed.content !== undefined) {
              onDelta?.(parsed.content);
            } else if (event === 'quality' && parsed.report) {
              onQuality?.(parsed.report);
            } else if (event === 'done') {
              onDone?.(parsed.updates || []);
            } else if (event === 'error') {
              onError?.(parsed.message || 'AI 服务异常');
            }
          } catch {}
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err.message || '连接失败');
      }
    });

  return controller;
}

export const STAGE_LABELS: Record<Stage, string> = {
  clarify: '需求澄清',
  draft: '方案草稿',
  review: '审阅迭代',
  frozen: '已冻结',
};

export const STAGE_COLORS: Record<Stage, string> = {
  clarify: 'text-blue-400',
  draft: 'text-amber-400',
  review: 'text-purple-400',
  frozen: 'text-emerald-400',
};

export const DOC_TAB_LABELS: Record<DocTab, string> = {
  constitution: '需求宪法',
  requirement: '需求文档',
  tech: '技术方案',
  acceptance: '验收标准',
  prototype: '原型预览',
  taskPlan: '任务拆解',
};
