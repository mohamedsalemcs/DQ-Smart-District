import { useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, Copy, ExternalLink, MapPin, PackagePlus, PackageSearch, Phone, XCircle } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, Field, Input, Modal, SectionTitle, Select, TextArea } from '@dq/ui';
import { KpiCard } from '../components/charts';
import { portalUrl } from '../lib/portal';
import { fmtDate, fmtDateTime } from '@dq/core';
import { lostFoundCategoryAr, lostFoundColorsAr, lostFoundStatusAr } from '@dq/core';
import type { LostFoundCategory } from '@dq/core';

const statusCls = {
  open: 'bg-ink-50 text-ink-500',
  matched: 'bg-warn-600-50 text-warn-600',
  returned: 'bg-ok-600-50 text-ok-600',
} as const;

const kindCls = { lost: 'bg-danger-50 text-danger-600', found: 'bg-brand-50 text-brand-600' } as const;
const kindAr = { lost: 'مفقود', found: 'معثور عليه' } as const;

/** المفقودات — found items are logged here (gate/facility hand-ins); lost items
 *  arrive from the public /lost link and auto-match into claim requests. */
export function AdminLostFound() {
  const store = useStore();
  const items = store.lostFoundItems;

  const [filter, setFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [category, setCategory] = useState<LostFoundCategory>('electronics');
  const [color, setColor] = useState<string>(lostFoundColorsAr[0]);
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reporterName, setReporterName] = useState(
    () => store.people.find((p) => p.id === store.currentUsers.admin)?.nameAr ?? '',
  );
  const [reporterPhone, setReporterPhone] = useState('0500000000');

  /* claim requests — كل تطابق يظهر مرة واحدة مفتاحه بلاغ الفقدان */
  const claims = useMemo(
    () =>
      items
        .filter((i) => i.kind === 'lost' && i.status === 'matched')
        .map((lost) => ({ lost, found: items.find((x) => x.id === lost.matchedItemId) }))
        .filter((c) => c.found),
    [items],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'lost' || filter === 'found') return items.filter((i) => i.kind === filter);
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const submitFound = () => {
    const created = store.reportFoundItem({
      category,
      colorAr: color,
      descriptionAr: desc,
      locationAr: location,
      dateISO: new Date(date).toISOString(),
      reporterNameAr: reporterName,
      reporterPhone,
    });
    if (created) {
      setFormOpen(false);
      setDesc('');
      setLocation('');
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard?.writeText(portalUrl('/lost')).catch(() => {});
    store.pushToast('نُسخ رابط بلاغات المفقودات', 'شاركه في قنوات الحي وعند البوابات', 'ok');
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        sub="الأغراض المعثور عليها تُسجّل هنا، وبلاغات الفقدان تصل من الرابط العام وتُطابق آليًا"
        action={<Button size="sm" onClick={() => setFormOpen(true)}><PackagePlus size={14} /> تسجيل غرض معثور عليه</Button>}
      >
        المفقودات
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="بلاغات فقدان مفتوحة" value={items.filter((i) => i.kind === 'lost' && i.status === 'open').length} />
        <KpiCard label="أغراض بانتظار صاحبها" value={items.filter((i) => i.kind === 'found' && i.status === 'open').length} />
        <KpiCard label="طلبات استلام قيد التحقق" value={claims.length} />
        <KpiCard label="أغراض سُلّمت" value={items.filter((i) => i.kind === 'found' && i.status === 'returned').length} />
      </div>

      {/* public link */}
      <div className="flex flex-wrap items-center gap-3 rounded-card bg-ink-0 p-4 text-ink-800 ring-1 ring-brand-500/30">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-600"><PackageSearch size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">رابط عام — بلاغ فقدان غرض</p>
          <p className="text-caption text-ink-500">يبلّغ عبره الزوار والسكان دون تسجيل دخول، ويُطابَق بلاغهم آليًا مع الأغراض المسجلة هنا</p>
        </div>
        <bdi dir="ltr" className="plate hidden rounded bg-ink-0/10 px-2.5 py-1 text-micro text-ink-500 sm:block">/lost</bdi>
        <Button size="sm" variant="outline" className="border-ink-300 !text-ink-800" onClick={copyPublicLink}>
          <Copy size={13} /> نسخ الرابط
        </Button>
        <a href={portalUrl('/lost')} target="_blank" rel="noreferrer">
          <Button size="sm"><ExternalLink size={13} /> فتح الصفحة</Button>
        </a>
      </div>

      {/* claim requests */}
      <Card className="p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <ArrowLeftRight size={15} className="text-brand-600" /> طلبات الاستلام — تطابق آلي بانتظار التحقق
        </p>
        {claims.length === 0 && <EmptyState title="لا طلبات استلام معلقة" />}
        <div className="grid gap-3 lg:grid-cols-2">
          {claims.map(({ lost, found }) => (
            <div key={lost.id} className="rounded-card bg-ink-50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{lostFoundCategoryAr[lost.category]} · {lost.colorAr}</p>
                <span className="text-micro tabular-nums text-ink-500">{lost.matchedISO ? fmtDateTime(lost.matchedISO) : ''}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-card bg-ink-0 p-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-micro font-semibold ${kindCls.lost}`}>بلاغ الفقدان</span>
                  <p className="mt-1.5 text-caption">{lost.descriptionAr}</p>
                  <p className="mt-1 flex items-center gap-1 text-micro text-ink-500">
                    <Phone size={10} /> {lost.reporterNameAr} · <bdi dir="ltr">{lost.reporterPhone}</bdi>
                  </p>
                  <bdi dir="ltr" className="plate mt-1 block text-micro text-ink-500">{lost.refNo}</bdi>
                </div>
                <div className="rounded-card bg-ink-0 p-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-micro font-semibold ${kindCls.found}`}>الغرض المعثور عليه</span>
                  <p className="mt-1.5 text-caption">{found!.descriptionAr}</p>
                  <p className="mt-1 flex items-center gap-1 text-micro text-ink-500">
                    <MapPin size={10} /> {found!.locationAr ?? '—'} · {fmtDate(found!.dateISO)}
                  </p>
                  <bdi dir="ltr" className="plate mt-1 block text-micro text-ink-500">{found!.refNo}</bdi>
                </div>
              </div>
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" variant="success" onClick={() => store.resolveLostFoundMatch(lost.id, 'returned')}>
                  <CheckCircle2 size={13} /> تحقّقنا — تسليم الغرض
                </Button>
                <Button size="sm" variant="ghost" onClick={() => store.resolveLostFoundMatch(lost.id, 'unmatch')}>
                  <XCircle size={13} /> ليس التطابق الصحيح
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* all items */}
      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="text-sm font-bold">السجل الكامل</p>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-48">
            <option value="all">الكل</option>
            <option value="lost">بلاغات الفقدان</option>
            <option value="found">المعثور عليه</option>
            <option value="open">المفتوحة</option>
            <option value="matched">تطابق قيد التحقق</option>
            <option value="returned">المُسلّمة</option>
          </Select>
        </div>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-caption text-ink-500">
              <th className="p-3 text-start">المرجع</th>
              <th className="p-3 text-start">النوع</th>
              <th className="p-3 text-start">الغرض</th>
              <th className="p-3 text-start">المكان</th>
              <th className="p-3 text-start">التاريخ</th>
              <th className="p-3 text-start">المبلّغ</th>
              <th className="p-3 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-ink-100 hover:bg-ink-50">
                <td className="p-3"><bdi dir="ltr" className="plate text-caption">{i.refNo}</bdi></td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${kindCls[i.kind]}`}>{kindAr[i.kind]}</span>
                </td>
                <td className="p-3">
                  <p className="font-medium">{lostFoundCategoryAr[i.category]} · {i.colorAr}</p>
                  <p className="max-w-[26ch] truncate text-caption text-ink-500">{i.descriptionAr}</p>
                </td>
                <td className="p-3 text-caption text-ink-500">{i.locationAr ?? '—'}</td>
                <td className="p-3 tabular-nums text-caption text-ink-500">{fmtDate(i.dateISO)}</td>
                <td className="p-3">
                  <p className="text-caption">{i.reporterNameAr}</p>
                  <bdi dir="ltr" className="text-micro text-ink-500">{i.reporterPhone}</bdi>
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${statusCls[i.status]}`}>
                    {lostFoundStatusAr[i.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title="لا عناصر ضمن هذا التصنيف" />}
      </Card>

      {/* found item form */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="تسجيل غرض معثور عليه">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="التصنيف">
              <Select value={category} onChange={(e) => setCategory(e.target.value as LostFoundCategory)}>
                {Object.entries(lostFoundCategoryAr).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="اللون الغالب">
              <Select value={color} onChange={(e) => setColor(e.target.value)}>
                {lostFoundColorsAr.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="الوصف *">
            <TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="مثال: سماعات لاسلكية في علبة شحن" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="مكان العثور">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: البوابة الرئيسية" />
            </Field>
            <Field label="تاريخ العثور">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="مستلم الغرض">
              <Input value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
            </Field>
            <Field label="جوال التواصل">
              <Input value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} inputMode="tel" />
            </Field>
          </div>
          <p className="rounded-card bg-ink-50 p-2.5 text-caption text-ink-500">
            عند الحفظ يُطابَق الغرض آليًا مع بلاغات الفقدان المفتوحة (التصنيف واللون نفسهما) ويُفتح طلب استلام تلقائيًا عند التطابق.
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button onClick={submitFound}><PackagePlus size={14} /> تسجيل الغرض</Button>
        </div>
      </Modal>
    </div>
  );
}
