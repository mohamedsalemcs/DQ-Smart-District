import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, Inbox, Loader2, X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   قواعد ملزمة لكل مكوّن هنا:
   1 · لا لون خام ولا مقاس خام ولا ظل مضمّن — من الرموز فقط
   2 · كل عنصر تفاعلي <button>/<a> — لا <div onClick>
   3 · كل حالة = لون + أيقونة + كلمة
   4 · كل تباين مقيس — راجع _SOURCE/04-DESIGN-SYSTEM/02-color-system.md
   ═══════════════════════════════════════════════════════════════════════ */

/* ───────────────────────────── Button ───────────────────────────── */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-ink-0 hover:bg-brand-700 active:bg-brand-800 shadow-e1',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
  outline: 'border border-ink-300 bg-ink-0 text-ink-800 hover:bg-ink-50 hover:border-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-50 active:bg-ink-100',
  danger: 'bg-danger-600 text-ink-0 hover:bg-danger-500 shadow-e1',
  success: 'bg-ok-600 text-ink-0 hover:bg-ok-500 shadow-e1',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5',
  md: 'h-10 px-4 text-[0.9375rem] gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  xl: 'h-14 px-6 text-lg gap-2.5', /* شاشة البوابة — 56px */
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const inert = disabled || loading;
  return (
    <button
      {...rest}
      /* aria-disabled لا disabled وحده: المعطّل بـdisabled لا يستقبل التركيز
         فلا يعرف مستخدم قارئ الشاشة بوجوده */
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      disabled={inert}
      className={`inline-flex shrink-0 items-center justify-center rounded-[--radius-ctl] font-semibold
        transition-all duration-150 active:scale-[0.98]
        disabled:pointer-events-none disabled:opacity-50
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ───────────────────────────── Card ───────────────────────────── */

const ELEV = ['', 'shadow-e1', 'shadow-e2', 'shadow-e3'] as const;
const PAD = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' } as const;

export function Card({
  children,
  elevation = 1,
  padding = 'md',
  className = '',
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  elevation?: 0 | 1 | 2 | 3;
  padding?: keyof typeof PAD;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const base = `rounded-[--radius-card] bg-ink-0 ring-1 ring-ink-100 ${ELEV[elevation]} ${PAD[padding]} ${className}`;
  /* البطاقة القابلة للنقر عنصر button حقيقي — لا div onClick */
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${base} w-full text-start transition-all hover:shadow-e2 hover:ring-brand-200`}
      >
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}

