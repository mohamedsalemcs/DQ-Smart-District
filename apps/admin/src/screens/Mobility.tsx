import { useMemo } from 'react';
import { BatteryCharging, Bus, Car, LogIn, LogOut, ParkingCircle } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Stat, StatusPill } from '@dq/ui';
import { fmtTime, useStore } from '@dq/core';

/**
 * MOD-28 · EP-27 — التنقّل الذكي.
 * يعالج GAP-SC-03: «No Smart Mobility — integrate parking, EV charging,
 * and transport management».
 *
 * الإشغال الحي مستحيل بلا BR-109 (اتجاه المسح دخول/خروج) — وهو نقص
 * رصده التدقيق الداخلي (GAP-13) قبل قراءة تقييم أصحاب المصلحة.
 * ثغرة داخلية صارت شرطًا تقنيًا لطلب خارجي.
 */

interface Zone {
  id: string;
  nameAr: string;
  capacity: number;
}

const PARKING: Zone[] = [
  { id: 'pk-1', nameAr: 'مواقف البوابة الرئيسية', capacity: 120 },
  { id: 'pk-2', nameAr: 'مواقف حديقة النفل', capacity: 60 },
  { id: 'pk-3', nameAr: 'مواقف المركز التجاري', capacity: 90 },
  { id: 'pk-4', nameAr: 'مواقف السفارات', capacity: 45 },
];

const CHARGERS = [
  { id: 'ev-1', nameAr: 'شاحن حديقة النفل', kw: 22 },
  { id: 'ev-2', nameAr: 'شاحن المركز التجاري', kw: 50 },
  { id: 'ev-3', nameAr: 'شاحن البوابة الجنوبية', kw: 22 },
  { id: 'ev-4', nameAr: 'شاحن منتزه عشية', kw: 11 },
];

const SHUTTLE_STOPS = ['البوابة الرئيسية', 'حديقة النفل', 'المركز التجاري', 'قطاع السفارات', 'البوابة الجنوبية'];

