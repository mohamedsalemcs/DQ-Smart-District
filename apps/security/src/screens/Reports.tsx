import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '@dq/core';
import { SectionTitle } from '@dq/ui';
import { ChartCard, KpiCard, RangePicker, type Range, axisTick, chartTooltip, windowStats } from '../components/charts';
import { gateDecisionAr, incidentKindAr } from '@dq/core';
import { secondsToClock } from '@dq/core';

export function SecurityReports() {
  const store = useStore();
  const [range, setRange] = useState<Range>(30);

  const { cur, prev, sum, avg, deltaPct } = useMemo(
    () => windowStats(store.metrics, range),
    [store.metrics, range],
  );

  const series = useMemo(
    () =>
      cur.map((m) => ({
        day: format(new Date(m.dateISO), range === 7 ? 'EEEE' : 'd/M'),
        دخول: m.gateAllowed,
        رفض: m.gateDenied,
        بلاغات: m.incidents,
        استجابة: Math.round((m.avgResponseSec / 60) * 10) / 10,
      })),
    [cur, range],
  );

  const gateStats = useMemo(
    () =>
      store.gates.map((g) => {
        const events = store.gateEvents.filter((e) => e.gateId === g.id);
        return {
          name: g.nameAr.replace('بوابة ', '').replace('البوابة ', ''),
          مسموح: events.filter((e) => e.decision === 'allowed').length,
          مرفوض: events.filter((e) => e.decision === 'denied').length,
          تصعيد: events.filter((e) => e.decision === 'escalated').length,
        };
      }),
    [store.gates, store.gateEvents],
  );

  const avgResp = avg(cur, 'avgResponseSec');
  const tickInterval = range === 7 ? 0 : range === 30 ? 4 : 14;

  return (
    <div className="space-y-5">
      <SectionTitle
        sub="أداء المنظومة الأمنية خلال الفترة المحددة مقارنة بالفترة السابقة"
        action={<RangePicker value={range} onChange={setRange} dark />}
      >
        تقارير الأمن
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          dark
          label="حركة الدخول"
          value={sum(cur, 'gateAllowed').toLocaleString('en')}
          delta={deltaPct(sum(cur, 'gateAllowed'), sum(prev, 'gateAllowed'))}
          spark={cur.map((m) => m.gateAllowed)}
        />
        <KpiCard
          dark
          label="حالات الرفض"
          value={sum(cur, 'gateDenied')}
          delta={deltaPct(sum(cur, 'gateDenied'), sum(prev, 'gateDenied'))}
          goodWhenDown
          spark={cur.map((m) => m.gateDenied)}
          sparkColor="#a82a22"
        />
        <KpiCard
          dark
          label="البلاغات الأمنية"
          value={sum(cur, 'incidents')}
          delta={deltaPct(sum(cur, 'incidents'), sum(prev, 'incidents'))}
          goodWhenDown
          spark={cur.map((m) => m.incidents)}
          sparkColor="#9a5b0a"
        />
        <KpiCard
          dark
          label="متوسط الاستجابة"
          value={secondsToClock(Math.round(avgResp))}
          suffix="دقيقة"
          delta={deltaPct(avgResp, avg(prev, 'avgResponseSec'))}
          goodWhenDown
          spark={cur.map((m) => m.avgResponseSec)}
          sparkColor="#0e7c4a"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard dark title="حركة البوابات" sub="الدخول اليومي — الرفض بالأحمر" className="lg:col-span-2">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="iceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e6a60" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0e6a60" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b554d" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(true)} interval={tickInterval} tickMargin={6} reversed />
                <YAxis tick={axisTick(true)} width={40} orientation="right" />
                <Tooltip {...chartTooltip(true)} />
                <Area type="monotone" dataKey="دخول" stroke="#0e6a60" strokeWidth={2} fill="url(#iceFill)" />
                <Area type="monotone" dataKey="رفض" stroke="#a82a22" strokeWidth={1.5} fill="#a82a22" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard dark title="قرارات البوابات" sub="منذ بداية الوردية — من السجل الفعلي">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={gateStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b554d" vertical={false} />
                <XAxis dataKey="name" tick={axisTick(true)} tickMargin={6} reversed />
                <YAxis tick={axisTick(true)} width={26} allowDecimals={false} orientation="right" />
                <Tooltip {...chartTooltip(true)} />
                <Bar dataKey="مسموح" fill="#0e7c4a" radius={[2, 2, 0, 0]} maxBarSize={16} />
                <Bar dataKey="مرفوض" fill="#a82a22" radius={[2, 2, 0, 0]} maxBarSize={16} />
                <Bar dataKey="تصعيد" fill="#9a5b0a" radius={[2, 2, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard dark title="زمن الاستجابة" sub="متوسط الدقائق يوميًا — الاتجاه التحسّني هو الرسالة">
          <div className="h-48" dir="ltr">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b554d" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(true)} interval={tickInterval} tickMargin={6} reversed />
                <YAxis tick={axisTick(true)} width={28} orientation="right" domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip {...chartTooltip(true)} />
                <Line type="monotone" dataKey="استجابة" stroke="#0e7c4a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard dark title="البلاغات اليومية" sub="عدد البلاغات الأمنية المسجلة">
          <div className="h-48" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b554d" vertical={false} />
                <XAxis dataKey="day" tick={axisTick(true)} interval={tickInterval} tickMargin={6} reversed />
                <YAxis tick={axisTick(true)} width={26} allowDecimals={false} orientation="right" />
                <Tooltip {...chartTooltip(true)} />
                <Bar dataKey="بلاغات" fill="#9a5b0a" radius={[2, 2, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard dark title="أحدث حالات الرفض والتصعيد" sub="من سجل البوابات الحي">
          <div className="space-y-1.5">
            {store.gateEvents
              .filter((e) => e.decision !== 'allowed')
              .slice(0, 6)
              .map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-[--radius-ctl] bg-ink-0 px-3 py-2 text-[--text-caption]">
                  <span className={`font-bold ${e.decision === 'denied' ? 'text-danger-600' : 'text-warn-600-600'}`}>{gateDecisionAr[e.decision]}</span>
                  <bdi className="plate text-ink-800">{e.input}</bdi>
                  <span className="ms-auto truncate text-ink-500">{e.reasonAr}</span>
                </div>
              ))}
            {store.gateEvents.filter((e) => e.decision !== 'allowed').length === 0 && (
              <p className="py-4 text-center text-[--text-caption] text-ink-500">لا حالات رفض في السجل الحالي</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-900 pt-3">
            {Object.entries(
              store.incidents.reduce<Record<string, number>>((acc, i) => {
                acc[incidentKindAr[i.kind]] = (acc[incidentKindAr[i.kind]] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(([k, v]) => (
              <span key={k} className="rounded-full bg-ink-0 px-2.5 py-1 text-[--text-micro] text-ink-500">
                {k} <b className="tabular-nums text-ink-800">{v}</b>
              </span>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
