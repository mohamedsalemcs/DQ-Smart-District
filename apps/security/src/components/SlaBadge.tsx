import { AlarmClock, AlarmClockOff } from 'lucide-react';
import type { ServiceRequest } from '@dq/core';
import { isPast, ago } from '@dq/core';

export function SlaBadge({ req }: { req: ServiceRequest }) {
  if (req.status === 'closed') return null;
  const breached = req.slaBreached || isPast(req.dueISO);
  if (!req.dueISO && !breached) return null;
  return breached ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-caption font-medium text-danger-600">
      <AlarmClockOff size={12} /> تجاوز SLA
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-ok-600-50 px-2 py-0.5 text-caption font-medium text-ok-600">
      <AlarmClock size={12} /> ضمن SLA · يستحق {ago(req.dueISO!)}
    </span>
  );
}
