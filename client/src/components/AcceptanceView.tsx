import type { AcceptanceDoc } from '../types';

export default function AcceptanceView({ doc }: { doc: AcceptanceDoc }) {
  return (
    <div className="p-5 space-y-5">
      {doc.featureCases.map((feature) => (
        <Section key={feature.featureId} title={feature.featureId}>
          <div className="space-y-2">
            {feature.cases.map((item) => (
              <div key={item.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] text-emerald-400">{item.id}</span>
                  <span className="text-xs text-gray-300">{item.scenario}</span>
                  <span className="ml-auto px-1.5 py-0.5 bg-gray-800 text-[10px] text-gray-500 rounded">
                    {item.priority}
                  </span>
                </div>
                <GivenWhenThen label="Given" value={item.given} />
                <GivenWhenThen label="When" value={item.when} />
                <GivenWhenThen label="Then" value={item.then} tone="green" />
                {item.boundary && <GivenWhenThen label="Boundary" value={item.boundary} tone="amber" />}
              </div>
            ))}
          </div>
        </Section>
      ))}

      <Section title="发布检查">
        <ul className="space-y-1.5">
          {doc.releaseChecklist.map((item, index) => (
            <li key={index} className="text-xs text-gray-400">{item}</li>
          ))}
        </ul>
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

function GivenWhenThen({ label, value, tone = 'gray' }: { label: string; value: string; tone?: 'gray' | 'green' | 'amber' }) {
  const color = tone === 'green' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : 'text-gray-300';
  return (
    <div className="grid grid-cols-[64px_1fr] gap-2 text-xs py-0.5">
      <span className="text-gray-600">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
