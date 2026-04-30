import { useState } from 'react';
import { useAppStore } from '../store';
import { createSession, streamChat } from '../api';

export default function Welcome() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAppStore((s) => s.setSession);
  const setError = useAppStore((s) => s.setError);
  const setIsStreaming = useAppStore((s) => s.setIsStreaming);
  const setStreamingContent = useAppStore((s) => s.setStreamingContent);
  const appendStreamingContent = useAppStore((s) => s.appendStreamingContent);
  const addMessage = useAppStore((s) => s.addMessage);

  const handleStart = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const session = await createSession(idea.trim());
      setSession(session);

      // 自动发起第一轮 AI 对话
      setStreamingContent('');
      setIsStreaming(true);

      const initialMessage = `我的想法是：${idea.trim()}`;

      streamChat(
        session.id,
        initialMessage,
        undefined,
        (content) => appendStreamingContent(content),
        async (updates) => {
          setIsStreaming(false);
          addMessage({ role: 'user', content: initialMessage, timestamp: Date.now() });
          // 刷新会话数据
          try {
            const updated = await import('../api').then((m) => m.getSession(session.id));
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

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🔄</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-3">
            ReqFlow
          </h1>
          <p className="text-gray-400 text-lg">AI 需求澄清工作台 — 从一句话想法到可执行方案</p>
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart();
            }}
            placeholder="描述你的想法，哪怕只有一句话..."
            className="w-full h-36 bg-gray-900 border border-gray-700 rounded-2xl p-5 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-lg"
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <span className="text-xs text-gray-500">⌘+Enter 发送</span>
            <button
              onClick={handleStart}
              disabled={!idea.trim() || loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span> 创建中...
                </>
              ) : (
                <>开始澄清 →</>
              )}
            </button>
          </div>
        </div>

        {/* Examples */}
        <div className="mt-8">
          <p className="text-sm text-gray-500 mb-3">试试这些：</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              '我想做一个个人博客',
              '帮团队做一个周报系统',
              '做个在线白板协作工具',
              '想做一个记账 App',
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => setIdea(ex)}
                className="text-left px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-gray-400 hover:border-emerald-500/30 hover:text-gray-300 transition-all text-sm"
              >
                💡 {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
