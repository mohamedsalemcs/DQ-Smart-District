import { Link } from 'react-router-dom';
import { BadgePlus, CalendarPlus, FileWarning, Megaphone } from 'lucide-react';
import { useStore } from '@dq/core';
import { Card, SectionTitle } from '@dq/ui';
import { permitPill, requestPill } from '../components/StatusPill';
import { SlaBadge } from '../components/SlaBadge';
import { ago } from '@dq/core';
import { permitKindAr, requestKindAr } from '@dq/core';

export function ResidentHome() {
  const store = useStore();
  const me = store.people.find((p) => p.id === store.currentUsers.resident)!;
  const myRequests = store.requests.filter((r) => r.raisedBy === me.id && r.status !== 'closed');
  const myPermits = store.permits.filter((p) => p.requestedBy === me.id && ['approved', 'pending'].includes(p.status));

  const quick = [
    { to: '/r/permits/new', labelAr: 'تصريح زائر', icon: BadgePlus },
    { to: '/r/requests/new', labelAr: 'بلاغ جديد', icon: FileWarning },
    { to: '/r/bookings', labelAr: 'حجز مرفق', icon: CalendarPlus },
    { to: '/r/community', labelAr: 'المجتمع', icon: Megaphone },
  ];

  const myBookings = store.bookings.filter((b) => b.byPersonId === me.id && b.status === 'confirmed');
  const myVehicles = store.vehicles.filter((v) => v.propertyId === me.propertyId);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مرحبًا، {me.nameAr.split(' ')[0]} 👋</h1>
          <p className="text-sm text-ink-500">كل خدمات الحي في مكان واحد</p>
        </div>
        <div className="flex gap-4 rounded-card bg-ink-0 px-4 py-2.5 ring-1 ring-ink-100">
          {[
            [myRequests.length, 'طلبات مفتوحة'],
            [myPermits.length, 'تصاريح فعالة'],
            [myBookings.length, 'حجوزات قادمة'],
            [myVehicles.length, 'مركبات'],
          ].map(([v, l]) => (
            <div key={l as string} className="text-center">
              <p className="text-lg font-bold leading-none tabular-nums text-ink-900">{v}</p>
              <p className="mt-1 text-micro text-ink-500">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* quick services */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quick.map((qa) => (
          <Link key={qa.to} to={qa.to} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card bg-ink-0 p-4 shadow-e1 transition-transform hover:-translate-y-0.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600"><qa.icon size={20} /></span>
            <span className="text-sm font-semibold">{qa.labelAr}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <SectionTitle action={<Link to="/r/requests" className="text-caption text-brand-600 hover:underline">الكل</Link>}>طلباتي المفتوحة</SectionTitle>
          <div className="space-y-2">
            {myRequests.map((r) => (
              <Link key={r.id} to={`/r/requests/${r.id}`} className="block rounded-card bg-ink-50 p-3 hover:bg-brand-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{requestKindAr[r.kind]}</span>
                  {requestPill(r.status)}
                </div>
                <div className="mt-1.5"><SlaBadge req={r} /></div>
              </Link>
            ))}
            {myRequests.length === 0 && <p className="py-4 text-center text-caption text-ink-500">لا طلبات مفتوحة</p>}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle action={<Link to="/r/permits" className="text-caption text-brand-600 hover:underline">الكل</Link>}>تصاريحي الفعالة</SectionTitle>
          <div className="space-y-2">
            {myPermits.map((p) => (
              <div key={p.id} className="rounded-card bg-ink-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{p.subject.nameAr}</span>
                  {permitPill(p.status)}
                </div>
                <p className="mt-0.5 text-caption text-ink-500">{permitKindAr[p.kind]}</p>
              </div>
            ))}
            {myPermits.length === 0 && <p className="py-4 text-center text-caption text-ink-500">لا تصاريح فعالة</p>}
          </div>
        </Card>
      </div>

      {/* dues + announcements */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <SectionTitle action={<Link to="/r/payments" className="text-caption text-brand-600 hover:underline">المدفوعات</Link>}>المستحقات</SectionTitle>
          <div className="flex items-center justify-between rounded-card bg-warn-600-50 p-3 text-sm">
            <span>رسوم الخدمات — الربع الثالث</span>
            <span className="font-bold tabular-nums">— ر.س</span>
          </div>
          <p className="mt-2 text-caption text-ink-500">القيم المالية خارج نطاق العرض التجريبي</p>
        </Card>

        <Card className="p-4">
          <SectionTitle>إعلانات الحي</SectionTitle>
          <div className="space-y-2 text-sm">
            <div className="rounded-card bg-ink-50 p-3">
              <p className="font-medium">صيانة مجدولة لشبكة الري — حديقة المشتل</p>
              <p className="text-caption text-ink-500">{ago(new Date(Date.now() - 5 * 3600e3).toISOString())}</p>
            </div>
            <div className="rounded-card bg-ink-50 p-3">
              <p className="font-medium">فعالية سوق السبت تعود هذا الأسبوع — منتزه عشية</p>
              <p className="text-caption text-ink-500">{ago(new Date(Date.now() - 26 * 3600e3).toISOString())}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
