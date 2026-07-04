export const getScaledBarHeight = (value: number, maxValue: number, minHeight = 6): number => {
  if (maxValue <= 0 || value <= 0) return 0;
  return Math.max((value / maxValue) * 100, minHeight);
};

export type SgiVerticalBarOptions = {
  barWidthClass?: string;
  labelClassName?: string;
  labelColor?: string;
  title?: string;
  barAreaClass?: string;
  barAreaHeightClass?: string;
};

export const renderSgiVerticalBar = (
  valueLabel: string,
  barHeightPercent: number,
  barColor: string,
  options?: SgiVerticalBarOptions
) => (
  <div className="w-full flex flex-col items-center">
    <div className="min-h-[1.5rem] w-full flex items-center justify-center shrink-0 px-0.5">
      <span
        className={
          options?.labelClassName ??
          'text-[10px] font-mono leading-none font-semibold whitespace-nowrap'
        }
        style={{ color: options?.labelColor ?? barColor }}
      >
        {valueLabel}
      </span>
    </div>
    <div
      className={`${options?.barAreaHeightClass ?? 'h-40'} w-full flex items-end justify-center ${options?.barAreaClass ?? ''}`}
    >
      <div
        className={`rounded-t-sm shrink-0 ${options?.barWidthClass ?? 'w-[54px]'}`}
        style={{
          height: `${barHeightPercent}%`,
          minHeight: barHeightPercent <= 0 ? '2px' : '6px',
          backgroundColor: barColor
        }}
        title={options?.title}
      />
    </div>
  </div>
);

export type SgiGroupedBar = {
  value: number;
  color: string;
  title?: string;
  valueLabel?: string;
  labelColor?: string;
};

export const renderSgiGroupedVerticalBars = (
  bars: SgiGroupedBar[],
  maxValue: number,
  options?: {
    barWidthClass?: string;
    columnWidthClass?: string;
    barAreaHeightClass?: string;
    valueFormatter?: (value: number) => string;
  }
) => (
  <div className="flex gap-1 w-full justify-center">
    {bars.map((bar, index) => {
      const valueLabel =
        bar.valueLabel ??
        (options?.valueFormatter ? options.valueFormatter(bar.value) : String(bar.value));
      return (
        <div key={index} className={options?.columnWidthClass ?? 'w-[28px]'}>
          {renderSgiVerticalBar(valueLabel, getScaledBarHeight(bar.value, maxValue), bar.color, {
            barWidthClass: options?.barWidthClass ?? 'w-[22px]',
            barAreaHeightClass: options?.barAreaHeightClass,
            labelColor: bar.labelColor ?? bar.color,
            title: bar.title
          })}
        </div>
      );
    })}
  </div>
);
