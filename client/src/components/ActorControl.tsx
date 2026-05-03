import { useAppStore } from '../store';

export default function ActorControl({ compact = false }: { compact?: boolean }) {
  const actor = useAppStore((s) => s.actor);
  const workspaceId = useAppStore((s) => s.workspaceId);
  const role = useAppStore((s) => s.role);
  const setActor = useAppStore((s) => s.setActor);
  const setWorkspaceId = useAppStore((s) => s.setWorkspaceId);
  const setRole = useAppStore((s) => s.setRole);

  return (
    <div className={`flex items-center gap-2 ${compact ? 'max-w-[560px]' : ''}`}>
      <label className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[11px] text-gray-500">工作区</span>
        <input
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
          placeholder="default"
          className="min-w-0 rounded-md border border-white/10 bg-[#080b10] px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/10"
        />
      </label>
      <label className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[11px] text-gray-500">角色</span>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="min-w-0 rounded-md border border-white/10 bg-[#080b10] px-2.5 py-1.5 text-xs text-gray-200 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/10"
        >
          <option value="viewer">viewer</option>
          <option value="reviewer">reviewer</option>
          <option value="editor">editor</option>
          <option value="admin">admin</option>
        </select>
      </label>
      <label className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[11px] text-gray-500">操作者</span>
        <input
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          placeholder="name@company.com"
          className="min-w-0 rounded-md border border-white/10 bg-[#080b10] px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/10"
        />
      </label>
    </div>
  );
}
