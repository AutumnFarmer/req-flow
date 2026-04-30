import type { RequirementDoc } from '../types';

export default function RequirementView({ doc }: { doc: RequirementDoc }) {
  return (
    <div className="p-5 space-y-5">
      {/* Product Definition */}
      <Section title="产品定义" icon="🎯">
        <DefRow label="一句话描述" value={doc.productDef.description} />
        <DefRow label="目标用户" value={doc.productDef.targetUsers} />
        <DefRow label="核心价值" value={doc.productDef.coreValue} />
      </Section>

      {/* Features */}
      <Section title="功能清单" icon="📋">
        <div className="space-y-2">
          {doc.features.map((f, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <PriorityBadge priority={f.priority} />
                <span className="font-medium text-gray-200 text-sm">{f.name}</span>
              </div>
              <p className="text-gray-400 text-xs ml-12">{f.description}</p>
              {f.notes && (
                <p className="text-gray-500 text-xs ml-12 mt-1 italic">{f.notes}</p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Excluded */}
      {doc.excluded.length > 0 && (
        <Section title="明确不做" icon="🚫">
          <div className="flex flex-wrap gap-2">
            {doc.excluded.map((item, i) => (
              <span key={i} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full">
                {item}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Rules */}
      {doc.rules.length > 0 && (
        <Section title="关键规则" icon="📏">
          <ul className="space-y-1.5">
            {doc.rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="text-gray-600 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Pending Questions */}
      {doc.pendingQuestions.length > 0 && (
        <Section title="待确认项" icon="❓">
          <ul className="space-y-1.5">
            {doc.pendingQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-400/70">
                <span className="mt-0.5">?</span>
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function DefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs text-gray-500 shrink-0 w-20 text-right">{label}</span>
      <span className="text-sm text-gray-300">{value || '-'}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P0: 'bg-red-500/20 text-red-400 border-red-500/30',
    P1: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    P2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${colors[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {priority}
    </span>
  );
}
