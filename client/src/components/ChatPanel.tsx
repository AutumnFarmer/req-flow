import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../store';
import { acceptProposal, generatePrototype, getSession, rejectProposal, streamChat } from '../api';
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

  const runDirectCommand = (cmd: string) => {
    if (!session) return true;
    if (cmd === '/accept') {
      if (!session.pendingProposal) return true;
      acceptProposal(session.id, session.pendingProposal.id)
        .then(setSession)
        .catch((err) => setError(err.message));
      return true;
    }
    if (cmd === '/reject') {
      if (!session.pendingProposal) return true;
      rejectProposal(session.id, session.pendingProposal.id)
        .then(setSession)
        .catch((err) => setError(err.message));
      return true;
    }
    if (cmd === '/generate-prototype') {
      generatePrototype(session.id)
        .then(setSession)
        .catch((err) => setError(err.message));
      return true;
    }
    return false;
  };

  const parseSlashCommand = (raw: string) => {
    if (!raw.startsWith('/')) return null;
    const [cmd, ...rest] = raw.split(/\s+/);
    const payload = rest.join(' ').trim();
    const mapping: Record<string, { command: string; message: string }> = {
      '/reset': { command: 'reset', message: payload || '推翻重来，重新开始' },
      '/review': { command: 'review', message: payload || '审阅当前状态' },
      '/quality': { command: 'quality', message: payload || '运行质量检查' },
      '/freeze': { command: 'freeze', message: payload || '冻结需求' },
      '/generate-tech': { command: 'generate-tech', message: payload || '生成技术方案' },
      '/generate-acceptance': { command: 'generate-acceptance', message: payload || '生成验收标准' },
      '/fix': { command: 'fix', message: payload || '微调当前需求' },
      '/idea': { command: 'idea', message: payload || '补充一个新想法' },
    };
    return mapping[cmd] || null;
  };

  const handleSend = async (message?: string, command?: string) => {
    let msg = message || input.trim();
    if (!msg || !session || isStreaming) return;

    if (!command && msg.startsWith('/')) {
      const directCmd = msg.split(/\s+/)[0];
      if (runDirectCommand(directCmd)) {
        setInput('');
        return;
      }
      const parsed = parseSlashCommand(msg);
      if (parsed) {
        msg = parsed.message;
        command = parsed.command;
      }
    }

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
    if (!session) return;
    if (runDirectCommand(cmd)) return;
    if (cmd === '/reset') {
      handleSend('推翻重来，重新开始', 'reset');
    } else if (cmd === '/review') {
      handleSend('审阅当前状态', 'review');
    } else if (cmd === '/quality') {
      handleSend('运行质量检查', 'quality');
    } else if (cmd === '/freeze') {
      handleSend('冻结需求', 'freeze');
    } else if (cmd === '/generate-tech') {
      handleSend('生成技术方案', 'generate-tech');
    } else if (cmd === '/generate-acceptance') {
      handleSend('生成验收标准', 'generate-acceptance');
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
    <div className="flex flex-col h-full bg-[#080b10]">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div className="flex justify-center">
          <span className="text-xs text-gray-500 bg-white/[0.03] border border-white/10 px-3 py-1 rounded-md">
            想法：{session.originalIdea}
          </span>
        </div>

        {session.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Streaming content */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-md bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-[11px] text-cyan-200 shrink-0">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-[#10151d] border border-white/10 rounded-lg p-4">
                <div className="markdown-body text-[13px] leading-5">
                  <ReactMarkdown>{cleanContent(streamingContent)}</ReactMarkdown>
                </div>
                <span className="inline-block w-1.5 h-4 bg-cyan-300 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-md bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-[11px] text-cyan-200 shrink-0">
              AI
            </div>
            <div className="bg-[#10151d] border border-white/10 rounded-lg p-4">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Command bar */}
      <div className="px-5 py-2 border-t border-white/10 bg-[#0b0f15]">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { cmd: '/review', label: '审阅' },
            { cmd: '/quality', label: '质量' },
            { cmd: '/generate-tech', label: '技术方案' },
            { cmd: '/generate-acceptance', label: '验收标准' },
            { cmd: '/generate-prototype', label: '原型' },
            { cmd: '/freeze', label: '冻结' },
            { cmd: '/reset', label: '重来' },
          ].map((item) => (
            <button
              key={item.cmd}
              onClick={() => handleCommand(item.cmd)}
              disabled={isStreaming}
              className="px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-md text-xs text-gray-400 hover:text-gray-100 hover:border-cyan-400/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-5 py-3 border-t border-white/10 bg-[#0b0f15]">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? '正在生成...' : '输入反馈或命令，例如 /generate-tech、/fix 首页太复杂'}
            disabled={isStreaming}
            className="flex-1 bg-[#080b10] border border-white/10 rounded-md px-3.5 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 disabled:text-gray-500 text-slate-950 rounded-md text-sm font-semibold transition-all"
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
        className={`w-8 h-8 rounded-md flex items-center justify-center text-[11px] shrink-0 border
          ${isUser ? 'bg-sky-400/10 border-sky-400/30 text-sky-200' : 'bg-cyan-400/10 border-cyan-400/30 text-cyan-200'}`}
      >
        {isUser ? '你' : 'AI'}
      </div>
      <div className={`max-w-[88%] min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-lg p-4 text-left shadow-sm
            ${isUser ? 'bg-sky-400/10 border border-sky-400/20' : 'bg-[#10151d] border border-white/10'}`}
        >
          <div className="markdown-body text-[13px] leading-5">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
