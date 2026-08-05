import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Car,
  ClipboardList,
  DoorOpen,
  Flame,
  Lightbulb,
  Map as MapIcon,
  Orbit,
  ShieldCheck,
  Siren,
  Trash2,
  Waves,
} from 'lucide-react';
import { useStore } from '@dq/core';
import { Card, SectionTitle } from '@dq/ui';
import { MapCanvas, type MapMarker } from '../components/MapCanvas';
import { Map3D, type TwinLayers } from '../components/three/DQTwin';
import { incidentKindAr, requestKindAr } from '@dq/core';

/* مفاتيح الطبقات نفسها التي يفهمها التوأم — حالة واحدة تقود الخريطتين معًا */
type LayerKey = 'requests' | 'violations' | 'incidents' | 'patrols' | 'gates' | 'checkpoints' | 'bins' | 'lamps' | 'tanks' | 'traffic';

const LAYER_DEFS: { key: LayerKey; labelAr: string; icon: typeof MapIcon; color: string; glyph?: string; threeDOnly?: boolean }[] = [
  { key: 'requests', labelAr: 'البلاغات النشطة', icon: ClipboardList, color: '#1d4ed8', glyph: 'ط' },
  { key: 'violations', labelAr: 'المخالفات المفتوحة', icon: AlertTriangle, color: '#9f1239', glyph: 'م' },
  { key: 'incidents', labelAr: 'الحوادث الأمنية', icon: Siren, color: '#a82a22', glyph: '!' },
  { key: 'patrols', labelAr: 'الدوريات', icon: ShieldCheck, color: '#099384', glyph: 'د' },
  { key: 'gates', labelAr: 'البوابات', icon: DoorOpen, color: '#0e6a60', glyph: 'ب' },
  { key: 'checkpoints', labelAr: 'نقاط التفتيش', icon: Flame, color: '#5c6d6d', glyph: 'ن' },
  { key: 'bins', labelAr: 'حاويات النفايات', icon: Trash2, color: '#9a5b0a' },
  { key: 'lamps', labelAr: 'أعمدة الإنارة', icon: Lightbulb, color: '#b45309' },
  { key: 'tanks', labelAr: 'خزانات الري', icon: Waves, color: '#1f5fa8' },
  { key: 'traffic', labelAr: 'الحركة المرورية', icon: Car, color: '#7E9CC0', threeDOnly: true },
];

const MARKER_CAP = 250;

