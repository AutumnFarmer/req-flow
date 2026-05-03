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
      '/advise': { command: 'advise', message: payload || '请基于当前状态给我决策建议' },
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
    } else if (cmd === '/advise') {
      handleSend('请基于当前状态给我决策建议', 'advise');
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
    <div className="flex min-h-0 h-full flex-col bg-[#080b10]">
      <div className="shrink-0 border-b border-white/10 bg-[#0b0f15] px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">对话</div>
            <div className="mt-0.5 text-[11px] text-gray-600">补充需求、生成方案、运行检查</div>
          </div>
          {session.pendingProposal && (
            <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
              有待应用草案
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
        <div className="flex justify-center">
          <span className="text-xs text-gray-500 bg-white/[0.03] border border-white/10 px-3 py-1 rounded-md">
            想法：{session.originalIdea}
          </span>
        </div>

        <WorkflowCoach
          onCommand={handleCommand}
          onSend={handleSend}
          onSetInput={setInput}
        />

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
      <div className="shrink-0 px-5 py-2 border-t border-white/10 bg-[#0b0f15]">
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
      <div className="shrink-0 px-5 py-3 border-t border-white/10 bg-[#0b0f15]">
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

function WorkflowCoach({
  onCommand,
  onSend,
  onSetInput,
}: {
  onCommand: (cmd: string) => void;
  onSend: (message?: string, command?: string) => void;
  onSetInput: (value: string) => void;
}) {
  const session = useAppStore((s) => s.session);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const setDocTab = useAppStore((s) => s.setDocTab);
  if (!session) return null;

  const openQuestions = session.openQuestions.filter((item) => item.status === 'open').slice(0, 3);
  const blockers = session.qualityReport?.blockers || [];
  const warnings = session.qualityReport?.warnings || [];
  const currentReviews = (session.reviews || []).filter((review) => review.version === session.currentVersion);
  const hasCurrentApproval = currentReviews.some((review) => review.status === 'approved');
  const hasCurrentRejection = currentReviews.some((review) => review.status === 'rejected');

  const steps = [
    { key: 'clarify', label: '澄清', done: !!session.requirement },
    { key: 'acceptance', label: '验收', done: !!session.acceptance },
    { key: 'tech', label: '技术', done: !!session.tech },
    { key: 'prototype', label: '原型', done: !!session.prototype },
    { key: 'review', label: '评审', done: hasCurrentApproval && !hasCurrentRejection },
    { key: 'quality', label: '质量', done: !!session.qualityReport && blockers.length === 0 },
  ];

  const actions: Array<{ label: string; description: string; run: () => void; tone?: 'primary' | 'secondary' }> = [];
  let title = '下一步';
  let description = '按受控循环推进：先生成提案，确认后再进入正式文档和快照。';

  if (isStreaming) {
    title = '正在分析';
    description = 'AI 正在生成结构化提案或检查结果，完成后再确认下一步。';
  } else if (session.pendingProposal) {
    title = '等待确认提案';
    description = '先审阅右侧草案和影响范围，接受后才会写入正式文档并保存快照。';
    actions.push({
      label: '接受提案',
      description: session.pendingProposal.summary,
      run: () => onCommand('/accept'),
      tone: 'primary',
    });
    actions.push({
      label: '继续补充',
      description: '输入反馈，让 AI 重新生成更准确的提案',
      run: () => onSetInput('请基于当前草案继续调整：'),
      tone: 'secondary',
    });
  } else if (!session.requirement) {
    title = '生成第一版需求拆分';
    description = '把一句话想法拆成用户、场景、范围、功能、规则和待确认问题。';
    actions.push({
      label: '生成需求草案',
      description: '形成需求宪法和第一版需求文档提案',
      run: () => onSend(`请基于这个想法生成第一版需求草案：${session.originalIdea}`, 'idea'),
      tone: 'primary',
    });
  } else if (openQuestions.length > 0 && session.stage === 'clarify') {
    title = '补齐澄清信息';
    description = '先回答高影响问题，能显著提升后续需求拆分质量。';
    actions.push({
      label: '回答问题',
      description: openQuestions[0].question,
      run: () => onSetInput(`回答这些待确认问题：\n${openQuestions.map((item, index) => `${index + 1}. ${item.question}`).join('\n')}\n\n我的回答：`),
      tone: 'primary',
    });
    actions.push({
      label: '运行审阅',
      description: '检查当前需求是否足够进入下一阶段',
      run: () => onCommand('/review'),
      tone: 'secondary',
    });
  } else if (!session.acceptance || !session.taskPlan) {
    title = '生成验收和任务拆解';
    description = '把 P0/P1 功能转成 Given/When/Then 用例，并拆成可开发任务。';
    actions.push({
      label: '生成验收标准',
      description: '同时生成任务拆解，建立需求到交付的追溯链',
      run: () => onCommand('/generate-acceptance'),
      tone: 'primary',
    });
  } else if (!session.tech) {
    title = '生成技术方案';
    description = '补齐架构、模块、数据模型、API 和技术风险，便于研发评审。';
    actions.push({
      label: '生成技术方案',
      description: '形成可交付给开发团队的技术草案',
      run: () => onCommand('/generate-tech'),
      tone: 'primary',
    });
  } else if (!session.prototype) {
    title = '检查追溯链路';
    description = '先看追溯矩阵，确认功能是否都有验收、任务和技术线索，再生成原型校准体验。';
    actions.push({
      label: '查看追溯矩阵',
      description: '检查功能、验收、任务和技术方案是否断链',
      run: () => setDocTab('traceability'),
      tone: 'primary',
    });
    actions.push({
      label: '生成原型',
      description: '基于当前需求生成可预览 HTML 原型',
      run: () => onCommand('/generate-prototype'),
      tone: 'secondary',
    });
  } else if (!hasCurrentApproval || hasCurrentRejection) {
    title = hasCurrentRejection ? '处理评审打回' : '提交当前版本评审';
    description = hasCurrentRejection
      ? '当前版本已有打回记录，需要先按意见修改，再重新提交评审。'
      : '冻结前需要当前版本评审通过，避免未经业务确认的规格包进入交付。';
    actions.push({
      label: '查看评审签核',
      description: '提交通过或打回意见，并写入审计记录',
      run: () => setDocTab('review'),
      tone: 'primary',
    });
    actions.push({
      label: '运行质量检查',
      description: '确认冻结前还有哪些阻断项',
      run: () => onCommand('/quality'),
      tone: 'secondary',
    });
  } else if (blockers.length > 0 || warnings.length > 0) {
    title = blockers.length > 0 ? '处理质量阻断项' : '处理质量提醒';
    description = blockers[0] || warnings[0] || '运行质量检查，确认是否可以冻结。';
    actions.push({
      label: '运行质量检查',
      description: '刷新完整性、一致性、可测试性和冻结条件',
      run: () => onCommand('/quality'),
      tone: 'primary',
    });
    actions.push({
      label: '让 AI 修正',
      description: '基于质量问题生成修正提案',
      run: () => onSetInput(`请根据质量检查结果修正需求资产：\n${[...blockers, ...warnings].join('\n')}`),
      tone: 'secondary',
    });
  } else if (session.stage !== 'frozen') {
    title = '可以冻结规格包';
    description = '核心文档已具备，冻结前会再次运行质量体检并生成确认提案。';
    actions.push({
      label: '冻结规格包',
      description: '锁定当前需求、验收、技术方案和任务拆解',
      run: () => onCommand('/freeze'),
      tone: 'primary',
    });
  } else {
    title = '规格包已冻结';
    description = '当前版本已可交付。后续可以导出、回滚或复制会话继续迭代。';
    actions.push({
      label: '继续迭代',
      description: '提出新反馈，系统会先生成变更提案',
      run: () => onSetInput('基于已冻结规格包，我想调整：'),
      tone: 'secondary',
    });
  }

  return (
    <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">流程教练</div>
          <h2 className="mt-1 text-sm font-semibold text-gray-100">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
        </div>
        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-gray-400">
          v{session.currentVersion}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {steps.map((step) => (
          <div key={step.key} className={`h-1.5 rounded-full ${step.done ? 'bg-cyan-300' : 'bg-white/10'}`} title={step.label} />
        ))}
      </div>
      <div className="mt-1 grid grid-cols-6 gap-1.5 text-[10px] text-gray-600">
        {steps.map((step) => (
          <span key={step.key} className={step.done ? 'text-cyan-300/70' : ''}>{step.label}</span>
        ))}
      </div>

      {openQuestions.length > 0 && (
        <div className="mt-3 rounded-md border border-white/10 bg-[#080b10]/60 p-3">
          <div className="mb-2 text-[11px] font-medium text-gray-400">待确认问题</div>
          <div className="space-y-1.5">
            {openQuestions.map((item) => (
              <button
                key={item.id}
                onClick={() => onSetInput(`关于“${item.question}”，我的回答是：`)}
                className="block w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1.5 text-left text-[11px] leading-4 text-gray-500 hover:border-cyan-400/30 hover:text-gray-300"
              >
                {item.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-3 grid gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.run}
              disabled={isStreaming}
              className={`rounded-md border px-3 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                action.tone === 'primary'
                  ? 'border-cyan-400/30 bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-cyan-400/30'
              }`}
            >
              <div className="text-xs font-semibold">{action.label}</div>
              <div className={`mt-0.5 text-[11px] leading-4 ${action.tone === 'primary' ? 'text-slate-800/80' : 'text-gray-500'}`}>
                {action.description}
              </div>
            </button>
          ))}
        </div>
      )}

      <DecisionAssist
        onCommand={onCommand}
        onSend={onSend}
        onSetInput={onSetInput}
      />
    </div>
  );
}

function DecisionAssist({
  onCommand,
  onSend,
  onSetInput,
}: {
  onCommand: (cmd: string) => void;
  onSend: (message?: string, command?: string) => void;
  onSetInput: (value: string) => void;
}) {
  const session = useAppStore((s) => s.session);
  const isStreaming = useAppStore((s) => s.isStreaming);
  if (!session || isStreaming) return null;

  const options = buildDecisionOptions(session, onCommand, onSend, onSetInput);
  if (options.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-[#080b10]/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold text-cyan-300">AI 决策辅助</div>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">
            不确定怎么选时，可以让 AI 给出默认建议、取舍说明或保守方案。
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={option.run}
            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-cyan-400/30 hover:bg-white/[0.05] transition-all"
          >
            <div className="text-xs font-semibold text-gray-200">{option.label}</div>
            <div className="mt-0.5 text-[11px] leading-4 text-gray-500">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function buildDecisionOptions(
  session: NonNullable<ReturnType<typeof useAppStore.getState>['session']>,
  onCommand: (cmd: string) => void,
  onSend: (message?: string, command?: string) => void,
  onSetInput: (value: string) => void,
) {
  const options: Array<{ label: string; description: string; run: () => void }> = [];

  if (session.pendingProposal) {
    options.push({
      label: '让 AI 解释为什么推荐这个提案',
      description: '适合不确定是否该接受时，先看收益、风险和可逆性',
      run: () => onSend(`我不确定是否应该接受这个提案。请用非技术人员能理解的方式说明：\n1. 这个提案解决什么问题\n2. 接受它的收益\n3. 可能的风险\n4. 如果不接受会怎样\n5. 你的默认建议`, 'advise'),
    });
    options.push({
      label: '让 AI 给出更保守版本',
      description: '减少范围和复杂度，适合第一版先跑通',
      run: () => onSend('我没有足够产品经验，请把当前提案改成更保守、更容易落地的第一版方案，并说明删减取舍。', 'fix'),
    });
    options.push({
      label: '接受 AI 推荐',
      description: '如果你信任当前提案，可以直接进入正式文档和快照',
      run: () => onCommand('/accept'),
    });
    return options;
  }

  if (!session.requirement) {
    options.push({
      label: '让 AI 先替我定默认方向',
      description: '不用先懂产品方法，AI 会选一个保守可落地的第一版定位',
      run: () => onSend(`我没有明确的产品判断能力。请基于这个想法“${session.originalIdea}”，替我推荐一个默认第一版方向，并生成可确认的需求草案。要求说明目标用户、核心场景、第一版不做什么。`, 'idea'),
    });
    options.push({
      label: '我只知道大概想法',
      description: '让 AI 先问最少的问题，不要求你一次说完整',
      run: () => onSend('我只知道大概方向，请你只问我 3 个最关键的问题，其他先用合理默认假设推进。', 'advise'),
    });
    return options;
  }

  const openQuestions = session.openQuestions.filter((item) => item.status === 'open');
  const assumptions = session.requirement.assumptions || [];
  if (openQuestions.length > 0) {
    options.push({
      label: '让 AI 推荐问题答案',
      description: 'AI 会给出 2-3 个选择，并标注推荐项和取舍',
      run: () => onSend(`我不确定这些问题怎么回答。请针对下面每个问题给出 2-3 个可选答案，标注推荐项、适用场景和取舍：\n${openQuestions.map((item, index) => `${index + 1}. ${item.question}`).join('\n')}`, 'advise'),
    });
    options.push({
      label: '采用保守默认假设',
      description: '适合先进入第一版规格，后续再修正',
      run: () => onSend(`我没有足够信息回答待确认问题。请基于保守默认假设推进：优先小范围、低复杂度、可验证的第一版，并把关键假设写进需求文档。待确认问题：${openQuestions.map((item) => item.question).join('；')}`, 'fix'),
    });
    return options;
  }

  if (assumptions.length > 0 && (!session.acceptance || !session.taskPlan)) {
    options.push({
      label: '让 AI 检查关键假设',
      description: '识别哪些默认假设最危险，哪些可以先接受',
      run: () => onSend(`我没有足够产品或架构经验，请检查当前需求里的关键假设。请把它们分成“可以先接受 / 需要尽快验证 / 不建议默认接受”，并给出每项的验证办法和你的默认建议：\n${assumptions.map((item, index) => `${index + 1}. ${item}`).join('\n')}`, 'advise'),
    });
    options.push({
      label: '让 AI 按假设生成验证任务',
      description: '把高风险假设转成访谈、原型或数据验证动作',
      run: () => onSend(`请基于当前假设生成一个保守的验证计划，并把需要补进需求文档的验证任务写成变更提案。当前假设：${assumptions.join('；')}`, 'fix'),
    });
  }

  if (!session.acceptance || !session.taskPlan) {
    options.push({
      label: '让 AI 按业务可验收来拆',
      description: '不用你懂测试方法，AI 会把功能转成可验证结果',
      run: () => onCommand('/generate-acceptance'),
    });
    options.push({
      label: '先解释验收标准是什么',
      description: '用非技术语言说明 Given/When/Then 和任务拆分',
      run: () => onSend('我不懂验收标准和任务拆解。请先用简单例子解释它们是什么，以及为什么要在开发前生成。', 'advise'),
    });
    return options;
  }

  if (!session.tech) {
    options.push({
      label: '让 AI 推荐稳妥技术方案',
      description: '默认选择低风险、常见、易维护的架构，不要求你会架构设计',
      run: () => onSend('我没有架构能力。请基于当前需求推荐稳妥、低风险、容易维护的技术方案，并说明为什么不选更复杂方案。', 'generate-tech'),
    });
    options.push({
      label: '让 AI 对比技术取舍',
      description: '输出简单版、标准版、扩展版三种方案的成本和风险',
      run: () => onSend('请把技术方案按简单版、标准版、扩展版三种方案做对比，说明成本、风险、适用阶段，并给出默认推荐。', 'advise'),
    });
    return options;
  }

  const blockers = session.qualityReport?.blockers || [];
  const warnings = session.qualityReport?.warnings || [];
  if (blockers.length > 0 || warnings.length > 0) {
    options.push({
      label: '让 AI 排优先级',
      description: '把质量问题按必须修、建议修、可暂缓拆开',
      run: () => onSend(`我不确定这些质量问题怎么处理。请按“必须修 / 建议修 / 可暂缓”排序，并给出默认处理方案：\n${[...blockers, ...warnings].join('\n')}`, 'advise'),
    });
    options.push({
      label: '让 AI 直接生成修复提案',
      description: '基于质量检查结果更新需求资产',
      run: () => onSend(`请直接根据质量检查结果生成修复提案：\n${[...blockers, ...warnings].join('\n')}`, 'fix'),
    });
    return options;
  }

  if (session.stage !== 'frozen') {
    options.push({
      label: '让 AI 做冻结前决策说明',
      description: '确认现在是否足够进入开发，以及还缺什么',
      run: () => onSend('我不确定现在是否可以冻结。请用非专业语言判断当前规格包是否足够进入开发，说明还缺什么、风险是什么、你的默认建议。', 'advise'),
    });
  }

  return options;
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
