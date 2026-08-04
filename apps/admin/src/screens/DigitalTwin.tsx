import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Building2, ClipboardList, Cpu, DoorOpen, Droplets, FileWarning, Footprints, Landmark, Layers, Lightbulb, Radio, RefreshCw, Siren, Trash2, TreePine, Zap } from 'lucide-react';
import { useStore } from '@dq/core';
import { DQTwinCanvas, type TwinLayers } from '../components/three/DQTwin';

const layerDefs: { key: keyof TwinLayers; labelAr: string; icon: typeof Radio }[] = [
  { key: 'traffic', labelAr: 'الحركة المرورية', icon: Activity },
  { key: 'patrols', labelAr: 'الدوريات', icon: Radio },
  { key: 'bins', labelAr: 'الحاويات', icon: Trash2 },
  { key: 'lamps', labelAr: 'الإنارة', icon: Lightbulb },
  { key: 'tanks', labelAr: 'خزانات الري', icon: Droplets },
  { key: 'trees', labelAr: 'أشجار وري', icon: TreePine },
  { key: 'incidents', labelAr: 'البلاغات الأمنية', icon: Siren },
  { key: 'gates', labelAr: 'البوابات', icon: DoorOpen },
  { key: 'properties', labelAr: 'العقارات', icon: Building2 },
  { key: 'requests', labelAr: 'بلاغات السكان', icon: ClipboardList },
  { key: 'violations', labelAr: 'المخالفات', icon: FileWarning },
  { key: 'checkpoints', labelAr: 'نقاط التفتيش', icon: Footprints },
  { key: 'landmarks', labelAr: 'المعالم', icon: Landmark },
];

/** Smart Map — the georeferenced 3D model of DQ with every live layer on top.
 *  Shared by Admin (/a/twin) and Security (/s/twin); deep links respect the persona. */
