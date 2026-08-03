import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { DayMetric } from '@dq/core';

/* ————— dashboard kit: KPI cards with deltas + sparklines, chart frames, range picker ————— */

export function Sparkline({ data, color = 'var(--color-viz-2)', height = 28 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const w = 96;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${height - 3 - ((v - min) / span) * (height - 6)}`)
    .join(' ');
  return (
    <svg width={w} height={height} className="shrink-0" aria-hidden style={{ direction: 'ltr' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** delta% vs previous period; `goodWhenDown` flips the colour logic (response time, denials). */
export function KpiCard({
  label,
  value,
  suffix,
  delta,
  goodWhenDown = false,
  spark,
  sparkColor,
  dark = false,
  onClick,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  delta?: number;
  goodWhenDown?: boolean;
  spark?: number[];
  sparkColor?: string;
  dark?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  const improving = delta != null && (goodWhenDown ? delta < 0 : delta > 0);
  const deltaCls =
    delta == null || Math.abs(delta) < 0.5
      ? dark ? 'text-ink-500' : 'text-ink-500'
      : improving
        ? dark ? 'text-ok-600' : 'text-ok-600'
        : dark ? 'text-danger-600' : 'text-danger-600';
  return (
    <Comp
      onClick={onClick}
      className={`rounded-[--radius-card] p-4 text-start ${
        dark ? 'bg-ink-50 text-ink-800 ring-1 ring-ink-100' : 'bg-ink-0 ring-1 ring-ink-100'
      } ${onClick ? 'cursor-pointer transition-all hover:-translate-y-0.5' : ''}`}
      
    >
      <p className={`text-[--text-caption] font-semibold ${dark ? 'text-ink-500' : 'text-ink-500'}`}>{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold leading-none tabular-nums tracking-tight">
          {value}
          {suffix && <span className={`ms-1 text-[--text-caption] font-semibold ${dark ? 'text-ink-500' : 'text-ink-500'}`}>{suffix}</span>}
        </p>
        {spark && <Sparkline data={spark} color={sparkColor ?? 'var(--color-viz-2)'} />}
      </div>
      {delta != null && (
        <p className={`mt-2 flex items-center gap-1 text-[--text-caption] font-semibold ${deltaCls}`}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <bdi dir="ltr">{delta > 0 ? '+' : ''}{delta.toFixed(0)}%</bdi>
          <span className={`font-normal ${dark ? 'text-ink-500' : 'text-ink-500'}`}>عن الفترة السابقة</span>
        </p>
      )}
    </Comp>
  );
}

export function ChartCard({
  title,
  sub,
  action,
  children,
  dark = false,
  className = '',
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[--radius-card] p-4 ${dark ? 'bg-ink-50 text-ink-800 ring-1 ring-ink-100' : 'bg-ink-0 ring-1 ring-ink-100'} ${className}`}
      
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{title}</p>
          {sub && <p className={`text-[--text-caption] ${dark ? 'text-ink-500' : 'text-ink-500'}`}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export type Range = 7 | 30 | 90;

export function RangePicker({ value, onChange, dark = false }: { value: Range; onChange: (r: Range) => void; dark?: boolean }) {
  const options: { r: Range; labelAr: string }[] = [
    { r: 7, labelAr: 'أسبوع' },
    { r: 30, labelAr: '30 يوم' },
    { r: 90, labelAr: 'ربع سنة' },
  ];
  return (
    <div className={`flex items-center gap-0.5 rounded-[--radius-card] p-0.5 ${dark ? 'bg-ink-0' : 'bg-ink-50'}`} role="tablist" aria-label="الفترة الزمنية">
      {options.map((o) => (
        <button
          key={o.r}
          role="tab"
          aria-selected={value === o.r}
          onClick={() => onChange(o.r)}
          className={`rounded-[--radius-ctl] px-3 py-1 text-[--text-caption] font-semibold transition-colors ${
            value === o.r ? 'bg-brand-600 text-ink-900' : dark ? 'text-ink-500 hover:text-ink-900-800' : 'text-ink-500 hover:text-ink-900-800'
          }`}
        >
          {o.labelAr}
        </button>
      ))}
    </div>
  );
}

/* ————— range math: current window vs the window before it ————— */

export function windowStats(metrics: DayMetric[], range: Range) {
  const cur = metrics.slice(-range);
  const prev = metrics.slice(-range * 2, -range);
  const sum = (arr: DayMetric[], k: keyof DayMetric) => arr.reduce((a, m) => a + (m[k] as number), 0);
  const avg = (arr: DayMetric[], k: keyof DayMetric) => (arr.length ? sum(arr, k) / arr.length : 0);
  const deltaPct = (c: number, p: number) => (p === 0 ? 0 : ((c - p) / p) * 100);
  return { cur, prev, sum, avg, deltaPct };
}

export const chartTooltip = (dark: boolean) => ({
  contentStyle: {
    background: dark ? 'var(--color-viz-1)' : '#fff',
    border: dark ? '1px solid #0b554d' : '1px solid #e4eaea',
    borderRadius: 6,
    direction: 'rtl' as const,
    fontSize: 12,
    fontFamily: 'inherit',
    boxShadow: 'var(--shadow-e3)',
  },
  labelStyle: { color: dark ? '#a3dbd3' : '#1f2a29', fontWeight: 700 },
});

export const axisTick = (dark: boolean) => ({ fill: dark ? 'var(--color-viz-5)' : '#5c6d6d', fontSize: 10, fontFamily: 'inherit' });
