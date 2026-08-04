import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, CircleDashed, Info, XCircle } from 'lucide-react';

/**
 * القاعدة BR-007 — اللون ليس الإشارة الوحيدة أبدًا.
 * كل شارة = لون + أيقونة + كلمة. الثلاثة معًا، بلا استثناء.
 * تباين كل نغمة مقيس: النص من درجة 600 على خلفية درجة 50.
 */

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

const TONES: Record<Tone, string> = {
  ok: 'bg-ok-50 text-ok-600 ring-ok-600/15',
  warn: 'bg-warn-50 text-warn-600 ring-warn-600/15',
  bad: 'bg-danger-50 text-danger-600 ring-danger-600/15',
  info: 'bg-info-50 text-info-600 ring-info-600/15',
  neutral: 'bg-ink-50 text-ink-600 ring-ink-600/10',
};

const FALLBACK: Record<Tone, LucideIcon> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
  info: Info,
  neutral: CircleDashed,
};

export function StatusPill({
  labelAr,
  tone,
  icon,
  size = 'md',
}: {
  labelAr: string;
  tone: Tone;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
}) {
  const Icon = icon ?? FALLBACK[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill font-semibold ring-1 ${
        TONES[tone]
      } ${size === 'sm' ? 'px-2 py-0.5 text-micro' : 'px-2.5 py-1 text-caption'}`}
    >
      <Icon size={size === 'sm' ? 11 : 13} aria-hidden />
      {labelAr}
    </span>
  );
}

/* ─────────────────── اللوحة الدائمة للمعرّفات اللاتينية ─────────────────── */

/** اللوحة معزولة اتجاهيًا دائمًا — بدونها تظهر 1284 بدل 4821 (BR-006) */
export function PlateBadge({ plate, size = 'md' }: { plate: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = {
    sm: 'px-2 py-0.5 text-caption',
    md: 'px-2.5 py-1 text-body',
    lg: 'px-4 py-2 text-2xl',
  }[size];
  return (
    <bdi
      className={`plate inline-flex items-center rounded-ctl bg-ink-50 text-ink-900 ring-1 ring-ink-200 ${cls}`}
    >
      {plate}
    </bdi>
  );
}

/** رقم المعاملة — لاتيني، لا ينقلب */
export function Txn({ no, className = '' }: { no: string; className?: string }) {
  return (
    <bdi dir="ltr" className={`plate ${className}`}>
      {no}
    </bdi>
  );
}