export function DigitalTwin({ }: Record<string, never>) {
  const navigate = useNavigate();
  const store = useStore();
  const [layers, setLayers] = useState<TwinLayers>({
    traffic: true,
    patrols: true,
    bins: true,
    lamps: true,
    tanks: true,
    trees: true,
    incidents: true,
    gates: true,
    requests: true,
    violations: true,
    checkpoints: false,
    properties: true,
    landmarks: true,
  });
  const [autoRotate, setAutoRotate] = useState(false);

  const activeIncidents = store.incidents.filter((i) => i.status !== 'closed');
  const fullBins = useMemo(
    () => store.assets.filter((a) => a.kind === 'bin' && (store.sensorValues[a.id]?.fill ?? 0) >= 80),
    [store.assets, store.sensorValues],
  );
  const faults = useMemo(
    () => store.assets.filter((a) => a.kind === 'light_pole' && store.sensorValues[a.id]?.lampOk === false),
    [store.assets, store.sensorValues],
  );
  const dryTrees = useMemo(
    () => store.assets.filter((a) => a.kind === 'tree' && (store.sensorValues[a.id]?.moisture ?? 100) < 25),
    [store.assets, store.sensorValues],
  );

  const open = (link: string) => {
    if (link.startsWith('property:')) {
      const id = link.slice(9);
      if (true) navigate(`/a/properties/${id}`);
      else {
        const code = store.properties.find((p) => p.id === id)?.code ?? '';
        navigate(`/s/lookup?q=${encodeURIComponent(code)}`);
      }
      return;
    }
    if (link.startsWith('incident:')) navigate(`/s/incidents/${link.slice(9)}`);
    else if (link.startsWith('gate:')) navigate(`/s/gate/${link.slice(5)}`);
    else if (link === 'patrol') navigate('/s/patrol');
    else if (link === 'operations') navigate('/a/operations');
    else if (link === 'requests') navigate('/a/requests');
    else if (link === 'violations') navigate('/a/violations');
    else if (link === 'tour') navigate('/s/tour');
    else navigate('/');
  };

  const chip = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
      active ? 'bg-brand-600 text-ink-900' : 'bg-ink-0/80 text-ink-500 ring-1 ring-ink-100 hover:text-ink-900-800'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">الخريطة الذكية — الحي الدبلوماسي</h1>
          <p className="text-caption opacity-60">
            نموذج جغرافي حقيقي للحي · حرّك بالسحب، قرّب بالعجلة — كل الطبقات حية من نفس مخزن الحالة
          </p>
        </div>
        <div className="flex items-center gap-2 text-caption">
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${activeIncidents.length ? 'bg-danger-50 text-danger-600' : 'bg-ok-600-50 text-ok-600'}`}>
            <Siren size={12} /> {activeIncidents.length} بلاغ نشط
          </span>
          <span className="flex items-center gap-1 rounded-full bg-ok-600-50 px-2.5 py-1 font-semibold text-ok-600">
            <Radio size={12} /> {store.patrols.filter((p) => p.status === 'available').length} دورية متاحة
          </span>
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${fullBins.length + faults.length ? 'bg-warn-600-50 text-warn-600' : 'bg-ok-600-50 text-ok-600'}`}>
            <Cpu size={12} /> {fullBins.length + faults.length + dryTrees.length} تنبيه IoT
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-card ring-1 ring-ink-100" style={{ height: 'calc(100vh - 205px)', minHeight: 480 }}>
        <DQTwinCanvas layers={layers} autoRotate={autoRotate} onOpen={open} />

        {/* layer sidebar — checkboxes */}
        <aside className="absolute top-3 start-3 bottom-3 w-48 overflow-y-auto rounded-card bg-ink-0/85 p-3 ring-1 ring-ink-100 backdrop-blur thin-scroll">
          <p className="mb-2 flex items-center gap-1.5 text-caption font-bold text-ink-500">
            <Layers size={12} /> طبقات الخريطة
          </p>
          <div className="space-y-0.5">
            {layerDefs.map((l) => (
              <label
                key={l.key}
                className={`flex cursor-pointer items-center gap-2 rounded-ctl px-2 py-1.5 text-caption transition-colors hover:bg-ink-0/5 ${
                  layers[l.key] ? 'text-ink-800' : 'text-ink-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={layers[l.key]}
                  onChange={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
                  className="h-3.5 w-3.5 accent-gold"
                />
                <l.icon size={13} className={layers[l.key] ? 'text-brand-600' : ''} />
                {l.labelAr}
              </label>
            ))}
          </div>
        </aside>

        {/* view controls */}
        <div className="absolute top-3 end-3 flex gap-1.5">
          <button className={chip(autoRotate)} onClick={() => setAutoRotate((r) => !r)} title="دوران تلقائي للعرض">
            <RefreshCw size={13} /> دوران
          </button>
          <button
            className={chip(store.demoSpeed === 10)}
            onClick={() => store.setDemoSpeed(store.demoSpeed === 1 ? 10 : 1)}
            title="تسريع المحاكاة — الدوريات والمستشعرات"
          >
            <Zap size={13} /> {store.demoSpeed}×
          </button>
        </div>

        {/* legend */}
        <div className="absolute bottom-8 end-3 rounded-card bg-ink-0/85 p-3 text-micro text-ink-800 ring-1 ring-ink-100 backdrop-blur">
          <p className="mb-1.5 font-bold text-ink-500">دليل الطبقات</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-1.5 rounded-sm bg-[#0e7c4a]" /> حركة سالكة</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-1.5 rounded-sm bg-[#a82a22]" /> ازدحام</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#0e7c4a]" /> دورية متاحة</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#0e6a60]" /> دورية في مهمة</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a82a22]" /> بلاغ / حاوية ممتلئة</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0e6a60]" /> بوابة</span>
          </div>
        </div>

        {/* attribution — required by the model's imagery license */}
        <p dir="ltr" className="absolute bottom-1 end-2 text-micro text-white/40">
          Imagery: Satlas — Allen Institute for AI · Map data © OpenStreetMap contributors
        </p>
      </div>
    </div>
  );
}
