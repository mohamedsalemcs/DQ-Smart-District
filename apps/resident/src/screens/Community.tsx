import { Briefcase, CalendarDays, Droplets, Footprints, GraduationCap, Megaphone, ShoppingBasket, Sparkles, Sprout, Stethoscope, Store, Users } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, SectionTitle } from '@dq/ui';
import { fmtDate } from '@dq/core';

/* advertiser identity → colour + icon (school / clinic / market / business centre) */
const AD_THEMES: Record<string, { color: string; bg: string; icon: typeof Store }> = {
  'prop-33': { color: 'var(--color-viz-5)', bg: 'rgba(92,120,153,0.12)', icon: GraduationCap },
  'prop-34': { color: 'var(--color-viz-3)', bg: 'rgba(46,125,91,0.12)', icon: Stethoscope },
  'prop-35': { color: 'var(--color-viz-6)', bg: 'rgba(196,128,26,0.12)', icon: ShoppingBasket },
  'prop-36': { color: 'var(--color-viz-2)', bg: 'rgba(201,162,39,0.14)', icon: Briefcase },
};

const NEWS = [
  { titleAr: 'صيانة مجدولة لشبكة الري — حديقة المشتل', subAr: 'الثلاثاء القادم 06:00–10:00 صباحًا', icon: Droplets, color: 'var(--color-viz-5)', bg: 'rgba(92,120,153,0.1)' },
  { titleAr: 'سوق السبت يعود — منتزه عشية', subAr: 'كل سبت 16:00–21:00 · مقاعد محدودة للعارضين', icon: Store, color: 'var(--color-viz-6)', bg: 'rgba(196,128,26,0.1)' },
  { titleAr: 'تحديث مسارات المشي — حديقة طويق', subAr: 'المسار الشرقي مغلق مؤقتًا للتطوير', icon: Footprints, color: 'var(--color-viz-3)', bg: 'rgba(46,125,91,0.1)' },
];

