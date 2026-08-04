import { useStore } from '@dq/core';
import { Card, SectionTitle } from '@dq/ui';

export function AdminContracts() {
  const store = useStore();
  const contractors = store.organizations.filter((o) => ['cleaning', 'landscape', 'maintenance', 'security'].includes(o.kind));
  const kindAr = { cleaning: 'نظافة', landscape: 'تشجير وري', maintenance: 'صيانة', security: 'أمن', school: 'تعليم', embassy: 'دبلوماسي' } as const;

  return (
    <div className="space-y-4">
      <SectionTitle>الشركات والعقود</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {contractors.map((o) => {
          const activeReqs = store.requests.filter((r) => r.assignedToOrgId === o.id && r.status !== 'closed').length;
          return (
            <Card key={o.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold">{o.nameAr}</p>
                  <p className="text-caption text-ink-500">{kindAr[o.kind]}</p>
                </div>
                <span className="rounded-full bg-ink-50 px-2.5 py-1 text-caption">عقد ساري</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className={`text-xl font-bold tabular-nums ${o.kpiOnTime >= 90 ? 'text-ok-600' : 'text-warn-600'}`}>{o.kpiOnTime}%</p>
                  <p className="text-caption text-ink-500">إنجاز في الوقت</p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">{o.kpiRating}</p>
                  <p className="text-caption text-ink-500">تقييم السكان /5</p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">{activeReqs}</p>
                  <p className="text-caption text-ink-500">مهام نشطة</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-50">
                <div className={`h-full ${o.kpiOnTime >= 90 ? 'bg-ok-600' : 'bg-warn-600'}`} style={{ width: `${o.kpiOnTime}%` }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
