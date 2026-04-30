import type { RequirementDoc } from '../types';

export default function RequirementView({ doc }: { doc: RequirementDoc }) {
  return (
    <div className="p-5 space-y-5">
      <Section title="概述">
        <DefRow label="背景" value={doc.overview.background} />
        <DefRow label="问题" value={doc.overview.problem} />
        <DefRow label="目标" value={doc.overview.goal} />
      </Section>

      <Section title="用户与场景">
        <div className="space-y-3">
          {doc.users.map((user) => (
            <div key={user.name} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-200">{user.name}</div>
              <p className="text-xs text-gray-400 mt-1">{user.description}</p>
              <TagList items={user.painPoints} />
            </div>
          ))}
          {doc.scenarios.map((scenario) => (
            <div key={scenario.name} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-200">{scenario.name}</div>
              <p className="text-xs text-gray-500 mt-1">{scenario.userGoal}</p>
              <ol className="mt-2 space-y-1">
                {scenario.mainFlow.map((step, index) => (
                  <li key={index} className="text-xs text-gray-400">
                    {index + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <Section title="功能清单">
        <div className="space-y-2">
          {doc.features.map((feature) => (
            <div key={feature.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <PriorityBadge priority={feature.priority} />
                <span className="font-medium text-gray-200 text-sm">{feature.name}</span>
                <span className="font-mono text-[10px] text-gray-600">{feature.id}</span>
              </div>
              <p className="text-gray-400 text-xs ml-12">{feature.description}</p>
              <p className="text-emerald-400/70 text-xs ml-12 mt-1">{feature.userValue}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="范围边界">
        <div className="grid grid-cols-2 gap-3">
          <BoundaryBlock title="范围内" items={doc.scope.inScope} />
          <BoundaryBlock title="不做" items={doc.scope.outOfScope} tone="red" />
        </div>
      </Section>

      <Section title="业务规则">
        <div className="space-y-2">
          {doc.businessRules.map((rule) => (
            <div key={rule.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-300">{rule.rule}</div>
              <div className="text-[11px] text-gray-500 mt-1">{rule.reason}</div>
            </div>
          ))}
        </div>
      </Section>

      {doc.openQuestions.length > 0 && (
        <Section title="待确认项">
          <ul className="space-y-1.5">
            {doc.openQuestions.map((question, index) => (
              <li key={index} className="text-xs text-amber-300">{question}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function DefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-xs text-gray-500 shrink-0 w-16 text-right">{label}</span>
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

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item, index) => (
        <span key={index} className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded">
          {item}
        </span>
      ))}
    </div>
  );
}

function BoundaryBlock({ title, items, tone = 'green' }: { title: string; items: string[]; tone?: 'green' | 'red' }) {
  const color = tone === 'red' ? 'text-red-300' : 'text-emerald-300';
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
      <div className={`text-xs font-medium mb-2 ${color}`}>{title}</div>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-xs text-gray-500">{item}</li>
        ))}
      </ul>
    </div>
  );
}
