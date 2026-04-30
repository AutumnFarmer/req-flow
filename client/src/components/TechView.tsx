import type { TechDoc } from '../types';

export default function TechView({ doc }: { doc: TechDoc }) {
  return (
    <div className="p-5 space-y-5">
      <Section title="架构">
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <div className="text-sm text-gray-200">{doc.architecture.style}</div>
          <p className="text-xs text-gray-400 mt-1">{doc.architecture.rationale}</p>
          <TagList items={doc.architecture.constraints} />
        </div>
      </Section>

      <Section title="技术选型">
        <div className="space-y-2">
          {doc.techStack.map((item) => (
            <div key={item.tech} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="font-mono text-sm text-emerald-400">{item.tech}</div>
              <div className="text-xs text-gray-400 mt-1">{item.reason}</div>
              {item.risk && <div className="text-[11px] text-amber-300 mt-1">{item.risk}</div>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="模块划分">
        <div className="space-y-2">
          {doc.modules.map((module) => (
            <div key={module.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-gray-600">{module.id}</span>
                <span className="font-medium text-gray-200 text-sm">{module.name}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{module.responsibility}</p>
              <TagList items={module.dependencies} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="数据模型">
        <div className="space-y-3">
          {doc.dataModels.map((model) => (
            <div key={model.name} className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
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
                    {model.fields.map((field) => (
                      <tr key={field.name} className="border-t border-gray-800/50">
                        <td className="py-1 px-2 font-mono text-emerald-400">{field.name}</td>
                        <td className="py-1 px-2 text-gray-400">{field.type}</td>
                        <td className="py-1 px-2 text-center">{field.required ? '✓' : ''}</td>
                        <td className="py-1 px-2 text-gray-500">{field.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="API">
        <div className="space-y-1.5">
          {doc.apis.map((api) => (
            <div key={`${api.method}-${api.path}`} className="flex items-center gap-3 bg-gray-900/50 border border-gray-800 rounded-lg p-2.5">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => (
        <span key={item} className="px-1.5 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded">
          {item}
        </span>
      ))}
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
