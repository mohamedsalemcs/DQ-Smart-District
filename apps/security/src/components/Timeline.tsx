import type { TimelineEvent } from '@dq/core';
import { fmtDateTime } from '@dq/core';
import { useStore } from '@dq/core';

export function Timeline({ events, dark = false }: { events: TimelineEvent[]; dark?: boolean }) {
  const people = useStore((s) => s.people);
  const nameOf = (id: string) =>
    people.find((p) => p.id === id)?.nameAr ?? (id.startsWith('system') ? 'النظام' : id);
  const sorted = [...events].sort((a, b) => b.atISO.localeCompare(a.atISO));
  return (
    <ol className="relative space-y-4 border-e border-ink-300 pe-0 ps-0">
      {sorted.map((e, i) => (
        <li key={i} className="relative me-4 pe-4">
          <span className={`absolute -end-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-brand-600' : dark ? 'bg-ink-200' : 'bg-ink-100'}`} />
          <p className="text-sm font-medium">{e.action}</p>
          {e.detailAr && <p className={`text-[--text-caption] ${dark ? 'text-ink-500' : 'text-ink-500'}`}>{e.detailAr}</p>}
          <p className={`mt-0.5 text-[--text-caption] tabular-nums ${dark ? 'text-ink-500' : 'text-ink-500'}`}>
            {nameOf(e.actorId)} · {fmtDateTime(e.atISO)}
          </p>
        </li>
      ))}
    </ol>
  );
}
