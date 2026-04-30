import type { QualityReport } from '../types';

export default function QualityPanel({ report }: { report: QualityReport | null }) {
  if (!report) {
    return (
      <div className="p-4 border-b border-gray-800">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">质量闸门</div>
        <p className="text-xs text-gray-600">还没有质量报告</p>
      </div>
    );
  }

  const tone = report.score >= 90 ? 'text-emerald-400' : report.score >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="p-4 border-b border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">质量闸门</div>
        <div className={`text-lg font-bold ${tone}`}>{report.score}</div>
      </div>

      {report.blockers.length > 0 && (
        <Block title="阻断项" items={report.blockers} tone="red" />
      )}
      {report.warnings.length > 0 && (
        <Block title="提醒" items={report.warnings} tone="amber" />
      )}
      <Block title="下一步" items={report.nextActions} tone="gray" />
    </div>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone: 'red' | 'amber' | 'gray' }) {
  const color = tone === 'red' ? 'text-red-300' : tone === 'amber' ? 'text-amber-300' : 'text-gray-400';
  return (
    <div className="mb-3 last:mb-0">
      <div className={`text-[11px] font-medium mb-1 ${color}`}>{title}</div>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-[11px] text-gray-500 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
