import { useAppStore } from '../store';

export default function VersionHistory() {
  const session = useAppStore((s) => s.session);
  if (!session) return null;

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        版本历史
      </h3>

      {session.changelog.length === 0 ? (
        <p className="text-xs text-gray-600 italic">暂无变更记录</p>
      ) : (
        <div className="space-y-2">
          {session.changelog.map((log, i) => (
            <div
              key={i}
              className="p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-emerald-400">v{log.version}</span>
                <span className="text-[10px] text-gray-600">
                  {new Date(session.updatedAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {log.action === 'stage_change' && '🔀 '}
                {log.action === 'reset' && '🔄 '}
                {log.action === 'update' && '✏️ '}
                {log.detail}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          会话统计
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-400">{session.messages.length}</div>
            <div className="text-[10px] text-gray-500">消息数</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-blue-400">{session.version}</div>
            <div className="text-[10px] text-gray-500">版本号</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          快捷命令
        </h3>
        <div className="space-y-1.5">
          {[
            { cmd: '/review', desc: '审阅当前状态' },
            { cmd: '/fix', desc: '微调具体问题' },
            { cmd: '/idea', desc: '提出新想法' },
            { cmd: '/reset', desc: '推翻重来' },
            { cmd: '/freeze', desc: '冻结需求' },
          ].map((item) => (
            <div
              key={item.cmd}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-900/30 rounded text-xs"
            >
              <code className="text-emerald-400 font-mono">{item.cmd}</code>
              <span className="text-gray-500">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
