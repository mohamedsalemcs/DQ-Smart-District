import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BatteryLow, Lightbulb, Trash2, TreePine, Zap } from 'lucide-react';
import { useStore } from '@dq/core';
import { Card, SectionTitle, Stat } from '@dq/ui';
import { Map3D } from '../components/three/DQTwin';

/** §10 — bins map + sensor alerts. The ticker (§15) moves these numbers live. */
export function AdminOperations() {
  const store = useStore();
  const navigate = useNavigate();

  const bins = useMemo(() => store.assets.filter((a) => a.kind === 'bin'), [store.assets]);
  const poles = useMemo(() => store.assets.filter((a) => a.kind === 'light_pole'), [store.assets]);

  const fillOf = (id: string) => store.sensorValues[id]?.fill ?? 0;
  const fullBins = bins.filter((b) => fillOf(b.id) >= 80);
  const faultPoles = poles.filter((p) => store.sensorValues[p.id]?.lampOk === false);
  const lowBattery = store.assets.filter((a) => (store.sensorValues[a.id]?.battery ?? 100) < 25);
  const trees = useMemo(() => store.assets.filter((a) => a.kind === 'tree'), [store.assets]);
  const dryTrees = trees.filter((t) => (store.sensorValues[t.id]?.moisture ?? 100) < 25);
  const autoOrders = store.requests.filter((r) => r.raisedBy === 'system-sensor' && r.status !== 'closed');

  return (
    <div className="space-y-4">
      <SectionTitle
        action={
          <span className="flex items-center gap-1.5 text-[--text-caption] text-ink-500">
            <Zap size={12} className={store.demoSpeed === 10 ? 'text-brand-600' : ''} />
            المستشعرات تُحدَّث كل {store.demoSpeed === 10 ? '0.3' : '3'} ثوانٍ
          </span>
        }
      >
        التشغيل والمرافق
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="حاويات فوق 80%" value={fullBins.length} sub={`من أصل ${bins.length}`} />
        <Stat label="أعطال إنارة" value={faultPoles.length} sub={`من أصل ${poles.length} عمود`} />
        <Stat label="أشجار بحاجة ري" value={dryTrees.length} sub={`من أصل ${trees.length} شجرة`} />
        <Stat label="بطاريات منخفضة" value={lowBattery.length} />
        <Stat label="أوامر عمل آلية نشطة" value={autoOrders.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-[--text-caption] font-semibold text-ink-500">
            أصول إنترنت الأشياء على النموذج الحي — الحاويات والإنارة وخزانات الري تتلوّن بحالتها لحظيًا
          </p>
          <Map3D layers={{ bins: true, lamps: true, tanks: true, trees: true, gates: true }} className="aspect-[16/9]" onOpen={() => navigate('/a/twin')} />
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-2 text-[--text-caption] font-semibold text-ink-500">تنبيهات حية</p>
            <div className="max-h-56 space-y-1.5 overflow-y-auto thin-scroll">
              {fullBins.map((b) => (
                <p key={b.id} className="flex items-center gap-1.5 rounded bg-danger-50 px-2 py-1.5 text-[--text-caption] text-danger-600">
                  <Trash2 size={12} /> {b.nameAr} — {fillOf(b.id)}% · صدر أمر عمل
                </p>
              ))}
              {faultPoles.map((p) => (
                <p key={p.id} className="flex items-center gap-1.5 rounded bg-warn-600-50 px-2 py-1.5 text-[--text-caption] text-warn-600">
                  <Lightbulb size={12} /> {p.nameAr} — عطل
                </p>
              ))}
              {dryTrees.map((t) => (
                <p key={t.id} className="flex items-center gap-1.5 rounded bg-danger-50 px-2 py-1.5 text-[--text-caption] text-danger-600">
                  <TreePine size={12} /> {t.nameAr} — رطوبة {store.sensorValues[t.id]?.moisture}% · بحاجة ري
                </p>
              ))}
              {lowBattery.slice(0, 4).map((a) => (
                <p key={a.id} className="flex items-center gap-1.5 rounded bg-warn-600-50 px-2 py-1.5 text-[--text-caption] text-warn-600">
                  <BatteryLow size={12} /> {a.nameAr} — بطارية {store.sensorValues[a.id]?.battery}%
                </p>
              ))}
              {fullBins.length + faultPoles.length + lowBattery.length + dryTrees.length === 0 && (
                <p className="py-2 text-center text-[--text-caption] text-ink-500">كل الأصول ضمن الحدود الطبيعية</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-[--text-caption] font-semibold text-ink-500">أعلى الحاويات امتلاءً</p>
            {[...bins]
              .sort((a, b) => fillOf(b.id) - fillOf(a.id))
              .slice(0, 6)
              .map((b) => {
                const f = fillOf(b.id);
                return (
                  <div key={b.id} className="py-1">
                    <div className="flex justify-between text-[--text-caption]">
                      <span>{b.nameAr}</span>
                      <span className="tabular-nums font-semibold">{f}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-ink-50">
                      <div className={`h-full ${f >= 80 ? 'bg-danger-600' : f >= 60 ? 'bg-warn-600' : 'bg-ok-600'}`} style={{ width: `${f}%` }} />
                    </div>
                  </div>
                );
              })}
          </Card>
        </div>
      </div>
    </div>
  );
}
