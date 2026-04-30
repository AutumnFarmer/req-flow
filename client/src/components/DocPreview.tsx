import { useEffect, useMemo, useRef, useState } from 'react';
import { acceptProposal, DOC_TAB_LABELS, generatePrototype } from '../api';
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
  const contentRef = useRef<HTMLDivElement>(null);

  if (!session) return null;

  const proposedDocs = session.pendingProposal?.proposedDocuments;
  const getDoc = (tab: DocTab) => {
    switch (tab) {
      case 'constitution': return proposedDocs?.constitution || session.constitution;
      case 'requirement': return proposedDocs?.requirement || session.requirement;
      case 'tech': return proposedDocs?.tech || session.tech;
      case 'acceptance': return proposedDocs?.acceptance || session.acceptance;
      case 'prototype': return proposedDocs?.prototype || session.prototype;
      case 'taskPlan': return proposedDocs?.taskPlan || session.taskPlan;
    }
  };

  const isDraftTab = (tab: DocTab) => {
    switch (tab) {
      case 'constitution': return !!proposedDocs?.constitution;
      case 'requirement': return !!proposedDocs?.requirement;
      case 'tech': return !!proposedDocs?.tech;
      case 'acceptance': return !!proposedDocs?.acceptance;
      case 'prototype': return !!proposedDocs?.prototype;
      case 'taskPlan': return !!proposedDocs?.taskPlan;
    }
  };

  const hasContent = (tab: DocTab) => {
    const doc = getDoc(tab);
    return tab === 'prototype' ? !!doc && 'html' in doc && !!doc.html : !!doc;
  };

  const tabs = useMemo<DocTab[]>(() => {
    const generated: DocTab[] = ['constitution'];
    const candidates: DocTab[] = ['requirement', 'tech', 'acceptance', 'prototype', 'taskPlan'];
    candidates.forEach((tab) => {
      if (hasContent(tab)) generated.push(tab);
    });
    return generated;
  }, [session]);

  const activeTab = tabs.includes(docTab) ? docTab : tabs[0];
  const activeIsDraft = isDraftTab(activeTab);
  const activeLabel = DOC_TAB_LABELS[activeTab];

  useEffect(() => {
    if (!tabs.includes(docTab)) {
      setDocTab(tabs[0]);
    }
  }, [docTab, setDocTab, tabs]);

  useEffect(() => {
    const proposal = session.pendingProposal;
    if (!proposal) return;

    const preferred = (['requirement', 'tech', 'acceptance', 'taskPlan', 'prototype', 'constitution'] as DocTab[])
      .find((tab) => proposal.impactTargets.includes(tab) && tabs.includes(tab));
    if (preferred && docTab !== preferred) {
      setDocTab(preferred);
    }
  }, [session.pendingProposal?.id]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab, session.pendingProposal?.id, session.currentVersion]);

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

  const handleAcceptProposal = async () => {
    if (!session.pendingProposal) return;
    try {
      const updated = await acceptProposal(session.id, session.pendingProposal.id);
      setSession(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderContent = () => {
    const doc = getDoc(activeTab);
    switch (activeTab) {
      case 'constitution':
        return doc ? <ConstitutionView doc={doc as any} /> : null;
      case 'requirement':
        return doc ? <RequirementView doc={doc as any} /> : null;
      case 'tech':
        return doc ? <TechView doc={doc as any} /> : null;
      case 'acceptance':
        return doc ? <AcceptanceView doc={doc as any} /> : null;
      case 'prototype':
        return doc && 'html' in doc && doc.html ? (
          <PrototypeView html={doc.html} pages={doc.pages} />
        ) : (
          <EmptyState
            text={session.requirement ? '基于当前需求生成 sandbox 原型' : '需要先接受需求文档提案'}
            action={session.requirement ? { label: loadingPrototype ? '生成中...' : '生成原型', onClick: handleGeneratePrototype } : undefined}
          />
        );
      case 'taskPlan':
        return doc ? <TaskPlanView doc={doc as any} /> : null;
    }
  };

  return (
    <div className="flex min-h-0 h-full flex-col bg-[#0b0f15]">
      <div className="flex gap-1 p-2 border-b border-white/10 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setDocTab(tab)}
            className={`px-3 py-2 text-xs font-medium transition-all relative rounded-md border whitespace-nowrap
              ${activeTab === tab ? 'text-cyan-100 bg-cyan-400/15 border-cyan-300/40 shadow-[inset_0_-2px_0_rgba(103,232,249,0.9)]' : 'text-gray-500 hover:text-gray-300 border-transparent hover:bg-white/[0.03]'}
            `}
          >
            <span>{DOC_TAB_LABELS[tab]}</span>
            {isDraftTab(tab) ? (
              <span className="ml-1.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-200">草案</span>
            ) : (
              hasContent(tab) && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-cyan-300 inline-block" />
            )}
          </button>
        ))}
      </div>
      {activeIsDraft && session.pendingProposal && (
        <div className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-amber-200">正在预览：{activeLabel}草案</div>
              <p className="mt-1 text-[11px] leading-4 text-amber-100/70">
                这是待确认提案里的内容。接受提案后，它才会进入版本快照并成为正式文档。
              </p>
            </div>
            <button
              onClick={handleAcceptProposal}
              className="shrink-0 rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-200 transition-colors"
            >
              应用当前草案
            </button>
          </div>
        </div>
      )}
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{renderContent()}</div>
    </div>
  );
}

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="h-10 w-10 mb-4 rounded-md border border-white/10 bg-white/[0.03]" />
      <p className="text-gray-500 text-sm mb-4">{text}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold rounded-md transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
