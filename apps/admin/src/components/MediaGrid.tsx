import { Camera } from 'lucide-react';

/** No backend, no broken images: media is rendered as labelled placeholder tiles. */
export function MediaGrid({ before, after }: { before: string[]; after: string[] }) {
  if (before.length === 0 && after.length === 0) return null;
  const tile = (label: string, tone: 'before' | 'after', key: string) => (
    <figure
      key={key}
      className={`flex h-28 flex-col items-center justify-center gap-1.5 rounded-card border ${
        tone === 'after' ? 'border-ok-500 bg-ok-600-50 text-ok-600' : 'border-ink-300 bg-ink-50 text-ink-500'
      }`}
    >
      <Camera size={20} strokeWidth={1.5} />
      <figcaption className="text-caption font-medium">{label}</figcaption>
    </figure>
  );
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {before.map((_, i) => tile(`صورة قبل المعالجة ${before.length > 1 ? i + 1 : ''}`, 'before', `b${i}`))}
      {after.map((_, i) => tile(`صورة بعد المعالجة ${after.length > 1 ? i + 1 : ''}`, 'after', `a${i}`))}
    </div>
  );
}
