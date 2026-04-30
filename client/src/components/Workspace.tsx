import { useState } from 'react';
import { acceptProposal } from '../api';
import { useAppStore } from '../store';
import StageIndicator from './StageIndicator';
import ChatPanel from './ChatPanel';
import DocPreview from './DocPreview';
import ProposalDrawer from './ProposalDrawer';

export default function Workspace() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const setError = useAppStore((s) => s.setError);
  const [accepting, setAccepting] = useState(false);

  if (!session) return null;

  const handleAcceptProposal = async () => {
    if (!session.pendingProposal || accepting) return;
    setAccepting(true);
    try {
      const updated = await acceptProposal(session.id, session.pendingProposal.id);
      setSession(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#080b10] text-gray-100">
      <header className="h-14 border-b border-white/10 bg-[#0b0f15] flex items-center px-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 flex items-center justify-center text-xs font-semibold">
            RF
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-gray-100">ReqFlow v1.0</h1>
            <p className="text-[11px] text-gray-500">Controlled requirement loop</p>
          </div>
          <span className="h-5 w-px bg-white/10" />
          <span className="text-sm text-gray-400 max-w-xs truncate">{session.originalIdea}</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {session.pendingProposal && (
            <button
              onClick={handleAcceptProposal}
              disabled={accepting}
              className="rounded-md bg-amber-300 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_0_24px_rgba(251,191,36,0.16)] hover:bg-amber-200 disabled:opacity-60 disabled:cursor-wait transition-colors"
            >
              {accepting ? '应用中...' : '应用草案'}
            </button>
          )}
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400">
            质量 {session.qualityReport?.score ?? 0}
          </span>
          <StageIndicator />
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400">
            v{session.currentVersion}
          </span>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[minmax(520px,44%)_minmax(0,1fr)] overflow-hidden max-xl:grid-cols-[minmax(480px,46%)_minmax(0,1fr)] max-lg:flex max-lg:flex-col">
        <div className="min-w-0 min-h-0 flex flex-col border-r border-white/10 max-lg:min-h-[42vh] max-lg:border-r-0 max-lg:border-b">
          <ProposalDrawer />
          <ChatPanel />
        </div>

        <div className="min-w-0 min-h-0 bg-[#0b0f15]">
          <DocPreview />
        </div>
      </div>
    </div>
  );
}
