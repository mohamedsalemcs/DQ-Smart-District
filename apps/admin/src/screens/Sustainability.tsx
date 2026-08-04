import { useMemo } from 'react';
import { Droplets, Leaf, Lightbulb, Recycle, Sun, Wind } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Stat, StatusPill } from '@dq/ui';
import { useStore } from '@dq/core';

/**
 * MOD-27 · EP-26 — الاستدامة والطاقة.
 * يعالج GAP-SC-02: «No Sustainability KPIs — add energy consumption and
 * carbon footprint dashboards». البيئة كانت أدنى محور (65/100).
 *
 * كل مؤشر هنا مشتق من أصول ومستشعرات موجودة بالفعل — لا أجهزة جديدة.
 * كل معامل حساب معروض صراحة: الشفافية شرط المصداقية (AC-221.3).
 */

/* معاملات الحساب — معلنة لا مخفية */
const LAMP_WATTS = 120; // عمود LED
const HOURS_ON = 11; // متوسط ساعات التشغيل الليلي
const GRID_KG_CO2_PER_KWH = 0.72; // معامل الشبكة السعودية
const TANK_CAPACITY_L = 5000;
const BIN_CAPACITY_L = 660;
const SOLAR_KWP_PER_FACILITY = 12;
const SOLAR_YIELD = 5.8; // كيلوواط.ساعة لكل كيلوواط مركّب يوميًا — إشعاع الرياض

