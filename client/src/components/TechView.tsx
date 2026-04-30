import type { TechDoc } from '../types';

export default function TechView({ doc }: { doc: TechDoc }) {
  return (
    <div className="p-5 space-y-5">
      {/* Tech Stack */}
      <Section title="技术选型" icon="🛠️">
        <div className="space-y-2">
          {doc.techStack.map((t, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <span className="font-mono text-sm text-emerald-400">{t.tech}</span>
              <span className="text-xs text-gray-500">—</span>
              <span className="text-xs text-gray-400">{t.reason}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Modules */}
      <Section title="模块划分" icon="🧩">
        <div className="space-y-2">
          {doc.modules.map((m, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="font-medium text-gray-200 text-sm mb-1">{m.name}</div>
              <p className="text-xs text-gray-400 mb-2">{m.description}</p>
              {m.dependencies.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500">依赖:</span>
                  {m.dependencies.map((d, j) => (
                    <span key={j} className="px-1.5 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Data Models */}
      <Section title="数据模型" icon="💾">
        <div className="space-y-3">
          {doc.dataModels.map((model, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-800">
                <span className="font-mono text-sm text-blue-400">{model.name}</span>
              </div>
              <div className="p-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1 px-2">字段</th>
                      <th className="text-left py-1 px-2">类型</th>
                      <th className="text-center py-1 px-2">必填</th>
                      <th className="text-left py-1 px-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.fields.map((f, j) => (
                      <tr key={j} className="border-t border-gray-800/50">
                        <td className="py-1 px-2 font-mono text-emerald-400">{f.name}</td>
                        <td className="py-1 px-2 text-gray-400">{f.type}</td>
                        <td className="py-1 px-2 text-center">{f.required ? '✓' : ''}</td>
                        <td className="py-1 px-2 text-gray-500">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* APIs */}
      <Section title="API 设计" icon="🔌">
        <div className="space-y-1.5">
          {doc.apis.map((api, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-900/50 border border-gray-800 rounded-lg p-2.5">
              <MethodBadge method={api.method} />
              <span className="font-mono text-xs text-gray-300">{api.path}</span>
              <span className="text-xs text-gray-500">{api.description}</span>
            </div>
          ))}
        </div>
      </Section>
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

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-amber-500/20 text-amber-400',
    DELETE: 'bg-red-500/20 text-red-400',
    PATCH: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${colors[method] || 'bg-gray-500/20 text-gray-400'}`}>
      {method}
    </span>
  );
}
