import { useEffect, useState } from 'react';
import { createSession, getSession, listSessions, streamChat } from '../api';
import { useAppStore } from '../store';
import type { SessionSummary } from '../types';
import ActorControl from './ActorControl';

export default function Welcome() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const workspaceId = useAppStore((s) => s.workspaceId);
  const setSession = useAppStore((s) => s.setSession);
  const setError = useAppStore((s) => s.setError);
  const setIsStreaming = useAppStore((s) => s.setIsStreaming);
  const setStreamingContent = useAppStore((s) => s.setStreamingContent);
  const appendStreamingContent = useAppStore((s) => s.appendStreamingContent);
  const addMessage = useAppStore((s) => s.addMessage);

  useEffect(() => {
    let cancelled = false;
    setLoadingRecent(true);
    listSessions()
      .then((sessions) => {
        if (!cancelled) setRecentSessions(sessions);
      })
      .catch(() => {
        if (!cancelled) setRecentSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const handleStart = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const session = await createSession(idea.trim());
      setSession(session);
      setStreamingContent('');
      setIsStreaming(true);

      const initialMessage = `我的想法是：${idea.trim()}`;

      streamChat(
        session.id,
        initialMessage,
        undefined,
        (content) => appendStreamingContent(content),
        async () => {
          setIsStreaming(false);
          addMessage({ role: 'user', content: initialMessage, timestamp: Date.now() });
          try {
            const updated = await getSession(session.id);
            setSession(updated);
          } catch {}
        },
        (msg) => {
          setIsStreaming(false);
          setError(msg);
        },
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (sessionId: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      setSession(await getSession(sessionId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#080b10] text-gray-100">
      <header className="h-14 border-b border-white/10 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 flex items-center justify-center text-xs font-semibold">
            RF
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">ReqFlow</div>
            <div className="text-[11px] text-gray-500">Controlled requirement loop</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ActorControl compact />
          <div className="text-xs text-gray-500">v1.0 本地工作台</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-12 grid grid-cols-[minmax(0,1.15fr)_360px] gap-8 max-lg:grid-cols-1 max-sm:px-4 max-sm:py-6">
        <section>
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/70 mb-3">Start a session</p>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-50">把模糊想法压成可开发规格</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400 max-w-2xl">
              先输入一句不完整的想法，系统会生成受控提案。正式文档只有在你接受提案后才会更新，并自动保存版本快照。
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#10151d] shadow-2xl shadow-black/30">
            <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-200">新建需求澄清会话</span>
              <span className="text-[11px] text-gray-500">Command + Enter</span>
            </div>
            <div className="p-5">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart();
                }}
                placeholder="例如：做一个团队周报系统，先能收集每个人的进展、问题和下周计划..."
                className="w-full h-40 bg-[#0b0f15] border border-white/10 rounded-md p-4 text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 transition-all text-sm leading-6"
              />
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500">第一轮会生成需求草案提案，不会直接写入正式文档。</p>
                <button
                  onClick={handleStart}
                  disabled={!idea.trim() || loading}
                  className="h-10 px-5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 disabled:text-gray-500 text-slate-950 rounded-md text-sm font-semibold transition-all whitespace-nowrap"
                >
                  {loading ? '创建中...' : '开始澄清'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {[
              '我想做一个个人博客',
              '帮团队做一个周报系统',
              '做个在线白板协作工具',
              '想做一个记账 App',
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => setIdea(ex)}
                className="text-left px-4 py-3 bg-[#0d1219] border border-white/10 rounded-md text-gray-400 hover:border-cyan-400/30 hover:text-gray-200 transition-all text-sm"
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-lg border border-white/10 bg-[#0d1219] p-5 h-fit">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">v1.0 工作流</h2>
          <div className="space-y-4">
            {[
              ['01', '澄清', '识别用户、场景、边界和待确认项'],
              ['02', '提案', '先展示影响范围，再等待确认'],
              ['03', '快照', '接受后保存版本，可回滚'],
              ['04', '冻结', '质量检查通过后输出规格包'],
            ].map(([step, title, desc]) => (
              <div key={step} className="flex gap-3">
                <div className="h-7 w-7 shrink-0 rounded border border-white/10 bg-white/[0.03] text-[11px] text-cyan-300 flex items-center justify-center">
                  {step}
                </div>
                <div>
                  <div className="text-sm text-gray-200">{title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-5">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-200">最近会话</h2>
              <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-500">
                {workspaceId}
              </span>
            </div>
            {loadingRecent ? (
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-500">加载中...</div>
            ) : recentSessions.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/10 p-3 text-xs leading-5 text-gray-500">
                当前工作区暂无历史会话。
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleOpenSession(item.id)}
                    className="block w-full rounded-md border border-white/10 bg-white/[0.03] p-3 text-left transition-all hover:border-cyan-400/30 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-xs font-medium text-gray-200">{item.title}</div>
                      <span className="shrink-0 rounded bg-[#080b10] px-1.5 py-0.5 text-[10px] text-gray-500">
                        v{item.currentVersion}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-gray-500">{item.originalIdea}</div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-600">
                      <span>{item.stage}</span>
                      {item.qualityScore !== null && <span>质量 {item.qualityScore}</span>}
                      {item.pendingProposal && <span className="text-amber-300/80">待确认</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
