import { useAppStore } from '../store';
import StageIndicator from './StageIndicator';
import ChatPanel from './ChatPanel';
import DocPreview from './DocPreview';
import ProposalDrawer from './ProposalDrawer';
import VersionHistory from './VersionHistory';

export default function Workspace() {
  const session = useAppStore((s) => s.session);

  if (!session) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080b10] text-gray-100">
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
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400">
            质量 {session.qualityReport?.score ?? 0}
          </span>
          <StageIndicator />
          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-400">
            v{session.currentVersion}
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[280px] border-r border-white/10 bg-[#0b0f15] overflow-y-auto shrink-0">
          <VersionHistory />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <ProposalDrawer />
          <ChatPanel />
        </div>

        <div className="w-[520px] border-l border-white/10 bg-[#0b0f15] shrink-0">
          <DocPreview />
        </div>
      </div>
    </div>
  );
}
