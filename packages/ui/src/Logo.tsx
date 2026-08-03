/**
 * الشعار — البوابة والدرع
 * ─────────────────────────────────────────────────────────────
 * القوس  = البوابة · المدخل · الاستقبال
 * الدرع  = الحماية · الحدّ · الأمان
 * المثلث = تضاريس نجد · الارتقاء
 * الفتحة السفلية = حيّ مفتوح لا حصن مغلق
 *
 * متجهي بالكامل — نسخة واحدة تولّد كل الأشكال.
 * يستبدل <span>DQ</span> النصي القديم.
 */

export type LogoTone = 'brand' | 'onDark' | 'mono';

interface MarkProps {
  size?: number;
  tone?: LogoTone;
  className?: string;
}

const TONES: Record<LogoTone, { shield: string; inner: string; peak: string }> = {
  brand: { shield: 'var(--color-brand-700)', inner: 'var(--color-brand-500)', peak: 'var(--color-brand-200)' },
  onDark: { shield: 'var(--color-brand-200)', inner: 'var(--color-brand-400)', peak: 'var(--color-brand-800)' },
  mono: { shield: 'currentColor', inner: 'currentColor', peak: 'transparent' },
};

export function LogoMark({ size = 32, tone = 'brand', className = '' }: MarkProps) {
  const c = TONES[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="الحي الدبلوماسي الذكي"
    >
      {/* الدرع — قوس علوي ورأس سفلي، فتحة في القاعدة */}
      <path
        d="M16 2.5c4.4 0 8.3 1.1 11 2.6v10.2c0 6.6-4.4 11.6-11 14.2C9.4 26.9 5 21.9 5 15.3V5.1C7.7 3.6 11.6 2.5 16 2.5Z"
        fill={c.shield}
      />
      {/* عتبة البوابة — القوس الداخلي */}
      <path
        d="M16 8.2c2.6 0 4.9.6 6.6 1.5v5.9c0 3.9-2.6 6.9-6.6 8.4-4-1.5-6.6-4.5-6.6-8.4V9.7c1.7-.9 4-1.5 6.6-1.5Z"
        fill={c.inner}
        fillOpacity={tone === 'mono' ? 0.35 : 1}
      />
      {/* المثلث — الارتقاء */}
      <path d="M16 12.4l4.1 7.1h-8.2L16 12.4Z" fill={c.peak} />
    </svg>
  );
}

interface LockupProps extends MarkProps {
  compact?: boolean;
  /** يخفي السطر الإنجليزي في المساحات الضيقة */
  subtitle?: string;
}

export function Logo({
  size = 32,
  tone = 'brand',
  compact = false,
  subtitle,
  className = '',
}: LockupProps) {
  const titleColor = tone === 'onDark' ? 'text-ink-0' : 'text-ink-900';
  const subColor = tone === 'onDark' ? 'text-brand-200' : 'text-ink-500';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} tone={tone} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-bold tracking-tight ${titleColor}`}
          style={{ fontSize: size * 0.47 }}
        >
          الحي الدبلوماسي الذكي
        </span>
        {!compact && (
          <span
            className={`mt-1 font-medium tracking-[0.08em] ${subColor}`}
            style={{ fontSize: size * 0.28 }}
          >
            {subtitle ?? 'DQ SMART DISTRICT'}
          </span>
        )}
      </span>
    </span>
  );
}
