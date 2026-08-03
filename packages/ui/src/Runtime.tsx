import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle, Zap } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   عناصر زمن التشغيل المشتركة — توست · جرس الإشعارات · مبدّل السرعة
   بلا تبعية للمخزن: كل شيء يُمرَّر خصائصَ فيصلح للمنصات الثلاث.
   ═══════════════════════════════════════════════════════════════════════ */

export interface Toast {
  id: string;
  titleAr: string;
  bodyAr?: string;
  tone: 'ok' | 'warn' | 'bad' | 'info';
}

const TOAST_STYLE = {
  ok: { cls: 'border-s-ok-600 text-ok-600', Icon: CheckCircle2 },
  warn: { cls: 'border-s-warn-600 text-warn-600', Icon: AlertTriangle },
  bad: { cls: 'border-s-danger-600 text-danger-600', Icon: XCircle },
  info: { cls: 'border-s-info-500 text-info-500', Icon: Info },
} as const;

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);
  const { cls, Icon } = TOAST_STYLE[toast.tone];
  return (
    <div
      className={`toast-in pointer-events-auto flex items-start gap-2.5 rounded-[--radius-card] border-s-4 bg-ink-0 p-3.5 shadow-e3 ring-1 ring-ink-100 ${cls}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-[--text-caption] font-semibold text-ink-900">{toast.titleAr}</p>
        {toast.bodyAr && <p className="mt-0.5 text-[--text-caption] leading-relaxed text-ink-500">{toast.bodyAr}</p>}
      </div>
    </div>
  );
}

export function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 start-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/* ─────────────────────────── جرس الإشعارات ─────────────────────────── */

export interface NotificationItem {
  id: string;
  titleAr: string;
  bodyAr: string;
  atISO: string;
  read: boolean;
  deepLink: string;
  severity?: 'info' | 'warn' | 'critical';
}

const DOT = { critical: 'bg-danger-500', warn: 'bg-warn-500', info: 'bg-brand-500' } as const;

export function NotificationsBell({
  items,
  onOpen,
  onMarkAllRead,
  relTime,
  labelAr = 'الإشعارات',
  emptyAr = 'لا توجد إشعارات',
  markAllAr = 'تعليم الكل كمقروء',
}: {
  items: NotificationItem[];
  onOpen: (n: NotificationItem) => void;
  onMarkAllRead: () => void;
  relTime: (iso: string) => string;
  labelAr?: string;
  emptyAr?: string;
  markAllAr?: string;
}) {
  const [open, setOpen] = useState(false);
  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`${labelAr} — ${unread} غير مقروء`}
        aria-expanded={open}
        className="relative rounded-[--radius-ctl] p-2 text-ink-600 hover:bg-ink-50 hover:text-ink-900"
      >
        <Bell size={19} aria-hidden />
        {unread > 0 && (
          <span className="plate absolute -top-0.5 -start-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-[--radius-pill] bg-danger-600 px-1 text-[11px] font-bold text-ink-0">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="rise-in absolute end-0 top-full z-50 mt-2 max-h-[26rem] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-[--radius-card] bg-ink-0 p-2 shadow-e4 ring-1 ring-ink-100 thin-scroll">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <p className="text-[--text-caption] font-bold text-ink-900">{labelAr}</p>
              {unread > 0 && (
                <button
                  className="text-[--text-micro] font-semibold text-brand-600 hover:underline"
                  onClick={onMarkAllRead}
                >
                  {markAllAr}
                </button>
              )}
            </div>

            {items.length === 0 && (
              <p className="px-3 py-6 text-center text-[--text-caption] text-ink-500">{emptyAr}</p>
            )}

            {items.slice(0, 25).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  onOpen(n);
                  setOpen(false);
                }}
                className={`block w-full rounded-[--radius-ctl] p-2.5 text-start hover:bg-ink-50 ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  {!n.read && (
                    <span
                      className={`size-2 shrink-0 rounded-full ${DOT[n.severity ?? 'info']}`}
                      aria-hidden
                    />
                  )}
                  <span className="truncate text-[--text-caption] font-semibold text-ink-900">
                    {n.titleAr}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[--text-caption] text-ink-500">{n.bodyAr}</span>
                <span className="mt-0.5 block text-[--text-micro] text-ink-400">{relTime(n.atISO)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── مبدّل سرعة العرض ─────────────────────────── */

export function SpeedToggle({ speed, onToggle }: { speed: 1 | 10; onToggle: () => void }) {
  const on = speed === 10;
  return (
    <button
      onClick={onToggle}
      title="سرعة العرض — تسريع المستشعرات"
      aria-pressed={on}
      className={`hidden items-center gap-1 rounded-[--radius-pill] px-2.5 py-1.5 text-[--text-micro] font-bold transition-colors sm:flex ${
        on ? 'bg-brand-600 text-ink-0' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
      }`}
    >
      <Zap size={12} aria-hidden />
      <span className="plate">{on ? '10×' : '1×'}</span>
    </button>
  );
}
