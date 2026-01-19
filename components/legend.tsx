interface LegendProps {
  showWeekends?: boolean;
  onToggleWeekends?: () => void;
  showHolidays?: boolean;
  onToggleHolidays?: () => void;
}

const items = [
  { label: '已过', color: '#D8E9E4', border: false, type: 'static' },
  { label: '今天', color: '#009C7B', border: false, type: 'static' },
  { label: '未来', color: '#EEF3F4', border: true, type: 'static' },
  { label: '周末', color: '#D2D5F2', border: false, type: 'toggle', key: 'weekend' },
  { label: '节假日', color: '#FFB4AD', border: false, type: 'toggle', key: 'holiday' },
  { label: '已标记', color: '#7BC27E', border: false, type: 'static' }
] as const;

export function Legend({
  showWeekends = false,
  onToggleWeekends,
  showHolidays = false,
  onToggleHolidays
}: LegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2 text-sm">
      <span className="text-xs font-medium text-zinc-500 mr-2">图例:</span>
      {items.map((item) => {
        if (item.type === 'toggle') {
          const isActive = item.key === 'weekend' ? showWeekends : showHolidays;
          const onClick = item.key === 'weekend' ? onToggleWeekends : onToggleHolidays;
          
          return (
            <button
              key={item.label}
              type="button"
              onClick={onClick}
              disabled={!onClick}
              aria-pressed={isActive}
              className={`flex items-center gap-2 rounded-md px-2 py-1 transition-all ${
                isActive 
                  ? 'bg-zinc-100 ring-1 ring-zinc-200 shadow-sm' 
                  : 'hover:bg-zinc-50 opacity-60 grayscale'
              } ${!onClick ? 'cursor-not-allowed opacity-40 grayscale-0' : ''}`}
            >
              <div
                className={`h-3.5 w-3.5 rounded ${item.border ? 'border border-zinc-200' : ''}`}
                style={{ backgroundColor: item.color }}
              />
              <span className={`text-xs ${isActive ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <div key={item.label} className="flex items-center gap-2 px-2 py-1">
            <div
              className={`h-3.5 w-3.5 rounded ${item.border ? 'border border-zinc-200' : ''}`}
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-zinc-500">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