/** التقارير المرئية — طبقات التشغيل على خريطة الحي الحقيقية وتوأمه ثلاثي الأبعاد معًا */
export function VisualReports() {
  const store = useStore();
  const navigate = useNavigate();
  const [layers, setLayers] = useState<Partial<TwinLayers>>({ requests: true, violations: true, incidents: true, gates: true });

  const toggle = (k: LayerKey) => setLayers((cur) => ({ ...cur, [k]: !cur[k] }));

  const data = useMemo(() => {
    const activeReq = store.requests.filter((r) => r.status !== 'closed');
    const openViol = store.violations.filter((v) => !['closed', 'cancelled', 'remediated'].includes(v.status));
    const openInc = store.incidents.filter((i) => !i.status.startsWith('closed'));
    const bins = store.assets.filter((a) => a.kind === 'bin');
    const lamps = store.assets.filter((a) => a.kind === 'light_pole');
    const tanks = store.assets.filter((a) => a.kind === 'irrigation_tank');
    return { activeReq, openViol, openInc, bins, lamps, tanks };
  }, [store.requests, store.violations, store.incidents, store.assets]);

  const counts: Record<LayerKey, number> = {
    requests: data.activeReq.length,
    violations: data.openViol.length,
    incidents: data.openInc.length,
    patrols: store.patrols.length,
    gates: store.gates.length,
    checkpoints: store.checkpoints.length,
    bins: data.bins.length,
    lamps: data.lamps.length,
    tanks: data.tanks.length,
    traffic: store.gates.length * 2,
  };

  /* علامات الخريطة الحقيقية — الطبقات المفعلة فقط، بسقف يحفظ سلاسة العرض */
  const markers = useMemo(() => {
    const out: MapMarker[] = [];
    if (layers.requests)
      data.activeReq.forEach((r) => out.push({
        id: `rq-${r.id}`, lat: r.lat, lng: r.lng, color: '#1d4ed8', glyph: 'ط',
        labelAr: `بلاغ ${requestKindAr[r.kind]} — ${r.descriptionAr.slice(0, 40)}`,
        onClick: () => navigate('/requests'),
      }));
    if (layers.violations)
      data.openViol.forEach((v) => out.push({
        id: `vl-${v.id}`, lat: v.lat, lng: v.lng, color: '#9f1239', glyph: 'م',
        labelAr: `مخالفة ${v.code} — ${v.labelAr}`,
        onClick: () => navigate('/violations'),
      }));
    if (layers.incidents)
      data.openInc.forEach((i) => out.push({
        id: `in-${i.id}`, lat: i.lat, lng: i.lng, color: '#a82a22', glyph: '!', pulse: true,
        labelAr: `حادث ${incidentKindAr[i.kind]}`,
      }));
    if (layers.patrols)
      store.patrols.forEach((p) => out.push({
        id: `pt-${p.id}`, lat: p.lat, lng: p.lng, color: '#099384', glyph: 'د', pulse: p.status !== 'available',
        labelAr: `${p.nameAr} — ${p.status === 'available' ? 'متاحة' : p.status === 'dispatched' ? 'مسندة' : 'في الموقع'}`,
      }));
    if (layers.gates)
      store.gates.forEach((g) => out.push({ id: `gt-${g.id}`, lat: g.lat, lng: g.lng, color: '#0e6a60', glyph: 'ب', labelAr: g.nameAr }));
    if (layers.checkpoints)
      store.checkpoints.forEach((c) => out.push({ id: `cp-${c.id}`, lat: c.lat, lng: c.lng, color: '#5c6d6d', glyph: 'ن', labelAr: c.nameAr }));
    if (layers.bins)
      data.bins.forEach((b) => {
        const fill = store.sensorValues[b.id]?.fill ?? 0;
        out.push({ id: `bn-${b.id}`, lat: b.lat, lng: b.lng, color: fill >= 80 ? '#b45309' : '#9aa8b8', labelAr: `${b.nameAr} — امتلاء ${Math.round(fill)}%`, pulse: fill >= 80 });
      });
    if (layers.lamps)
      data.lamps.forEach((l) => {
        const ok = store.sensorValues[l.id]?.lampOk !== false;
        out.push({ id: `lm-${l.id}`, lat: l.lat, lng: l.lng, color: ok ? '#9aa8b8' : '#a82a22', labelAr: `${l.nameAr} — ${ok ? 'تعمل' : 'عطل'}`, pulse: !ok });
      });
    if (layers.tanks)
      data.tanks.forEach((t) => {
        const lvl = store.sensorValues[t.id]?.tankLevel ?? 0;
        out.push({ id: `tk-${t.id}`, lat: t.lat, lng: t.lng, color: lvl <= 20 ? '#b45309' : '#1f5fa8', labelAr: `${t.nameAr} — مستوى ${Math.round(lvl)}%`, pulse: lvl <= 20 });
      });
    return out.slice(0, MARKER_CAP);
  }, [layers, data, store.patrols, store.gates, store.checkpoints, store.sensorValues, navigate]);

  const activeCount = LAYER_DEFS.filter((l) => layers[l.key]).length;

  return (
    <div className="space-y-4">
      <SectionTitle sub="اختر الطبقات لعرضها على خريطة الحي الحقيقية وتوأمه الرقمي في آن واحد">
        التقارير المرئية
      </SectionTitle>

      {/* layer toggles */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {LAYER_DEFS.map((l) => {
            const on = !!layers[l.key];
            return (
              <button
                key={l.key}
                onClick={() => toggle(l.key)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold ring-1 transition-all ${
                  on ? 'bg-brand-50 text-ink-900 ring-brand-500' : 'bg-ink-0 text-ink-500 ring-ink-100 hover:bg-ink-50'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: l.color, opacity: on ? 1 : 0.35 }} />
                <l.icon size={13} />
                {l.labelAr}
                <b className="tabular-nums">{counts[l.key].toLocaleString('en')}</b>
                {l.threeDOnly && <span className="text-micro font-normal text-ink-500">(ثلاثي الأبعاد)</span>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* the two synchronized maps */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-3">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-caption font-semibold text-ink-500">
            <MapIcon size={13} className="text-brand-600" />
            الخريطة الحقيقية — {markers.length.toLocaleString('en')} علامة من {activeCount} طبقات
          </p>
          <MapCanvas className="aspect-square" markers={markers} />
        </Card>

        <Card className="p-3">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-caption font-semibold text-ink-500">
            <Orbit size={13} className="text-brand-600" />
            التوأم الرقمي — الطبقات نفسها على نموذج الحي ثلاثي الأبعاد
          </p>
          <Map3D layers={layers} className="aspect-square" />
        </Card>
      </div>

      <p className="text-center text-micro text-ink-500">
        الطبقتان تقرآن من السجل الحي نفسه — البلاغ الذي يُغلق أو الدورية التي تتحرك يختفيان ويتحركان هنا لحظيًا
      </p>
    </div>
  );
}
