import { acceptProposal, rejectProposal } from '../api';
import { useAppStore } from '../store';
import type { ImpactTarget } from '../types';

const TARGET_LABELS: Record<ImpactTarget, string> = {
  constitution: '需求宪法',
  requirement: '需求文档',
  tech: '技术方案',
  acceptance: '验收标准',
  prototype: '原型',
  taskPlan: '任务拆解',
};

export default function ProposalDrawer() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const setError = useAppStore((s) => s.setError);
  if (!session?.pendingProposal) return null;

  const proposal = session.pendingProposal;

  const handleAccept = async () => {
    try {
      const updated = await acceptProposal(session.id, proposal.id);
      setSession(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async () => {
    try {
      const updated = await rejectProposal(session.id, proposal.id);
      setSession(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <aside className="border-b border-emerald-500/20 bg-emerald-950/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-emerald-300 mb-1">待确认提案</div>
          <h2 className="text-sm font-semibold text-gray-100">{proposal.summary}</h2>
          <p className="text-xs text-gray-400 mt-1">{proposal.reason}</p>
        </div>
        <span className="px-2 py-0.5 rounded bg-gray-900 text-[10px] text-gray-400 border border-gray-800">
          {proposal.impactLevel}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {proposal.impactTargets.map((target) => (
          <span key={target} className="px-2 py-1 rounded bg-gray-900/80 text-[10px] text-emerald-300 border border-emerald-500/20">
            {TARGET_LABELS[target]}
          </span>
        ))}
      </div>

      {proposal.conflicts.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-200">
          {proposal.conflicts.join('；')}
        </div>
      )}

      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
        {proposal.proposedChanges.map((change, index) => (
          <div key={index} className="rounded-lg bg-gray-950/60 border border-gray-800 p-2">
            <div className="text-xs text-gray-300 mb-1">{TARGET_LABELS[change.target]}</div>
            <div className="text-[11px] text-gray-500">{change.reason}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleAccept}
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all"
        >
          接受提案
        </button>
        <button
          onClick={handleReject}
          className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs border border-gray-700 transition-all"
        >
          拒绝
        </button>
      </div>
    </aside>
  );
}
