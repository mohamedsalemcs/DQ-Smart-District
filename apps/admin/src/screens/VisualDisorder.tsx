import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Eye, ScrollText, Timer } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, SectionTitle, Select } from '@dq/ui';
import { MapCanvas } from '../components/MapCanvas';
import { KpiCard, chartTooltip } from '../components/charts';
import { requestPill } from '../components/StatusPill';
import { SlaBadge } from '../components/SlaBadge';
import { MediaGrid } from '../components/MediaGrid';
import { priorityAr, requestStatusAr } from '@dq/core';

const C = { teal: '#099384', amber: '#b45309', blue: '#1d4ed8', crimson: '#9f1239' } as const;

/* اشتراطات المظهر العام — تُعرض للمشغّل كمرجع سريع عند التعامل مع البلاغات */
const GUIDELINES = [
  'اللوحات التجارية موحّدة القياس والخامة وفق دليل الهوية العمرانية للحي',
  'أعمال الترميم والبناء خلف سواتر نظامية طوال مدة الرخصة',
  'الواجهات والأسوار بالألوان المعتمدة — أي تغيير يتطلب موافقة مسبقة',
  'يُمنع الإلصاق والكتابة على الجدران والأثاث العام، والمخالفة تُزال على نفقة المتسبب',
];

/** التشوه البصري — بلاغات المظهر العام على خريطة الحي مع دورة معالجة كاملة */
export function VisualDisorder() {
  const store = useStore();
  const [filter, setFilter] = useState('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = useMemo(() => store.requests.filter((r) => r.kind === 'visual_disorder'), [store.requests]);
  const active = useMemo(() => all.filter((r) => r.status !== 'closed'), [all]);

  const list = useMemo(() => {
    if (filter === 'active') return active;
    if (filter === 'all') return all;
    return all.filter((r) => r.status === filter);
  }, [filter, all, active]);

  const selected = all.find((r) => r.id === selectedId) ?? list[0];

  const closed = all.filter((r) => r.status === 'closed');
  const slaOk = all.length ? Math.round((all.filter((r) => !r.slaBreached).length / all.length) * 100) : 100;

  const donut = [
    { name: 'مغلقة', value: closed.length, color: C.teal },
    { name: 'قيد المعالجة', value: all.filter((r) => ['triaged', 'assigned', 'in_progress', 'awaiting_verification'].includes(r.status)).length, color: C.amber },
    { name: 'جديدة', value: all.filter((r) => r.status === 'new' || r.status === 'reopened').length, color: C.blue },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle
        sub="رصد ومعالجة كل ما يخل بالمظهر العام — لوحات مخالفة، كتابات، مواد مكشوفة، واجهات متهالكة"
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-44">
            <option value="active">النشطة</option>
            <option value="all">الكل</option>
            {Object.entries(requestStatusAr).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        }
      >
        التشوه البصري
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="بلاغات نشطة" value={active.length} suffix="قيد المتابعة" sparkColor={C.blue} />
        <KpiCard label="عولجت وأُغلقت" value={closed.length} suffix="بلاغًا" />
        <KpiCard label="الالتزام بمهل المعالجة" value={`${slaOk}%`} suffix="ضمن SLA" />
        <KpiCard label="متوسط أولوية النشطة" value={active.some((r) => r.priority === 'urgent') ? 'عاجلة' : active.some((r) => r.priority === 'high') ? 'عالية' : 'عادية'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* map + list */}
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">مواقع التشوه البصري — اضغط علامة لفتح البلاغ</p>
          <MapCanvas
            className="mb-3 aspect-[16/10]"
            markers={list.map((r) => ({
              id: r.id,
              lat: r.lat,
              lng: r.lng,
              color: selected?.id === r.id ? C.amber : r.status === 'closed' ? C.teal : r.status === 'new' ? C.crimson : C.blue,
              labelAr: r.descriptionAr.slice(0, 50),
              pulse: selected?.id === r.id,
              glyph: 'ع',
              onClick: () => setSelectedId(r.id),
            }))}
          />
          <div className="space-y-1.5">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`block w-full rounded-card p-3 text-start ${selected?.id === r.id ? 'bg-brand-50 ring-1 ring-brand-500' : 'bg-ink-50 hover:bg-brand-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{r.descriptionAr.slice(0, 42)}…</span>
                  {requestPill(r.status)}
                </div>
                <div className="mt-1.5"><SlaBadge req={r} /></div>
              </button>
            ))}
            {list.length === 0 && <EmptyState title="لا بلاغات ضمن هذا التصنيف" />}
          </div>
        </Card>

        {/* detail */}
        {selected ? (
          <Card className="lg:col-span-2 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-1.5 text-base font-bold"><Eye size={16} className="text-brand-600" /> بلاغ تشوه بصري</h2>
                <p className="mt-1 text-sm text-ink-500">{selected.descriptionAr}</p>
                <p className="mt-1 text-caption text-ink-500">
                  الأولوية: {priorityAr[selected.priority]} · المبلّغ: {store.people.find((p) => p.id === selected.raisedBy)?.nameAr ?? 'النظام'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {requestPill(selected.status)}
                <SlaBadge req={selected} />
              </div>
            </div>

            {selected.assignedToOrgId && (
              <p className="mt-3 rounded-card bg-ink-50 p-2.5 text-caption">
                مُسند إلى: <b>{store.organizations.find((o) => o.id === selected.assignedToOrgId)?.nameAr}</b>
              </p>
            )}

            <div className="mt-4"><MediaGrid before={selected.mediaBefore} after={selected.mediaAfter} /></div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(selected.status === 'new' || selected.status === 'reopened') && (
                <Link to="/requests"><Button><ClipboardList size={15} /> تصنيف وإسناد من قائمة الطلبات</Button></Link>
              )}
              {selected.status === 'in_progress' && (
                <Button onClick={() => store.completeRequestWork(selected.id)}><CheckCircle2 size={15} /> اكتمال المعالجة + صور بعد</Button>
              )}
              {selected.status === 'awaiting_verification' && (
                <Button variant="success" onClick={() => store.approveRequestClosure(selected.id)}><CheckCircle2 size={15} /> اعتماد الإغلاق</Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="lg:col-span-2 p-5"><EmptyState title="اختر بلاغًا" /></Card>
        )}

        {/* status + guidelines */}
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-2 text-caption font-semibold text-ink-500">حالة بلاغات التشوه</p>
            <div className="relative h-36" dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={40} outerRadius={58} paddingAngle={3} strokeWidth={2} stroke="#fff">
                    {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...chartTooltip(false)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold tabular-nums leading-none">{all.length}</p>
                <p className="text-micro text-ink-500">بلاغ</p>
              </div>
            </div>
            <div className="mt-1 space-y-1">
              {donut.map((d) => (
                <span key={d.name} className="flex items-center justify-between text-caption">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                  <b className="tabular-nums">{d.value}</b>
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-ink-500">
              <ScrollText size={13} className="text-brand-600" /> اشتراطات المظهر العام
            </p>
            <ul className="space-y-2">
              {GUIDELINES.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-caption leading-relaxed">
                  <Timer size={12} className="mt-0.5 shrink-0 text-brand-600" />
                  {g}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
