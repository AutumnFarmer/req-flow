import type { AuditAction, AuditEvent } from '../types';

const ACTION_LABELS: Record<AuditAction, string> = {
  'session.created': '创建会话',
  'stage.changed': '阶段切换',
  'stage.blocked': '阶段阻断',
  'quality.checked': '质量检查',
  'proposal.accepted': '接受提案',
  'proposal.rejected': '拒绝提案',
  'review.submitted': '提交评审',
  'snapshot.rolled_back': '版本回滚',
  'prototype.generated': '生成原型',
  'spec.exported': '导出规格包',
};

export default function AuditView({ events }: { events: AuditEvent[] }) {
  const ordered = [...events].reverse();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">审计日志</h2>
          <p className="mt-1 text-xs text-gray-500">关键操作留痕，用于评审、回溯和企业系统集成。</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400">
          {events.length} 条
        </span>
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-500">
          暂无审计事件
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-white/10">
          <div className="grid grid-cols-[150px_120px_minmax(120px,1fr)_minmax(180px,1.4fr)] border-b border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 max-lg:grid-cols-[120px_100px_minmax(0,1fr)]">
            <div>时间</div>
            <div>动作</div>
            <div>操作者</div>
            <div className="max-lg:hidden">摘要</div>
          </div>
          <div className="divide-y divide-white/10">
            {ordered.map((event) => (
              <div
                key={event.id}
                className="grid grid-cols-[150px_120px_minmax(120px,1fr)_minmax(180px,1.4fr)] items-start gap-0 px-3 py-3 text-xs max-lg:grid-cols-[120px_100px_minmax(0,1fr)]"
              >
                <div className="font-mono text-gray-500">
                  {new Date(event.createdAt).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-cyan-300">{ACTION_LABELS[event.action]}</div>
                <div className="min-w-0 truncate text-gray-300">{event.actor}</div>
                <div className="min-w-0 text-gray-400 max-lg:col-span-3 max-lg:mt-1">
                  <div>{event.summary}</div>
                  {Object.keys(event.metadata).length > 0 && (
                    <div className="mt-1 font-mono text-[11px] leading-4 text-gray-600">
                      {Object.entries(event.metadata).map(([key, value]) => `${key}=${String(value)}`).join('  ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
