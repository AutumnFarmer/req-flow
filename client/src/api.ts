import type { Session, DocTab } from './types';

const API = '/api';

export async function createSession(idea: string): Promise<Session> {
  const res = await fetch(`${API}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '创建会话失败');
  }
  const data = await res.json();
  return data.session;
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`${API}/session/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '获取会话失败');
  }
  return res.json();
}

export async function updateStage(id: string, stage: string): Promise<Session> {
  const res = await fetch(`${API}/session/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '更新阶段失败');
  }
  return res.json();
}

export async function resetSession(id: string): Promise<Session> {
  const res = await fetch(`${API}/session/${id}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '重置会话失败');
  }
  return res.json();
}

export async function generatePrototype(id: string): Promise<{ html: string }> {
  const res = await fetch(`${API}/chat/${id}/prototype`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '生成原型失败');
  }
  return res.json();
}

export function streamChat(
  id: string,
  message: string,
  command?: string,
  onDelta?: (content: string) => void,
  onDone?: (updates: string[]) => void,
  onError?: (message: string) => void,
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
        const err = await res.json();
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
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7);
            continue;
          }
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              // Match with the previous event line - we'll handle by data shape
              if (parsed.content !== undefined) {
                onDelta?.(parsed.content);
              } else if (parsed.updates) {
                onDone?.(parsed.updates);
              } else if (parsed.message) {
                onError?.(parsed.message);
              }
            } catch {}
          }
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

export const STAGE_LABELS: Record<string, string> = {
  clarify: '需求澄清',
  draft: '方案草稿',
  review: '审阅迭代',
  frozen: '已冻结',
};

export const STAGE_COLORS: Record<string, string> = {
  clarify: 'text-blue-400',
  draft: 'text-amber-400',
  review: 'text-purple-400',
  frozen: 'text-emerald-400',
};

export const STAGE_BG: Record<string, string> = {
  clarify: 'bg-blue-500/20 border-blue-500/30',
  draft: 'bg-amber-500/20 border-amber-500/30',
  review: 'bg-purple-500/20 border-purple-500/30',
  frozen: 'bg-emerald-500/20 border-emerald-500/30',
};

export const DOC_TAB_LABELS: Record<DocTab, string> = {
  requirement: '需求文档',
  tech: '技术方案',
  acceptance: '验收标准',
  prototype: '原型预览',
};
