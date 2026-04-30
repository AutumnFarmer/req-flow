import { useAppStore } from '../store';
import { STAGE_LABELS, STAGE_COLORS } from '../api';
import type { Stage } from '../types';

const STAGES: Stage[] = ['clarify', 'draft', 'review', 'frozen'];
const STAGE_ICONS: Record<Stage, string> = {
  clarify: '🔍',
  draft: '📝',
  review: '👀',
  frozen: '✅',
};

export default function StageIndicator() {
  const session = useAppStore((s) => s.session);
  if (!session) return null;

  const currentIndex = STAGES.indexOf(session.stage);

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const isActive = stage === session.stage;
        const isPast = i < currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={stage} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all
                ${isActive ? STAGE_COLORS[stage] + ' bg-gray-800 border border-gray-700' : ''}
                ${isPast ? 'text-gray-500' : ''}
                ${isFuture ? 'text-gray-600' : ''}
              `}
            >
              <span>{isPast ? '✓' : STAGE_ICONS[stage]}</span>
              <span>{STAGE_LABELS[stage]}</span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`w-4 h-px ${isPast ? 'bg-gray-600' : 'bg-gray-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
