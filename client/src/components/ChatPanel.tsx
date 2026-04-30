import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../store';
import { streamChat, getSession } from '../api';
import type { ChatMessage } from '../types';

export default function ChatPanel() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const streamingContent = useAppStore((s) => s.streamingContent);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const setIsStreaming = useAppStore((s) => s.setIsStreaming);
  const setStreamingContent = useAppStore((s) => s.setStreamingContent);
  const appendStreamingContent = useAppStore((s) => s.appendStreamingContent);
  const addMessage = useAppStore((s) => s.addMessage);
  const setError = useAppStore((s) => s.setError);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, streamingContent]);

  const handleSend = async (message?: string, command?: string) => {
    const msg = message || input.trim();
    if (!msg || !session || isStreaming) return;

    setInput('');
    setStreamingContent('');
    setIsStreaming(true);

    // Add user message
    addMessage({ role: 'user', content: msg, timestamp: Date.now() });

    streamChat(
      session.id,
      msg,
      command,
      (content) => appendStreamingContent(content),
      async (updates) => {
        setIsStreaming(false);
        try {
          const updated = await getSession(session.id);
          setSession(updated);
        } catch {}
      },
      (errMsg) => {
        setIsStreaming(false);
        setError(errMsg);
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCommand = (cmd: string) => {
    if (cmd === '/reset') {
      handleSend('推翻重来，重新开始', 'reset');
    } else if (cmd === '/review') {
      handleSend('审阅当前状态', 'review');
    } else if (cmd === '/freeze') {
      handleSend('冻结需求', 'freeze');
    } else if (cmd === '/generate-tech') {
      handleSend('生成技术方案', 'generate-tech');
    } else if (cmd === '/generate-acceptance') {
      handleSend('生成验收标准', 'generate-acceptance');
    } else if (cmd === '/generate-prototype') {
      handleSend('生成页面原型', 'generate-prototype');
    }
  };

  if (!session) return null;

  // Strip doc update blocks from displayed content
  const cleanContent = (content: string) => {
    return content
      .replace(/```(requirement|tech|acceptance|prototype|stage)\n[\s\S]*?```/g, '')
      .trim();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* System message */}
        <div className="flex justify-center">
          <span className="text-xs text-gray-600 bg-gray-900/50 px-3 py-1 rounded-full">
            💡 想法：{session.idea}
          </span>
        </div>

        {session.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Streaming content */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm p-4">
                <div className="markdown-body text-sm">
                  <ReactMarkdown>{cleanContent(streamingContent)}</ReactMarkdown>
                </div>
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm p-4">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Command bar */}
      <div className="px-6 py-2 border-t border-gray-800/50">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { cmd: '/review', label: '👀 审阅' },
            { cmd: '/generate-tech', label: '🏗️ 技术方案' },
            { cmd: '/generate-acceptance', label: '✅ 验收标准' },
            { cmd: '/generate-prototype', label: '🎨 原型' },
            { cmd: '/freeze', label: '🔒 冻结' },
            { cmd: '/reset', label: '🔄 重来' },
          ].map((item) => (
            <button
              key={item.cmd}
              onClick={() => handleCommand(item.cmd)}
              disabled={isStreaming}
              className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'AI 正在思考...' : '输入消息或命令（如 /fix 首页布局不对）'}
            disabled={isStreaming}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-all"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  // Strip doc update blocks
  const content = message.content
    .replace(/```(requirement|tech|acceptance|prototype|stage)\n[\s\S]*?```/g, '')
    .trim();

  if (!content) return null;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0
          ${isUser ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-emerald-600/20 border border-emerald-500/30'}`}
      >
        {isUser ? '👤' : '🤖'}
      </div>
      <div className={`max-w-[70%] min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl p-4 text-left
            ${isUser ? 'bg-blue-600/20 border border-blue-500/20 rounded-tr-sm' : 'bg-gray-900 border border-gray-800 rounded-tl-sm'}`}
        >
          <div className="markdown-body text-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
