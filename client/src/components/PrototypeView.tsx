import { useState } from 'react';

export default function PrototypeView({ html, pages }: { html: string; pages: string[] }) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">页面：</span>
          {pages.map((p, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded">
              {p}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-2 py-1 text-[10px] rounded transition-all ${
              viewMode === 'desktop' ? 'bg-gray-700 text-gray-200' : 'text-gray-500'
            }`}
          >
            🖥 桌面
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`px-2 py-1 text-[10px] rounded transition-all ${
              viewMode === 'mobile' ? 'bg-gray-700 text-gray-200' : 'text-gray-500'
            }`}
          >
            📱 手机
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-hidden bg-gray-900/50 flex items-start justify-center p-4">
        <div
          className={`bg-white rounded-lg shadow-2xl overflow-hidden transition-all ${
            viewMode === 'desktop' ? 'w-full h-full' : 'w-[375px] h-[667px]'
          }`}
        >
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            title="Prototype Preview"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