/* ───────────────────────── Page & Section ───────────────────────── */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[--text-h1] font-bold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-[--text-caption] text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({
  children,
  sub,
  action,
}: {
  children: ReactNode;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-[--text-h3] font-semibold text-ink-900">{children}</h2>
        {sub && <p className="mt-0.5 text-[--text-caption] text-ink-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ───────────────────────────── Fields ───────────────────────────── */

const FieldCtx = createContext<{ id: string; describedBy?: string; invalid: boolean }>({
  id: '',
  invalid: false,
});

export function Field({
  label,
  children,
  hint,
  error,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <FieldCtx.Provider value={{ id, describedBy, invalid: !!error }}>
      <div className="block">
        <label htmlFor={id} className="mb-1.5 block text-[--text-caption] font-semibold text-ink-700">
          {label}
          {required && (
            <span className="text-danger-500" aria-hidden>
              {' '}
              *
            </span>
          )}
        </label>
        {children}
        {/* الخطأ مرتبط بحقله لا مجمّعًا أسفل النموذج (UX-07) */}
        {error && (
          <p
            id={errId}
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 text-[--text-caption] font-medium text-danger-600"
          >
            <AlertCircle size={13} aria-hidden />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-[--text-caption] text-ink-500">
            {hint}
          </p>
        )}
      </div>
    </FieldCtx.Provider>
  );
}

/* ink-400 للحدود: 3.52 يجتاز WCAG 1.4.11 للمكوّنات غير النصية */
const CONTROL = `w-full rounded-[--radius-ctl] border bg-ink-0 px-3 text-[--text-body] text-ink-800
  placeholder:text-ink-400 transition-colors
  focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20
  disabled:bg-ink-50 disabled:text-ink-300`;

function useField() {
  const ctx = useContext(FieldCtx);
  return {
    id: ctx.id || undefined,
    'aria-describedby': ctx.describedBy,
    'aria-invalid': ctx.invalid || undefined,
    borderCls: ctx.invalid ? 'border-danger-500 bg-danger-50' : 'border-ink-400',
  };
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { borderCls, ...aria } = useField();
  return <input {...aria} {...props} className={`${CONTROL} ${borderCls} h-10 ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { borderCls, ...aria } = useField();
  return (
    <textarea {...aria} {...props} className={`${CONTROL} ${borderCls} min-h-24 py-2.5 ${props.className ?? ''}`} />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { borderCls, ...aria } = useField();
  return <select {...aria} {...props} className={`${CONTROL} ${borderCls} h-10 ${props.className ?? ''}`} />;
}

/* ───────────────────────────── Modal ───────────────────────────── */

/**
 * يحبس التركيز ويعيده للعنصر المُفعِّل عند الإغلاق (DEF-048).
 * الحوارات السابقة كانت تسرّب التركيز خلف الحاجب.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[autofocus],button,input,select,textarea,a[href]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab' || !panel) return;
      const items = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`rise-in relative max-h-[85vh] w-full overflow-y-auto rounded-[--radius-panel] bg-ink-0 p-5 shadow-e4 thin-scroll ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-[--text-h3] font-bold text-ink-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="-m-1 rounded-[--radius-ctl] p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-800"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  /** يذكر الأثر لا السؤال — BR-008 */
  body,
  confirmLabel = 'تأكيد',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {body && <p className="mb-5 text-[--text-body] leading-relaxed text-ink-600">{body}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────── States: empty · loading ─────────────────────── */

/** يشرح لماذا فارغ وما الخطوة التالية — لا عنوان مجرد (BR-009) */
export function EmptyState({
  title,
  hint,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-ink-50 text-ink-400">
        <Icon size={22} strokeWidth={1.5} aria-hidden />
      </span>
      <div>
        <p className="text-[--text-body] font-semibold text-ink-700">{title}</p>
        {hint && <p className="mt-1 max-w-sm text-[--text-caption] leading-relaxed text-ink-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[--radius-ctl] bg-ink-100 ${className}`} aria-hidden />;
}

/* ───────────────────────────── Stat ───────────────────────────── */

export function Stat({
  label,
  value,
  delta,
  deltaLabel,
  /** ارتفاع البلاغات سيئ وارتفاع الرضا جيد — الاتجاه لا يحدد النغمة */
  deltaGood = true,
  sub,
  onClick,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaLabel?: string;
  deltaGood?: boolean;
  sub?: string;
  onClick?: () => void;
  icon?: typeof Inbox;
}) {
  const up = (delta ?? 0) > 0;
  const good = up === deltaGood;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[--text-caption] font-medium text-ink-500">{label}</p>
        {Icon && <Icon size={16} className="shrink-0 text-ink-300" aria-hidden />}
      </div>
      <p className="tnum mt-2 text-[1.75rem] font-bold leading-none text-ink-900">{value}</p>
      {delta !== undefined && (
        <p
          className={`mt-2 flex items-center gap-1 text-[--text-caption] font-semibold ${
            good ? 'text-ok-600' : 'text-danger-600'
          }`}
        >
          {/* السهم نصي + اللون — لا اعتماد على اللون وحده */}
          <span aria-hidden>{up ? '▲' : '▼'}</span>
          <span className="tnum">{Math.abs(delta)}%</span>
          {deltaLabel && <span className="font-normal text-ink-500">{deltaLabel}</span>}
        </p>
      )}
      {sub && <p className="mt-1 text-[--text-caption] text-ink-500">{sub}</p>}
    </>
  );
  return onClick ? (
    <Card onClick={onClick} ariaLabel={`${label}: ${value}`}>
      {body}
    </Card>
  ) : (
    <Card>{body}</Card>
  );
}

/* ───────────────────────────── Toast host ───────────────────────────── */

export interface ToastItem {
  id: string;
  titleAr: string;
  bodyAr?: string;
  tone: 'ok' | 'warn' | 'bad' | 'info';
}

export function useDismissAfter(ms: number, fn: () => void, dep: unknown) {
  useEffect(() => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}

export { useState, useEffect, useRef };
