import type { TaskPlanDoc } from '../types';

export default function TaskPlanView({ doc }: { doc: TaskPlanDoc }) {
  return (
    <div className="p-5 space-y-3">
      {doc.tasks.map((task) => (
        <div key={task.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-emerald-400">{task.id}</span>
            <span className="font-medium text-sm text-gray-200">{task.title}</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">{task.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {task.dependsOn.map((dep) => (
              <span key={dep} className="px-1.5 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded">
                依赖 {dep}
              </span>
            ))}
            {task.acceptanceRefs.map((ref) => (
              <span key={ref} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded">
                验收 {ref}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
