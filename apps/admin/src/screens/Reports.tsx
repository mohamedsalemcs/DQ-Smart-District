import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@dq/core';
import { Card, SectionTitle, Stat } from '@dq/ui';
import { Map3D } from '../components/three/DQTwin';
import { requestKindAr } from '@dq/core';

/** §10 — heat map, response times, repeat violations. Charts only where the deck shows charts. */
export function AdminReports() {
  const store = useStore();

  const byKind = useMemo(() => {
    const acc: Record<string, number> = {};
    store.requests.forEach((r) => {
      const k = requestKindAr[r.kind];
      acc[k] = (acc[k] ?? 0) + 1;
    });
    return Object.entries(acc).map(([name, count]) => ({ name, count }));
  }, [store.requests]);

  const repeatViolators = useMemo(
    () => store.violations.filter((v) => v.repeatCount > 1),
    [store.violations],
  );

  const responded = store.incidents.filter((i) => i.dispatch?.responseSeconds != null);
  const avgResp = responded.length ? Math.round(responded.reduce((a, i) => a + i.dispatch!.responseSeconds!, 0) / responded.length) : 0;
  const rated = store.requests.filter((r) => r.rating);
  const avgRating = rated.length ? (rated.reduce((a, r) => a + (r.rating ?? 0), 0) / rated.length).toFixed(1) : '—';

  const donut = [
    { name: 'مغلقة', value: store.requests.filter((r) => r.status === 'closed').length, color: 'var(--color-viz-3)' },
    { name: 'قيد المعالجة', value: store.requests.filter((r) => ['assigned', 'in_progress', 'awaiting_verification', 'triaged'].includes(r.status)).length, color: 'var(--color-viz-6)' },
    { name: 'جديدة', value: store.requests.filter((r) => r.status === 'new' || r.status === 'reopened').length, color: 'var(--color-viz-4)' },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle>التقارير</SectionTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="متوسط زمن الاستجابة الأمنية" value={`${Math.floor(avgResp / 60)}:${String(avgResp % 60).padStart(2, '0')}`} />
        <Stat label="متوسط تقييم الخدمة" value={avgRating} />
        <Stat label="مخالفات متكررة" value={repeatViolators.length} />
        <Stat label="إجمالي قيود التدقيق" value={store.audit.length} sub="قيد يُكتب مع كل عملية" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="mb-3 text-caption font-semibold text-ink-500">البلاغات حسب النوع</p>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={byKind} layout="vertical" margin={{ right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#5c6d6d' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 10, fill: '#1f2a29' }} />
                <Tooltip contentStyle={{ borderRadius: 6, direction: 'rtl', fontSize: 12 }} />
                <Bar dataKey="count" name="عدد" fill="#0e6a60" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-caption font-semibold text-ink-500">حالة الطلبات</p>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={3}>
                  {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 6, direction: 'rtl', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 text-caption">
            {donut.map((d) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">الخريطة الحية — تركز البلاغات والمخالفات</p>
          <Map3D layers={{ requests: true, violations: true }} className="aspect-square" />
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-2 text-caption font-semibold text-ink-500">المخالفات المتكررة — مرشحة للتصعيد</p>
        {repeatViolators.length === 0 && <p className="py-2 text-center text-caption text-ink-500">لا مخالفات متكررة حالياً</p>}
        {repeatViolators.map((v) => {
          const veh = v.subject === 'vehicle' ? store.vehicles.find((x) => x.id === v.subjectId) : undefined;
          return (
            <div key={v.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm last:border-0">
              <span>{v.code} — {v.labelAr}{veh ? ` · ${veh.plate}` : ''}</span>
              <span className="rounded-full bg-danger-50 px-2 py-0.5 text-caption font-semibold text-danger-600">تكرار {v.repeatCount}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