/** المجتمع — colourful cards: partner ads, district news, initiatives, upcoming events. */
export function Community() {
  const store = useStore();
  const activeAds = store.ads.filter((a) => a.status === 'active');
  const featured = activeAds.find((a) => a.package === 'featured');
  const rest = activeAds.filter((a) => a.id !== featured?.id);

  const advertiserOf = (propId: string) => store.properties.find((p) => p.id === propId);
  const interested = (titleAr: string) =>
    store.pushToast('شكرًا لاهتمامك', `${titleAr} — سيتواصل معك المعلن (محاكاة)`, 'ok');

  const upcoming = store.bookings
    .filter((b) => b.status === 'confirmed' && new Date(b.fromISO).getTime() > Date.now() && b.attendees >= 10)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionTitle sub="أخبار الحي ومبادراته وفعالياته، وعروض شركائه التجاريين">المجتمع</SectionTitle>

      {/* featured partner ad — hero */}
      {featured && (
        <div className="relative overflow-hidden rounded-card bg-ink-0 p-5 text-ink-800 ring-1 ring-brand-500/40">
          <div className="absolute -end-10 -top-10 h-40 w-40 rounded-full bg-brand-50" />
          <div className="absolute -bottom-16 -start-8 h-36 w-36 rounded-full bg-brand-50" />
          <div className="absolute end-24 bottom-4 h-16 w-16 rounded-full bg-info-50" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-micro font-bold text-ink-900">
                <Sparkles size={10} /> إعلان مميز
              </span>
              <span className="text-caption text-ink-500">{advertiserOf(featured.advertiserPropId)?.subtypeAr}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold">{featured.titleAr}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-800/80">{featured.bodyAr}</p>
            <Button className="mt-4" onClick={() => interested(featured.titleAr)}>{featured.ctaAr}</Button>
          </div>
        </div>
      )}

      {/* partner ads — colour-coded by advertiser */}
      {rest.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-caption font-bold text-ink-500">
            <Store size={13} /> عروض شركاء الحي
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((ad) => {
              const advertiser = advertiserOf(ad.advertiserPropId);
              const theme = AD_THEMES[ad.advertiserPropId] ?? AD_THEMES['prop-35'];
              const Icon = theme.icon;
              return (
                <div key={ad.id} className="flex flex-col overflow-hidden rounded-card bg-ink-0 ring-1 ring-ink-100">
                  <div className="h-1.5" style={{ background: theme.color }} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: theme.bg, color: theme.color }}>
                          <Icon size={17} />
                        </span>
                        <span className="text-caption font-semibold text-ink-500">{advertiser?.subtypeAr}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-ink-50 px-1.5 py-0.5 text-micro text-ink-500">إعلان</span>
                    </div>
                    <p className="mt-3 text-sm font-bold">{ad.titleAr}</p>
                    <p className="mt-1 flex-1 text-caption leading-relaxed text-ink-500">{ad.bodyAr}</p>
                    <button
                      onClick={() => interested(ad.titleAr)}
                      className="mt-3 self-start rounded-ctl px-3 py-1.5 text-caption font-bold text-white transition-transform hover:-translate-y-0.5"
                      style={{ background: theme.color }}
                    >
                      {ad.ctaAr}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* upcoming community events — from live bookings */}
      {upcoming.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-caption font-bold text-ink-500">
            <CalendarDays size={13} /> فعاليات قادمة
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {upcoming.map((b) => {
              const facility = store.assets.find((a) => a.id === b.facilityId);
              return (
                <div key={b.id} className="rounded-card bg-gradient-to-b from-tint to-white p-4 text-center ring-1 ring-ink-100">
                  <p className="text-2xl font-bold text-brand-600 tabular-nums">{fmtDate(b.fromISO).split(' ')[0]}</p>
                  <p className="text-micro font-semibold text-ink-500">{fmtDate(b.fromISO).split(' ').slice(1).join(' ')}</p>
                  <p className="mt-2 text-sm font-bold">{facility?.nameAr}</p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-caption text-ink-500">
                    <Users size={11} /> {b.attendees} مشارك متوقع
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* district news — coloured icon cards */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-caption font-bold text-ink-500">
          <Megaphone size={13} /> إعلانات الحي
        </p>
        <div className="space-y-2">
          {NEWS.map((n) => (
            <div key={n.titleAr} className="flex items-center gap-3 rounded-card bg-ink-0 p-3 ring-1 ring-ink-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card" style={{ background: n.bg, color: n.color }}>
                <n.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{n.titleAr}</p>
                <p className="text-caption text-ink-500">{n.subAr}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* initiatives — gradient cards with CTA */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card p-4 text-white" style={{ background: 'linear-gradient(135deg, var(--color-ok-500), var(--color-ok-600))'}} >
          <Sprout size={22} className="opacity-80" />
          <p className="mt-2 text-sm font-bold">مبادرة تشجير الجار</p>
          <p className="mt-1 text-caption leading-relaxed opacity-85">وزّعنا 200 شتلة هذا الشهر — سجّل اهتمامك وسيتواصل فريق التشغيل لتخضير محيط وحدتك.</p>
          <button onClick={() => interested('مبادرة تشجير الجار')} className="mt-3 rounded-ctl bg-ink-0/20 px-3 py-1.5 text-caption font-bold hover:bg-ink-0/30">
            سجّل اهتمامك
          </button>
        </div>
        <div className="rounded-card p-4 text-ink-900" style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-300))'}} >
          <Footprints size={22} className="opacity-70" />
          <p className="mt-2 text-sm font-bold">نادي جري الحي الدبلوماسي</p>
          <p className="mt-1 text-caption leading-relaxed opacity-80">انطلاقة كل فجر جمعة — نقطة التجمع بوابة حديقة النفل، جميع المستويات مرحّب بها.</p>
          <button onClick={() => interested('نادي جري الحي')} className="mt-3 rounded-ctl bg-ink-0/15 px-3 py-1.5 text-caption font-bold hover:bg-ink-0/25">
            انضم للنادي
          </button>
        </div>
      </div>
    </div>
  );
}