export function Sustainability() {
  const assets = useStore((s) => s.assets);
  const sensorValues = useStore((s) => s.sensorValues);

  const m = useMemo(() => {
    const poles = assets.filter((a) => a.kind === 'light_pole');
    const workingPoles = poles.filter((p) => sensorValues[p.id]?.lampOk !== false);
    const bins = assets.filter((a) => a.kind === 'bin');
    const tanks = assets.filter((a) => a.kind === 'irrigation_tank');
    const trees = assets.filter((a) => a.kind === 'tree');
    const facilities = assets.filter((a) => a.kind === 'garden' || a.kind === 'court');

    const dailyKwh = (workingPoles.length * LAMP_WATTS * HOURS_ON) / 1000;
    const monthlyKwh = dailyKwh * 30;
    const solarKwh = facilities.length * SOLAR_KWP_PER_FACILITY * SOLAR_YIELD;
    const netKwh = Math.max(0, dailyKwh - solarKwh);
    const dailyCo2 = netKwh * GRID_KG_CO2_PER_KWH;

    const avgFill =
      bins.length === 0
        ? 0
        : bins.reduce((a, b) => a + (sensorValues[b.id]?.fill ?? 0), 0) / bins.length;
    const wasteVolume = (avgFill / 100) * bins.length * BIN_CAPACITY_L;

    const avgTank =
      tanks.length === 0
        ? 0
        : tanks.reduce((a, t) => a + (sensorValues[t.id]?.tankLevel ?? 0), 0) / tanks.length;
    const waterStored = (avgTank / 100) * tanks.length * TANK_CAPACITY_L;

    const dryTrees = trees.filter((t) => (sensorValues[t.id]?.moisture ?? 100) < 25).length;
    const lampEfficiency = poles.length ? (workingPoles.length / poles.length) * 100 : 100;
    const renewableShare = dailyKwh ? Math.min(100, (solarKwh / dailyKwh) * 100) : 0;

    /* مؤشر مركّب: كفاءة الإنارة · حصة المتجددة · صحة الري */
    const treeHealth = trees.length ? ((trees.length - dryTrees) / trees.length) * 100 : 100;
    const score = Math.round(lampEfficiency * 0.3 + renewableShare * 0.4 + treeHealth * 0.3);

    return {
      dailyKwh, monthlyKwh, solarKwh, netKwh, dailyCo2,
      monthlyCo2: dailyCo2 * 30, avgFill, wasteVolume, avgTank, waterStored,
      dryTrees, treeCount: trees.length, lampEfficiency, renewableShare, score,
      poles: poles.length, workingPoles: workingPoles.length,
    };
  }, [assets, sensorValues]);

  const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
  const n1 = (v: number) => v.toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="الاستدامة والطاقة"
        subtitle="مؤشرات بيئية محسوبة حيًا من مستشعرات الحي — كل معامل حساب معروض صراحة"
        action={
          <StatusPill
            labelAr={`مؤشر الاستدامة ${m.score}`}
            tone={m.score >= 75 ? 'ok' : m.score >= 50 ? 'warn' : 'bad'}
            icon={Leaf}
          />
        }
      />

      <section>
        <SectionTitle sub="الاستهلاك والانبعاثات">الطاقة والبصمة الكربونية</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="استهلاك الطاقة اليومي"
            value={`${n0(m.dailyKwh)} kWh`}
            sub={`${m.workingPoles} عمود إنارة × ${LAMP_WATTS}W × ${HOURS_ON}س`}
            icon={Lightbulb}
          />
          <Stat
            label="إنتاج الطاقة المتجددة"
            value={`${n0(m.solarKwh)} kWh`}
            sub={`سعة شمسية مقدّرة ${SOLAR_KWP_PER_FACILITY} kWp لكل مرفق`}
            icon={Sun}
          />
          <Stat
            label="البصمة الكربونية اليومية"
            value={`${n0(m.dailyCo2)} kg`}
            sub={`صافي ${n0(m.netKwh)} kWh × ${GRID_KG_CO2_PER_KWH} kg/kWh`}
            icon={Wind}
          />
          <Stat
            label="حصة الطاقة المتجددة"
            value={`${n1(m.renewableShare)}%`}
            delta={Math.round(m.renewableShare - 30)}
            deltaLabel="مقابل الهدف 30%"
            deltaGood
            icon={Leaf}
          />
        </div>
      </section>

      <section>
        <SectionTitle sub="المياه والنفايات">الموارد</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="المياه المخزّنة"
            value={`${n0(m.waterStored)} L`}
            sub={`متوسط امتلاء الخزانات ${n1(m.avgTank)}%`}
            icon={Droplets}
          />
          <Stat
            label="أشجار تحتاج ريًا"
            value={m.dryTrees}
            sub={`من ${m.treeCount} شجرة · رطوبة التربة تحت 25%`}
            deltaGood={false}
            icon={Leaf}
          />
          <Stat
            label="حجم النفايات الحالي"
            value={`${n0(m.wasteVolume)} L`}
            sub={`متوسط امتلاء الحاويات ${n1(m.avgFill)}%`}
            icon={Recycle}
          />
          <Stat
            label="كفاءة الإنارة"
            value={`${n1(m.lampEfficiency)}%`}
            sub={`${m.workingPoles} عاملة من ${m.poles}`}
            icon={Lightbulb}
          />
        </div>
      </section>

      <Card padding="lg">
        <SectionTitle sub="الشفافية شرط المصداقية — لا صندوق أسود">معاملات الحساب</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-caption">
            <thead>
              <tr className="border-b border-ink-100 text-start text-ink-500">
                <th className="py-2 text-start font-semibold">المعامل</th>
                <th className="py-2 text-start font-semibold">القيمة</th>
                <th className="py-2 text-start font-semibold">المصدر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {[
                ['قدرة عمود الإنارة', `${LAMP_WATTS} W`, 'مواصفة LED المركّبة'],
                ['ساعات التشغيل الليلي', `${HOURS_ON} ساعة`, 'متوسط سنوي — الرياض'],
                ['معامل انبعاث الشبكة', `${GRID_KG_CO2_PER_KWH} kg CO₂/kWh`, 'الشبكة السعودية'],
                ['إنتاجية الطاقة الشمسية', `${SOLAR_YIELD} kWh/kWp·يوم`, 'إشعاع الرياض'],
                ['سعة الحاوية', `${BIN_CAPACITY_L} L`, 'المواصفة القياسية'],
                ['سعة خزان الري', `${TANK_CAPACITY_L} L`, 'المواصفة القياسية'],
              ].map(([k, v, src]) => (
                <tr key={k}>
                  <td className="py-2.5 font-medium text-ink-800">{k}</td>
                  <td className="plate py-2.5 text-ink-900">{v}</td>
                  <td className="py-2.5 text-ink-500">{src}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
