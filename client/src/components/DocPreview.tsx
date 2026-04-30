import { useState } from 'react';
import { DOC_TAB_LABELS, generatePrototype } from '../api';
import { useAppStore } from '../store';
import type { DocTab } from '../types';
import AcceptanceView from './AcceptanceView';
import ConstitutionView from './ConstitutionView';
import PrototypeView from './PrototypeView';
import RequirementView from './RequirementView';
import TaskPlanView from './TaskPlanView';
import TechView from './TechView';

export default function DocPreview() {
  const session = useAppStore((s) => s.session);
  const docTab = useAppStore((s) => s.docTab);
  const setDocTab = useAppStore((s) => s.setDocTab);
  const setSession = useAppStore((s) => s.setSession);
  const setError = useAppStore((s) => s.setError);
  const [loadingPrototype, setLoadingPrototype] = useState(false);

  if (!session) return null;

  const tabs: DocTab[] = ['constitution', 'requirement', 'tech', 'acceptance', 'prototype', 'taskPlan'];

  const hasContent = (tab: DocTab) => {
    switch (tab) {
      case 'constitution': return !!session.constitution;
      case 'requirement': return !!session.requirement;
      case 'tech': return !!session.tech;
      case 'acceptance': return !!session.acceptance;
      case 'prototype': return !!session.prototype?.html;
      case 'taskPlan': return !!session.taskPlan;
    }
  };

  const handleGeneratePrototype = async () => {
    if (loadingPrototype) return;
    setLoadingPrototype(true);
    try {
      const updated = await generatePrototype(session.id);
      setSession(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPrototype(false);
    }
  };

  const renderContent = () => {
    switch (docTab) {
      case 'constitution':
        return <ConstitutionView doc={session.constitution} />;
      case 'requirement':
        return session.requirement ? <RequirementView doc={session.requirement} /> : <EmptyState text="接受需求提案后生成正式需求文档" />;
      case 'tech':
        return session.tech ? <TechView doc={session.tech} /> : <EmptyState text="使用 /generate-tech 生成技术方案提案" />;
      case 'acceptance':
        return session.acceptance ? <AcceptanceView doc={session.acceptance} /> : <EmptyState text="使用 /generate-acceptance 生成验收标准提案" />;
      case 'prototype':
        return session.prototype?.html ? (
          <PrototypeView html={session.prototype.html} pages={session.prototype.pages} />
        ) : (
          <EmptyState
            text={session.requirement ? '基于当前需求生成 sandbox 原型' : '需要先接受需求文档提案'}
            action={session.requirement ? { label: loadingPrototype ? '生成中...' : '生成原型', onClick: handleGeneratePrototype } : undefined}
          />
        );
      case 'taskPlan':
        return session.taskPlan ? <TaskPlanView doc={session.taskPlan} /> : <EmptyState text="生成验收标准或冻结时会形成任务拆解" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 border-b border-gray-800 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setDocTab(tab)}
            className={`px-3 py-3 text-xs font-medium transition-all relative
              ${docTab === tab ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            <span>{DOC_TAB_LABELS[tab]}</span>
            {hasContent(tab) && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
            {docTab === tab && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-400 rounded-full" />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-4xl mb-4 opacity-30">□</div>
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
