import type { AcceptanceDoc } from '../types';

export default function AcceptanceView({ doc }: { doc: AcceptanceDoc }) {
  return (
    <div className="p-5 space-y-5">
      {doc.features.map((feature, i) => (
        <Section key={i} title={feature.name} icon="✅">
          <div className="space-y-2">
            {feature.cases.map((c, j) => (
              <div key={j} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                <div className="font-medium text-gray-200 text-xs mb-2">
                  场景：{c.scenario}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">操作：</span>
                    <span className="text-gray-300">{c.operation}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">预期：</span>
                    <span className="text-emerald-400">{c.expected}</span>
                  </div>
                  {c.boundary && (
                    <div className="col-span-2">
                      <span className="text-gray-500">边界：</span>
                      <span className="text-amber-400/70">{c.boundary}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}
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
