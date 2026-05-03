import type { AcceptanceDoc, RequirementDoc, TaskPlanDoc, TechDoc } from '../types';

interface TraceabilityViewProps {
  requirement: RequirementDoc | null;
  acceptance: AcceptanceDoc | null;
  taskPlan: TaskPlanDoc | null;
  tech: TechDoc | null;
}

export default function TraceabilityView({ requirement, acceptance, taskPlan, tech }: TraceabilityViewProps) {
  if (!requirement) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
        需要先接受一版需求文档提案
      </div>
    );
  }

  const rows = requirement.features.map((feature) => {
    const acceptanceCases = acceptance?.featureCases
      .filter((group) => group.featureId === feature.id)
      .flatMap((group) => group.cases) || [];
    const caseIds = new Set(acceptanceCases.map((item) => item.id));
    const tasks = taskPlan?.tasks.filter((task) => task.acceptanceRefs.some((ref) => caseIds.has(ref))) || [];
    const techSignals = collectTechSignals(feature, tech);
    const missing = [
      acceptanceCases.length === 0 ? '缺验收' : null,
      tasks.length === 0 ? '缺任务' : null,
      techSignals.length === 0 ? '缺技术线索' : null,
    ].filter(Boolean) as string[];

    return {
      feature,
      acceptanceCases,
      tasks,
      techSignals,
      missing,
    };
  });

  const completed = rows.filter((row) => row.missing.length === 0).length;
  const p0Missing = rows.filter((row) => row.feature.priority === 'P0' && row.missing.length > 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">追溯矩阵</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            检查每个功能是否已经被验收用例、开发任务和技术方案支撑。
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
          <div className="text-lg font-semibold text-cyan-300">{completed}/{rows.length}</div>
          <div className="text-[10px] text-gray-500">完整链路</div>
        </div>
      </div>

      {p0Missing.length > 0 && (
        <div className="rounded-md border border-red-400/20 bg-red-400/10 p-3">
          <div className="text-xs font-semibold text-red-300">P0 断链</div>
          <div className="mt-1 text-xs leading-5 text-red-200/80">
            {p0Missing.map((row) => `${row.feature.id} ${row.feature.name}：${row.missing.join('、')}`).join('；')}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-white/10">
        <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_120px] border-b border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 max-xl:grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_110px]">
          <div>功能</div>
          <div>验收</div>
          <div className="max-xl:hidden">任务</div>
          <div className="max-xl:hidden">技术线索</div>
          <div>状态</div>
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row) => (
            <div
              key={row.feature.id}
              className="grid grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_120px] gap-0 px-3 py-3 text-xs max-xl:grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_110px]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={priorityClass(row.feature.priority)}>{row.feature.priority}</span>
                  <span className="font-mono text-[11px] text-gray-500">{row.feature.id}</span>
                </div>
                <div className="mt-1 font-medium text-gray-200">{row.feature.name}</div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">{row.feature.description}</div>
              </div>
              <TraceCell
                empty="未生成验收"
                items={row.acceptanceCases.map((item) => `${item.id} ${item.scenario}`)}
              />
              <TraceCell
                className="max-xl:hidden"
                empty="未关联任务"
                items={row.tasks.map((task) => `${task.id} ${task.title}`)}
              />
              <TraceCell
                className="max-xl:hidden"
                empty="未找到技术线索"
                items={row.techSignals}
              />
              <div className="min-w-0">
                {row.missing.length === 0 ? (
                  <span className="rounded bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">完整</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {row.missing.map((item) => (
                      <span key={item} className="rounded bg-amber-400/10 px-1.5 py-1 text-[10px] text-amber-300">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-gray-500">
        如果功能缺验收，先生成验收标准；如果缺任务，重新生成验收和任务拆解；如果缺技术线索，生成或修正技术方案。
      </div>
    </div>
  );
}

function TraceCell({ items, empty, className = '' }: { items: string[]; empty: string; className?: string }) {
  return (
    <div className={`min-w-0 space-y-1 ${className}`}>
      {items.length === 0 ? (
        <span className="text-[11px] text-gray-600">{empty}</span>
      ) : (
        items.slice(0, 3).map((item) => (
          <div key={item} className="truncate rounded bg-white/[0.03] px-2 py-1 text-[11px] text-gray-400">
            {item}
          </div>
        ))
      )}
      {items.length > 3 && <div className="text-[10px] text-gray-600">+{items.length - 3}</div>}
    </div>
  );
}

function collectTechSignals(feature: RequirementDoc['features'][number], tech: TechDoc | null) {
  if (!tech) return [];
  const haystack = `${feature.name} ${feature.description} ${feature.relatedScenarios.join(' ')}`.toLowerCase();
  const tokens = [feature.name, ...feature.name.split(/\s+/), ...feature.relatedScenarios]
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 2);

  const modules = tech.modules
    .filter((module) => containsSignal(`${module.name} ${module.responsibility}`, tokens, haystack))
    .map((module) => `模块 ${module.id} ${module.name}`);
  const apis = tech.apis
    .filter((api) => containsSignal(`${api.path} ${api.description}`, tokens, haystack))
    .map((api) => `API ${api.method} ${api.path}`);

  return [...modules, ...apis];
}

function containsSignal(value: string, tokens: string[], haystack: string) {
  const normalized = value.toLowerCase();
  return tokens.some((token) => normalized.includes(token) || haystack.includes(normalized));
}

function priorityClass(priority: string) {
  const classes: Record<string, string> = {
    P0: 'rounded bg-red-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-300',
    P1: 'rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300',
    P2: 'rounded bg-blue-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300',
  };
  return classes[priority] || 'rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400';
}
