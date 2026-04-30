import { rollbackSession, runQuality } from '../api';
import { useAppStore } from '../store';
import QualityPanel from './QualityPanel';

export default function VersionHistory() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const setError = useAppStore((s) => s.setError);
  if (!session) return null;

  const handleQuality = async () => {
    try {
      setSession(await runQuality(session.id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRollback = async (version: number) => {
    try {
      setSession(await rollbackSession(session.id, version));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <QualityPanel report={session.qualityReport} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">版本快照</h3>
          <button onClick={handleQuality} className="text-[10px] text-cyan-300 hover:text-cyan-200">
            检查
          </button>
        </div>

        {session.snapshots.length === 0 ? (
          <p className="text-xs text-gray-600 italic">暂无快照</p>
        ) : (
          <div className="space-y-2">
            {[...session.snapshots].reverse().map((snapshot) => (
              <div key={snapshot.version} className="p-2.5 bg-white/[0.03] border border-white/10 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-cyan-300">v{snapshot.version}</span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(snapshot.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{snapshot.summary}</div>
                {snapshot.version !== session.currentVersion && (
                  <button
                    onClick={() => handleRollback(snapshot.version)}
                    className="mt-2 text-[10px] text-gray-500 hover:text-amber-300"
                  >
                    回滚到此版本
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">待确认问题</h3>
          <div className="space-y-2">
            {session.openQuestions.filter((item) => item.status === 'open').map((item) => (
              <div key={item.id} className="text-xs text-gray-500 leading-relaxed bg-white/[0.03] border border-white/10 rounded-md p-2">
                {item.question}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">快捷命令</h3>
          <div className="space-y-1.5">
            {['/review', '/generate-tech', '/generate-acceptance', '/quality', '/freeze', '/reset'].map((cmd) => (
              <div key={cmd} className="px-2.5 py-1.5 bg-white/[0.03] border border-white/10 rounded-md text-xs">
                <code className="text-cyan-300 font-mono">{cmd}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
