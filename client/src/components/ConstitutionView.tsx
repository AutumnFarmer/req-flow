import type { RequirementConstitution } from '../types';

export default function ConstitutionView({ doc }: { doc: RequirementConstitution }) {
  return (
    <div className="p-5 space-y-5">
      <Section title="核心定义">
        <DefRow label="产品名" value={doc.productName} />
        <DefRow label="一句话" value={doc.oneSentence} />
        <DefRow label="核心价值" value={doc.coreValue} />
        <DefRow label="核心场景" value={doc.primaryScenario} />
      </Section>

      <Section title="目标用户">
        <TagList items={doc.targetUsers} tone="blue" />
      </Section>

      <Section title="成功标准">
        <BulletList items={doc.successCriteria} />
      </Section>

      <Section title="明确不做">
        <TagList items={doc.nonGoals} tone="red" />
      </Section>

      <Section title="锁定决策">
        <BulletList items={doc.lockedDecisions} />
      </Section>
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
      <span className="text-xs text-gray-500 shrink-0 w-20 text-right">{label}</span>
      <span className="text-sm text-gray-300">{value || '-'}</span>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-xs text-gray-400">
          <span className="text-gray-600 mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TagList({ items, tone }: { items: string[]; tone: 'blue' | 'red' }) {
  const classes = tone === 'blue'
    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
    : 'bg-red-500/10 border-red-500/20 text-red-300';

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span key={index} className={`px-2.5 py-1 border text-xs rounded-full ${classes}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
