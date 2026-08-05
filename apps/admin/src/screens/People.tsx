import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, Crown, DoorOpen, Home, Landmark, Search, Store, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@dq/core';
import { Button, Card, Input, SectionTitle } from '@dq/ui';
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

const PAGE_SIZE = 25;
const MAP_CAP = 400;

export function AdminPeople() {
  const store = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<UnitFilter>('all');
  const [vipOnly, setVipOnly] = useState(false);
  const [page, setPage] = useState(0);

  const props = store.properties;
  const isOccupied = (p: Property) => p.residentIds.length > 0;

  /* فهارس — البحث والجدول على ‎3 آلاف وحدة و‎11 ألف ساكن لا يتحمل find خطيًا لكل صف */
  const peopleById = useMemo(() => new Map(store.people.map((p) => [p.id, p])), [store.people]);
  const vips = useMemo(() => store.people.filter((p) => p.vipTitleAr), [store.people]);
  const vipPropIds = useMemo(() => new Set(vips.map((v) => v.propertyId).filter(Boolean)), [vips]);

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
      if (vipOnly && !vipPropIds.has(p.id)) return false;
      if (!n) return true;
      const owner = peopleById.get(p.ownerId);
      return (
        p.code.toLowerCase().includes(n) ||
        p.unitNo.includes(q) ||
        (owner?.nameAr ?? '').includes(q) ||
        (owner?.vipTitleAr ?? '').includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, vipOnly, props, peopleById, vipPropIds]);

  useEffect(() => setPage(0), [q, filter, vipOnly]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const counts = useMemo(() => ({
    all: props.length,
    occupied: props.filter(isOccupied).length,
    vacant: props.filter((p) => !isOccupied(p)).length,
    residential: props.filter((p) => p.type === 'villa' || p.type === 'apartment').length,
    commercial: props.filter((p) => p.type === 'commercial').length,
    embassy: props.filter((p) => p.type === 'embassy').length,
  }), [props]);

  const residentsCount = useMemo(
    () => store.people.filter((p) => p.role === 'owner' || p.role === 'tenant' || p.role === 'resident' || p.role === 'embassy_rep' || p.role === 'company_rep').length,
    [store.people],
  );

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

  const mapMarkers = filtered.slice(0, MAP_CAP);

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

      {/* population strip */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-card bg-ink-0 p-4 ring-1 ring-ink-100">
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-card bg-brand-50 text-brand-600"><Users size={17} /></span>
          <span>
            <b className="block text-xl font-bold leading-none tabular-nums">{residentsCount.toLocaleString('en')}</b>
            <span className="text-caption text-ink-500">ساكن وممثل جهة مسجل</span>
          </span>
        </span>
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-card bg-brand-50 text-brand-600"><Building2 size={17} /></span>
          <span>
            <b className="block text-xl font-bold leading-none tabular-nums">{counts.all.toLocaleString('en')}</b>
            <span className="text-caption text-ink-500">وحدة عقارية</span>
          </span>
        </span>
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-card text-warn-600" style={{ background: 'color-mix(in srgb, #b45309 12%, #fff)' }}><Crown size={17} /></span>
          <span>
            <b className="block text-xl font-bold leading-none tabular-nums">{vips.length}</b>
            <span className="text-caption text-ink-500">شخصية هامة</span>
          </span>
        </span>
        <span className="flex-1" />
        <Button size="sm" variant={vipOnly ? 'primary' : 'outline'} onClick={() => setVipOnly((v) => !v)}>
          <Crown size={13} /> {vipOnly ? 'عرض الكل' : 'الشخصيات الهامة فقط'}
        </Button>
      </div>

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
            <p className={`mt-2 text-2xl font-bold tabular-nums ${c.cls}`}>{c.count.toLocaleString('en')}</p>
            <p className="text-caption font-semibold">{c.labelAr}</p>
            <p className="text-micro text-ink-500">{c.hint}</p>
          </button>
        ))}
      </div>

      {/* VIP panel */}
      {vipOnly && (
        <Card className="p-4 ring-1 ring-warn-600/40">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold"><Crown size={15} className="text-warn-600" /> الشخصيات الهامة في الحي</p>
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {vips.map((v) => {
              const home = props.find((p) => p.id === v.propertyId);
              return (
                <div key={v.id} className="flex items-center gap-3 rounded-card bg-ink-50 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-warn-600" style={{ background: 'color-mix(in srgb, #b45309 14%, #fff)' }}>
                    <Crown size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.nameAr}</p>
                    <p className="text-caption text-warn-600">{v.vipTitleAr}</p>
                  </div>
                  {home && (
                    <Link to={`/properties/${home.id}`} className="shrink-0 text-caption text-brand-600 hover:underline">{home.code}</Link>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* units map */}
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">
            خريطة الوحدات ({filtered.length.toLocaleString('en')})
            {filtered.length > MAP_CAP ? ` — تعرض أول ${MAP_CAP} وحدة ضمن التصفية؛ ضيّق البحث للباقي` : ' — اضغط علامة لفتح ملف العقار'}
          </p>
          <MapCanvas
            className="aspect-[16/10]"
            markers={mapMarkers.map((p) => ({
              id: p.id,
              lat: p.lat,
              lng: p.lng,
              color: vipPropIds.has(p.id) ? '#b45309' : isOccupied(p) ? TYPE_COLORS[p.type] : 'var(--color-viz-4)',
              labelAr: `${p.code} — ${p.unitNo} · ${isOccupied(p) ? 'مشغولة' : 'شاغرة'}${vipPropIds.has(p.id) ? ' · شخصية هامة' : ''}`,
              pulse: vipPropIds.has(p.id) && vipOnly,
              glyph: vipPropIds.has(p.id) ? '★' : p.type === 'embassy' ? 'س' : p.type === 'commercial' ? 'ت' : undefined,
              onClick: () => navigate(`/properties/${p.id}`),
            }))}
          />
          <div className="mt-2 flex flex-wrap gap-3 px-1 text-micro text-ink-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.villa }} /> فيلا</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.apartment }} /> شقة</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.commercial }} /> تجاري</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLORS.embassy }} /> سفارة</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#b45309' }} /> شخصية هامة</span>
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
                  <b className="tabular-nums">{d.value.toLocaleString('en')}</b>
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
                  <YAxis tick={axisTick(false)} width={30} allowDecimals={false} orientation="right" />
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
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="text-sm font-bold">
            سجل الوحدات <span className="font-normal text-ink-500">({filtered.length.toLocaleString('en')} وحدة ضمن التصفية)</span>
          </p>
          <div className="flex items-center gap-2 text-caption">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={13} /> السابق
            </Button>
            <span className="tabular-nums text-ink-500">صفحة {page + 1} من {pageCount.toLocaleString('en')}</span>
            <Button size="sm" variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
              التالي <ChevronLeft size={13} />
            </Button>
          </div>
        </div>
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
            {pageItems.map((p) => {
              const owner = peopleById.get(p.ownerId);
              const occ = isOccupied(p);
              const vip = owner?.vipTitleAr;
              return (
                <tr key={p.id} className={`border-b border-ink-100 hover:bg-ink-50 ${vip ? 'bg-[color-mix(in_srgb,#b45309_5%,transparent)]' : ''}`}>
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
                  <td className="p-3">
                    <span className="flex items-center gap-1.5">
                      {vip && <Crown size={13} className="shrink-0 text-warn-600" />}
                      <span>
                        {owner?.nameAr}{' '}
                        <span className={`text-caption ${vip ? 'font-semibold text-warn-600' : 'text-ink-500'}`}>
                          ({vip ?? (owner ? roleAr[owner.role] : '')})
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="p-3 tabular-nums">{p.residentIds.length}</td>
                  <td className="p-3 tabular-nums">{p.vehicleIds.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pageItems.length === 0 && <p className="p-6 text-center text-caption text-ink-500">لا وحدات ضمن هذه التصفية</p>}
      </Card>
    </div>
  );
}
