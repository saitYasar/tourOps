import { cn } from '@/lib/utils';

/** Mini table+chair SVG previews for capacity picker */
export function TablePreview({ capacity, selected, onClick }: { capacity: number; selected: boolean; onClick: () => void }) {
  const perSide = Math.ceil(capacity / 2);
  const rightCount = capacity - perSide;
  const tw = capacity <= 2 ? 20 : capacity <= 4 ? 26 : capacity <= 6 ? 30 : 36;
  const th = capacity <= 2 ? 20 : Math.max(20, perSide * 12 + 4);
  const isRound = capacity === 2;
  const cx = 28;
  const cy = th / 2 + 6;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer',
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <svg width="56" height={th + 12} viewBox={`0 0 56 ${th + 12}`}>
        {/* Left chairs */}
        {Array.from({ length: perSide }).map((_, i) => {
          const spacing = th / (perSide + 1);
          const chairY = cy - th / 2 + spacing * (i + 1);
          return (
            <g key={`l-${i}`}>
              <rect x={cx - tw / 2 - 10} y={chairY - 4} width={8} height={8} rx={1.5} fill="#a8b8cc" stroke="#7a8da3" strokeWidth={0.5} />
              <line x1={cx - tw / 2 - 11} y1={chairY - 5} x2={cx - tw / 2 - 3} y2={chairY - 5} stroke="#6b7d93" strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}
        {/* Right chairs */}
        {Array.from({ length: rightCount }).map((_, i) => {
          const spacing = th / (rightCount + 1);
          const chairY = cy - th / 2 + spacing * (i + 1);
          return (
            <g key={`r-${i}`}>
              <rect x={cx + tw / 2 + 2} y={chairY - 4} width={8} height={8} rx={1.5} fill="#a8b8cc" stroke="#7a8da3" strokeWidth={0.5} />
              <line x1={cx + tw / 2 + 3} y1={chairY + 5} x2={cx + tw / 2 + 11} y2={chairY + 5} stroke="#6b7d93" strokeWidth={2} strokeLinecap="round" />
            </g>
          );
        })}
        {/* Table */}
        {isRound ? (
          <circle cx={cx} cy={cy} r={tw / 2} fill="#FEFCE8" stroke="#94a3b8" strokeWidth={1} />
        ) : (
          <rect x={cx - tw / 2} y={cy - th / 2} width={tw} height={th} rx={2} fill="#FEFCE8" stroke="#94a3b8" strokeWidth={1} />
        )}
      </svg>
      <span className={cn(
        'text-sm font-medium',
        selected ? 'text-blue-700' : 'text-slate-600',
      )}>
        {capacity} kişilik
      </span>
    </button>
  );
}
