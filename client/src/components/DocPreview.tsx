import { useState } from 'react';
import { useAppStore } from '../store';
import { DOC_TAB_LABELS, generatePrototype } from '../api';
import type { DocTab } from '../types';
import RequirementView from './RequirementView';
import TechView from './TechView';
import AcceptanceView from './AcceptanceView';
import PrototypeView from './PrototypeView';

export default function DocPreview() {
  const session = useAppStore((s) => s.session);
  const docTab = useAppStore((s) => s.docTab);
  const setDocTab = useAppStore((s) => s.setDocTab);
  const setSession = useAppStore((s) => s.setSession);
  const isStreaming = useAppStore((s) => s.isStreaming);

  const [loadingPrototype, setLoadingPrototype] = useState(false);

  if (!session) return null;

  const tabs: DocTab[] = ['requirement', 'tech', 'acceptance', 'prototype'];

  const hasContent = (tab: DocTab) => {
    switch (tab) {
      case 'requirement': return !!session.requirement;
      case 'tech': return !!session.tech;
      case 'acceptance': return !!session.acceptance;
      case 'prototype': return !!session.prototype?.html;
    }
  };

  const handleGeneratePrototype = async () => {
    if (!session || loadingPrototype) return;
    setLoadingPrototype(true);
    try {
      const { html } = await generatePrototype(session.id);
      const updated = await import('../api').then((m) => m.getSession(session.id));
      setSession(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingPrototype(false);
    }
  };

  const renderContent = () => {
    switch (docTab) {
      case 'requirement':
        return session.requirement ? (
          <RequirementView doc={session.requirement} />
        ) : (
          <EmptyState text="需求文档将在对话中自动生成" />
        );
      case 'tech':
        return session.tech ? (
          <TechView doc={session.tech} />
        ) : (
          <EmptyState
            text="点击下方「🏗️ 技术方案」按钮生成"
            action={session.requirement ? { label: '立即生成', onClick: () => {} } : undefined}
          />
        );
      case 'acceptance':
        return session.acceptance ? (
          <AcceptanceView doc={session.acceptance} />
        ) : (
          <EmptyState text="点击下方「✅ 验收标准」按钮生成" />
        );
      case 'prototype':
        return session.prototype?.html ? (
          <PrototypeView html={session.prototype.html} pages={session.prototype.pages} />
        ) : (
          <EmptyState
            text={session.requirement ? '点击下方按钮生成 HTML 原型' : '需要先生成需求文档'}
            action={
              session.requirement
                ? { label: loadingPrototype ? '生成中...' : '🎨 生成原型', onClick: handleGeneratePrototype }
                : undefined
            }
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-800 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setDocTab(tab)}
            className={`flex-1 px-3 py-3 text-xs font-medium transition-all relative
              ${docTab === tab ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            <span>{DOC_TAB_LABELS[tab]}</span>
            {hasContent(tab) && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
            {docTab === tab && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-4xl mb-4 opacity-30">📄</div>
      <p className="text-gray-500 text-sm mb-4">{text}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
