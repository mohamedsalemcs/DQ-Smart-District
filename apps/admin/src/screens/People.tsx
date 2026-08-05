import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, DoorOpen, Home, Landmark, Search, Store } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@dq/core';
import { Card, Input, SectionTitle } from '@dq/ui';
import { MapCanvas } from '../components/MapCanvas';
import { axisTick, chartTooltip } from '../components/charts';
import { propertyTypeAr, roleAr } from '@dq/core';
import type { Property } from '@dq/core';

type UnitFilter = 'all' | 'occupied' | 'vacant' | 'residential' | 'commercial' | 'embassy';

const TYPE_COLORS: Record<Property['type'], string> = {
  villa: 'var(--color-viz-5)',
  apartment: '#7E9CC0',
  commercial: 'var(--color-viz-6)',
  embassy: 'var(--color-viz-2)',
  facility: 'var(--color-viz-3)',
};

export function AdminPeople() {
  const store = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<UnitFilter>('all');

  const props = store.properties;
  const isOccupied = (p: Property) => p.residentIds.length > 0;
  const matchesFilter = (p: Property) =>
    filter === 'all'
      ? true
      : filter === 'occupied'
        ? isOccupied(p)
        : filter === 'vacant'
          ? !isOccupied(p)
          : filter === 'residential'
            ? p.type === 'villa' || p.type === 'apartment'
            : p.type === filter;

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return props.filter(matchesFilter).filter((p) => {
      if (!n) return true;
      const owner = store.people.find((x) => x.id === p.ownerId);
      return p.code.toLowerCase().includes(n) || p.unitNo.includes(q) || (owner?.nameAr ?? '').includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, props, store.people]);

  const counts = {
    all: props.length,
    occupied: props.filter(isOccupied).length,
    vacant: props.filter((p) => !isOccupied(p)).length,
    residential: props.filter((p) => p.type === 'villa' || p.type === 'apartment').length,
    commercial: props.filter((p) => p.type === 'commercial').length,
    embassy: props.filter((p) => p.type === 'embassy').length,
  };

  const cards: { key: UnitFilter; labelAr: string; hint: string; count: number; icon: typeof Home; cls: string }[] = [
    { key: 'all', labelAr: 'إجمالي الوحدات', hint: 'كل عقارات الحي', count: counts.all, icon: Building2, cls: 'text-ink-800' },
    { key: 'occupied', labelAr: 'مشغولة', hint: 'وحدات مسكونة/عاملة', count: counts.occupied, icon: Home, cls: 'text-ok-600' },
    { key: 'vacant', labelAr: 'شاغرة — متاحة', hint: 'جاهزة للتخصيص', count: counts.vacant, icon: DoorOpen, cls: 'text-warn-600' },
    { key: 'residential', labelAr: 'سكني', hint: 'فلل وشقق', count: counts.residential, icon: Home, cls: 'text-info-500' },
    { key: 'commercial', labelAr: 'تجاري وخدمي', hint: 'مدرسة · عيادات · سوق', count: counts.commercial, icon: Store, cls: 'text-warn-600' },
    { key: 'embassy', labelAr: 'سفارات', hint: 'بعثات دبلوماسية', count: counts.embassy, icon: Landmark, cls: 'text-brand-600' },
  ];

  const donut = (['villa', 'apartment', 'commercial', 'embassy'] as const).map((t) => ({
    name: propertyTypeAr[t],
    value: props.filter((p) => p.type === t).length,
    color: TYPE_COLORS[t],
  }));

  const zoneBars = useMemo(() => {
    const zones = [...new Set(props.map((p) => p.zone))];
    return zones.map((z) => ({
      zone: z.replace('القطاع ', '').replace('حي ', '').replace('قطاع ', ''),
      مشغولة: props.filter((p) => p.zone === z && isOccupied(p)).length,
      شاغرة: props.filter((p) => p.zone === z && !isOccupied(p)).length,
    }));
  }, [props]);

  return (
    <div className="space-y-4">
      <SectionTitle
        sub="اضغط أي بطاقة لتصفية الخريطة والجدول على ذلك النوع"
        action={
          <div className="relative w-64">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <Input placeholder="بحث بالكود أو الوحدة أو المالك…" value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
          </div>
        }
      >
        السكان والعقارات
      </SectionTitle>

      {/* filter cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(filter === c.key ? 'all' : c.key)}
            className={`rounded-card bg-ink-0 p-4 text-start ring-1 transition-all hover:-translate-y-0.5 ${
              filter === c.key ? 'ring-2 ring-brand-500' : 'ring-ink-100'
            }`}
           
          >
            <div className="flex items-center justify-between">
              <c.icon size={16} className={c.cls} />
              {filter === c.key && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-micro font-bold text-ink-900">مفعّل</span>}
            </div>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${c.cls}`}>{c.count}</p>
            <p className="text-caption font-semibold">{c.labelAr}</p>
            <p className="text-micro text-ink-500">{c.hint}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* units map */}
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">
            خريطة الوحدات ({filtered.length}) — اضغط علامة لفتح ملف العقار
          </p>
          <MapCanvas
            className="aspect-[16/10]"
            markers={filtered.map((p) => ({
              id: p.id,
              lat: p.lat,
              lng: p.lng,
              color: isOccupied(p) ? TYPE_COLORS[p.type] : 'var(--color-viz-4)',
              labelAr: `${p.code} — ${p.unitNo} · ${isOccupied(p) ? 'مشغولة' : 'شاغرة'}`,
              pulse: !isOccupied(p) && (filter === 'vacant' || filter === 'all'),
              glyph: p.type === 'embassy' ? 'س' : p.type === 'commercial' ? 'ت' : undefined,
              onClick: () => navigate(`/properties/${p.id}`),
            }))}
          />
          <div className="mt-2 flex flex-wrap gap-3 px-1 text-micro text-ink-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.villa }} /> فيلا</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.apartment }} /> شقة</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.commercial }} /> تجاري</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.embassy }} /> سفارة</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger-600" /> شاغرة</span>
          </div>
        </Card>

        {/* charts */}
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-2 text-caption font-semibold text-ink-500">تكوين الوحدات</p>
            <div className="h-36" dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={3} strokeWidth={0}>
                    {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...chartTooltip(false)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              {donut.map((d) => (
                <span key={d.name} className="flex items-center justify-between text-caption">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                  <b className="tabular-nums">{d.value}</b>
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-caption font-semibold text-ink-500">الإشغال حسب القطاع</p>
            <div className="h-40" dir="ltr">
              <ResponsiveContainer>
                <BarChart data={zoneBars} barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f5" vertical={false} />
                  <XAxis dataKey="zone" tick={axisTick(false)} tickMargin={5} reversed />
                  <YAxis tick={axisTick(false)} width={22} allowDecimals={false} orientation="right" />
                  <Tooltip {...chartTooltip(false)} />
                  <Bar dataKey="مشغولة" stackId="a" fill="#0e7c4a" maxBarSize={22} />
                  <Bar dataKey="شاغرة" stackId="a" fill="#9a5b0a" radius={[2, 2, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* table */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-caption text-ink-500">
              <th className="p-3 text-start">الكود</th>
              <th className="p-3 text-start">الوحدة</th>
              <th className="p-3 text-start">النوع</th>
              <th className="p-3 text-start">القطاع</th>
              <th className="p-3 text-start">الحالة</th>
              <th className="p-3 text-start">المالك / الجهة</th>
              <th className="p-3 text-start">مقيمون</th>
              <th className="p-3 text-start">مركبات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const owner = store.people.find((x) => x.id === p.ownerId);
              const occ = isOccupied(p);
              return (
                <tr key={p.id} className="border-b border-ink-100 hover:bg-ink-50">
                  <td className="p-3">
                    <Link to={`/properties/${p.id}`} className="font-semibold text-ink-900 hover:text-brand-600">{p.code}</Link>
                  </td>
                  <td className="p-3">{p.unitNo}</td>
                  <td className="p-3">{propertyTypeAr[p.type]}{p.subtypeAr ? ` · ${p.subtypeAr.split(' ')[0]}` : ''}</td>
                  <td className="p-3 text-ink-500">{p.zone}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${occ ? 'bg-ok-600-50 text-ok-600' : 'bg-warn-600-50 text-warn-600'}`}>
                      {occ ? 'مشغولة' : 'شاغرة'}
                    </span>
                  </td>
                  <td className="p-3">{owner?.nameAr} <span className="text-caption text-ink-500">({owner ? roleAr[owner.role] : ''})</span></td>
                  <td className="p-3 tabular-nums">{p.residentIds.length}</td>
                  <td className="p-3 tabular-nums">{p.vehicleIds.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
