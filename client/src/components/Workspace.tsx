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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">Req</span>
          <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            ReqFlow v1.0
          </h1>
          <span className="text-gray-600">|</span>
          <span className="text-sm text-gray-400 max-w-xs truncate">{session.originalIdea}</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-gray-500">质量 {session.qualityReport?.score ?? 0}</span>
          <StageIndicator />
          <span className="text-xs text-gray-500">v{session.currentVersion}</span>
        </div>
      </header>

      {/* Main Content - Three Column */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Version History */}
        <div className="w-56 border-r border-gray-800 overflow-y-auto shrink-0">
          <VersionHistory />
        </div>

        {/* Center: Proposal + Chat */}
        <div className="flex-1 min-w-0 flex flex-col">
          <ProposalDrawer />
          <ChatPanel />
        </div>

        {/* Right: Doc Preview */}
        <div className="w-[480px] border-l border-gray-800 shrink-0">
          <DocPreview />
        </div>
      </div>
    </div>
  );
}