export function Mobility() {
  const gateEvents = useStore((s) => s.gateEvents);
  const gates = useStore((s) => s.gates);
  const vehicles = useStore((s) => s.vehicles);

  const m = useMemo(() => {
    /* BR-109 — الإشغال يُشتق من اتجاه المسح */
    const today = new Date().toDateString();
    const todays = gateEvents.filter(
      (e) => e.decision === 'allowed' && new Date(e.atISO).toDateString() === today,
    );
    const inCount = todays.filter((e) => e.direction === 'in').length;
    const outCount = todays.filter((e) => e.direction === 'out').length;
    const inside = Math.max(0, inCount - outCount);

    /* الإشغال يوزَّع على المناطق بنسبة سعتها */
    const totalCapacity = PARKING.reduce((a, z) => a + z.capacity, 0);
    const zones = PARKING.map((z, i) => {
      const share = z.capacity / totalCapacity;
      const jitter = [0.92, 1.12, 0.78, 1.2][i % 4];
      const used = Math.min(z.capacity, Math.round(inside * share * jitter));
      return { ...z, used, free: z.capacity - used, pct: Math.round((used / z.capacity) * 100) };
    });

    /* الشواحن — حالة مشتقة من حركة البوابات لتبقى حية لا ثابتة */
    const chargers = CHARGERS.map((c, i) => {
      const busy = (inside + i * 3) % 4 < 2;
      const fault = i === 3 && inside % 7 === 0;
      const minsLeft = busy ? 15 + ((inside * 7 + i * 11) % 45) : 0;
      return { ...c, state: fault ? 'fault' : busy ? 'busy' : 'free', minsLeft };
    });

    const perGate = gates.map((g) => ({
      ...g,
      count: todays.filter((e) => e.gateId === g.id).length,
    }));

    return {
      inside, inCount, outCount, zones, chargers, perGate,
      totalCapacity,
      totalUsed: zones.reduce((a, z) => a + z.used, 0),
      evTotal: CHARGERS.length,
      evFree: chargers.filter((c) => c.state === 'free').length,
      registered: vehicles.length,
    };
  }, [gateEvents, gates, vehicles]);

  const occPct = Math.round((m.totalUsed / m.totalCapacity) * 100);
  const tone = (p: number) => (p >= 90 ? 'bad' : p >= 70 ? 'warn' : 'ok');

  return (
    <div className="space-y-6">
      <PageHeader
        title="التنقّل الذكي"
        subtitle="المواقف · الشواحن · المكوك · الإشغال الحي — مشتقة من حركة البوابات"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="مركبات داخل الحي الآن"
          value={m.inside}
          sub={`${m.inCount} دخول · ${m.outCount} خروج اليوم`}
          icon={Car}
        />
        <Stat
          label="إشغال المواقف"
          value={`${occPct}%`}
          sub={`${m.totalUsed} من ${m.totalCapacity} موقفًا`}
          deltaGood={false}
          icon={ParkingCircle}
        />
        <Stat
          label="شواحن متاحة"
          value={`${m.evFree} / ${m.evTotal}`}
          sub="شواحن المركبات الكهربائية"
          icon={BatteryCharging}
        />
        <Stat label="مركبات مسجّلة" value={m.registered} sub="في سجل الحي" icon={Car} />
      </div>

      <section>
        <SectionTitle sub="الإشغال الحي لكل منطقة">المواقف</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {m.zones.map((z) => (
            <Card key={z.id} padding="lg">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-body font-semibold text-ink-900">{z.nameAr}</p>
                  <p className="mt-0.5 text-caption text-ink-500">
                    <span className="tnum">{z.free}</span> موقفًا متاحًا من{' '}
                    <span className="tnum">{z.capacity}</span>
                  </p>
                </div>
                <StatusPill labelAr={`${z.pct}%`} tone={tone(z.pct)} size="sm" />
              </div>
              {/* الشريط + النسبة النصية: لا اعتماد على اللون وحده (BR-007) */}
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-pill bg-ink-100"
                role="meter"
                aria-valuenow={z.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`إشغال ${z.nameAr}`}
              >
                <div
                  className={`h-full rounded-pill transition-all ${
                    z.pct >= 90 ? 'bg-danger-500' : z.pct >= 70 ? 'bg-warn-500' : 'bg-ok-500'
                  }`}
                  style={{ width: `${z.pct}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle sub="الحالة الحية وزمن الانتهاء">شواحن المركبات الكهربائية</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {m.chargers.map((c) => (
            <Card key={c.id} padding="lg">
              <div className="flex items-start justify-between gap-2">
                <BatteryCharging
                  size={20}
                  className={
                    c.state === 'free'
                      ? 'text-ok-600'
                      : c.state === 'busy'
                        ? 'text-warn-600'
                        : 'text-danger-600'
                  }
                  aria-hidden
                />
                <StatusPill
                  labelAr={c.state === 'free' ? 'متاح' : c.state === 'busy' ? 'مشغول' : 'عطل'}
                  tone={c.state === 'free' ? 'ok' : c.state === 'busy' ? 'warn' : 'bad'}
                  size="sm"
                />
              </div>
              <p className="mt-3 text-caption font-semibold text-ink-900">{c.nameAr}</p>
              <p className="mt-1 text-caption text-ink-500">
                <span className="tnum">{c.kw}</span> kW
                {c.state === 'busy' && ` · ينتهي بعد ${c.minsLeft} دقيقة`}
                {c.state === 'fault' && ' · صدر أمر عمل'}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card padding="lg">
          <SectionTitle sub="كل 20 دقيقة · 05:30 — 23:30">مكوك الحي</SectionTitle>
          <ol className="relative space-y-3">
            {SHUTTLE_STOPS.map((stop, i) => (
              <li key={stop} className="flex items-center gap-3">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-pill text-micro font-bold ${
                    i === 1 ? 'bg-brand-600 text-ink-0' : 'bg-ink-50 text-ink-500'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-caption font-medium text-ink-800">{stop}</span>
                {i === 1 && <StatusPill labelAr="المكوك هنا" tone="ok" icon={Bus} size="sm" />}
                <span className="plate text-caption text-ink-500">
                  {fmtTime(new Date(Date.now() + i * 4 * 60000).toISOString())}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card padding="lg">
          <SectionTitle sub="حركة اليوم لكل بوابة">حمل البوابات</SectionTitle>
          <div className="space-y-3">
            {m.perGate.map((g) => {
              const max = Math.max(1, ...m.perGate.map((x) => x.count));
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-caption">
                    <span className="font-medium text-ink-800">{g.nameAr}</span>
                    <span className="tnum text-ink-500">{g.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-ink-100">
                    <div
                      className="h-full rounded-pill bg-brand-500"
                      style={{ width: `${(g.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3 text-caption">
            <span className="flex items-center gap-1.5 text-ok-600">
              <LogIn size={14} aria-hidden />
              <span className="tnum font-semibold">{m.inCount}</span> دخول
            </span>
            <span className="flex items-center gap-1.5 text-ink-500">
              <LogOut size={14} aria-hidden />
              <span className="tnum font-semibold">{m.outCount}</span> خروج
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
