import { Card, SectionTitle } from '@dq/ui';

/** §9 + §17 — list only, NO figures anywhere; strict «—» placeholders. */
export function Payments() {
  const rows = [
    ['رسوم الخدمات — الربع الثالث 2026', 'مستحق', 'bad'],
    ['رسوم الخدمات — الربع الثاني 2026', 'مسدد', 'ok'],
    ['اشتراك ملعب البادل — يوليو', 'مسدد', 'ok'],
    ['رسوم تصريح فعالية خاصة', 'مسدد', 'ok'],
  ] as const;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <SectionTitle>المدفوعات</SectionTitle>
      <Card className="p-0">
        {rows.map(([label, status, tone]) => (
          <div key={label} className="flex items-center justify-between border-b border-ink-100 p-4 text-sm last:border-0">
            <div>
              <p className="font-medium">{label}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[--text-micro] ${tone === 'ok' ? 'bg-ok-600-50 text-ok-600' : 'bg-danger-50 text-danger-600'}`}>
                {status}
              </span>
            </div>
            <span className="plate text-ink-500">— ر.س</span>
          </div>
        ))}
      </Card>
      <p className="text-center text-[--text-caption] text-ink-500">القيم المالية والفوترة خارج نطاق نموذج الإثبات</p>
    </div>
  );
}
