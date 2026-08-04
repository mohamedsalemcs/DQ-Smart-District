import { useMemo } from 'react';
import { FileCheck2, FilePlus2, FileX2, Lock, PencilLine, X } from 'lucide-react';
import { useStore } from '@dq/core';
import { fmtDateTime } from '@dq/core';
import type { AuditEntry } from '@dq/core';

const actionMeta: Record<AuditEntry['action'], { labelAr: string; icon: typeof Lock; cls: string }> = {
  create: { labelAr: 'إنشاء', icon: FilePlus2, cls: 'text-ok-600' },
  update: { labelAr: 'تعديل', icon: PencilLine, cls: 'text-warn-600' },
  approve: { labelAr: 'اعتماد', icon: FileCheck2, cls: 'text-ok-600' },
  lock: { labelAr: 'قفل', icon: Lock, cls: 'text-ink-900' },
  reject: { labelAr: 'رفض', icon: FileX2, cls: 'text-danger-600' },
};

/** Openable from any record — the cheapest credibility feature in the build (§12). */
export function AuditDrawer({
  open,
  onClose,
  entity,
  entityId,
}: {
  open: boolean;
  onClose: () => void;
  entity?: string;
  entityId?: string;
}) {
  const audit = useStore((s) => s.audit);
  const people = useStore((s) => s.people);
  const entries = useMemo(
    () =>
      audit.filter(
        (a) => (!entity || a.entity === entity) && (!entityId || a.entityId === entityId),
      ),
    [audit, entity, entityId],
  );
  if (!open) return null;
  const nameOf = (id: string) => people.find((p) => p.id === id)?.nameAr ?? 'النظام';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-0/40" onClick={onClose} />
      <aside className="absolute end-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-ink-0 p-4 shadow-2xl thin-scroll">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">سجل التدقيق</h3>
          <button onClick={onClose} aria-label="إغلاق" className="rounded p-1 hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>
        {entries.length === 0 && <p className="text-sm text-ink-500">لا توجد قيود على هذا السجل بعد — القيود تُنشأ مع كل عملية.</p>}
        <ol className="space-y-3">
          {entries.map((a) => {
            const meta = actionMeta[a.action];
            const Icon = meta.icon;
            return (
              <li key={a.id} className="rounded-card bg-ink-50 p-3">
                <div className="flex items-center gap-2">
                  <Icon size={15} className={meta.cls} />
                  <span className="text-sm font-medium">{meta.labelAr}</span>
                  <span className="text-caption text-ink-500">{a.entity}</span>
                </div>
                <p className="mt-1 text-caption text-ink-500">
                  {nameOf(a.actorId)} · {fmtDateTime(a.atISO)}
                </p>
                {(a.before != null || a.after != null) && (
                  <pre dir="ltr" className="thin-scroll mt-2 max-h-24 overflow-auto rounded bg-ink-0/90 p-2 text-micro leading-relaxed text-ink-800">
{JSON.stringify({ before: a.before, after: a.after }, null, 1)}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
