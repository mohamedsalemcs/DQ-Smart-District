import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, DoorOpen, Radio, Siren, UserX } from 'lucide-react';
import { useStore } from '@dq/core';
import { Card, SectionTitle, Stat } from '@dq/ui';
import { incidentPill } from '../components/StatusPill';
import { Map3D } from '../components/three/DQTwin';
import { Txn } from '@dq/ui';
import { ago } from '@dq/core';
import { incidentKindAr } from '@dq/core';

/** §11 — غرفة العمليات: active incidents, patrols, gate states, uncovered posts. */
export function OpsRoom() {
  const store = useStore();
  const navigate = useNavigate();
  const active = store.incidents.filter((i) => i.status !== 'closed');
  const uncovered = store.shifts.filter((s) => !s.checkedInISO && !s.checkedOutISO);
  const suspended = store.vehicles.filter((v) => v.accessState === 'suspended');

  return (
    <div className="space-y-4">
      <SectionTitle>غرفة العمليات</SectionTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="بلاغات نشطة" value={active.length} />
        <Stat label="دوريات متاحة" value={store.patrols.filter((p) => p.status === 'available').length} />
        <Stat label="مواقع غير مغطاة" value={uncovered.length} />
        <Stat label="مركبات موقوفة (إنفاذ بوابي)" value={suspended.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* live map */}
        <Card className="lg:col-span-2 p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-ink-500">
            الخريطة الحية ثلاثية الأبعاد — بلاغات · دوريات متحركة · بوابات · حركة مرورية
          </p>
          <Map3D
            layers={{ traffic: true, patrols: true, incidents: true, gates: true }}
            className="aspect-[16/10]"
            onOpen={(link) => {
              if (link.startsWith('incident:')) navigate(`/incidents/${link.slice(9)}`);
              else if (link.startsWith('gate:')) navigate(`/gate/${link.slice(5)}`);
              else navigate('/patrol');
            }}
          />
        </Card>

        <div className="space-y-4">
          {/* active incidents */}
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-ink-500">
              <Siren size={13} /> البلاغات النشطة
            </p>
            <div className="space-y-2">
              {active.map((i) => (
                <Link key={i.id} to={`/incidents/${i.id}`} className="block rounded-card bg-ink-0 p-3 transition-colors hover:bg-ink-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{incidentKindAr[i.kind]}</span>
                    {incidentPill(i.status)}
                  </div>
                  <p className="mt-1 text-caption text-ink-500">
                    <Txn no={i.txnNo} /> · {ago(i.reportedISO)}
                  </p>
                </Link>
              ))}
              {active.length === 0 && <p className="py-2 text-center text-caption text-ink-500">لا بلاغات نشطة</p>}
            </div>
          </Card>

          {/* gates */}
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-ink-500">
              <DoorOpen size={13} /> حالة البوابات
            </p>
            <div className="space-y-1.5">
              {store.gates.map((g) => (
                <Link key={g.id} to={`/gate/${g.id}`} className="flex items-center justify-between rounded-ctl bg-ink-0 px-3 py-2 text-sm hover:bg-ink-50">
                  <span>{g.nameAr}</span>
                  <span className={`flex items-center gap-1 text-caption ${g.state === 'open' ? 'text-ok-600' : g.state === 'manual' ? 'text-warn-600-600' : 'text-danger-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${g.state === 'open' ? 'bg-ok-600' : g.state === 'manual' ? 'bg-warn-600' : 'bg-danger-600'}`} />
                    {g.state === 'open' ? 'مفتوحة' : g.state === 'manual' ? 'تشغيل يدوي' : 'مغلقة'}
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          {/* uncovered posts */}
          {uncovered.length > 0 && (
            <Card className="border border-danger-500 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-danger-600">
                <UserX size={13} /> مواقع غير مغطاة
              </p>
              {uncovered.map((s) => (
                <p key={s.id} className="flex items-center gap-1.5 py-1 text-sm">
                  <AlertTriangle size={13} className="text-warn-600" />
                  {store.gates.find((g) => g.id === s.postId)?.nameAr} — {store.people.find((p) => p.id === s.guardId)?.nameAr} لم يسجّل حضورًا
                </p>
              ))}
            </Card>
          )}

          {/* patrols */}
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-ink-500">
              <Radio size={13} /> الدوريات
            </p>
            {store.patrols.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                <span>{p.nameAr}</span>
                <span className={`text-caption ${p.status === 'available' ? 'text-ok-600' : 'text-warn-600-600'}`}>
                  {p.status === 'available' ? 'متاحة' : p.status === 'dispatched' ? 'في مهمة' : 'في الموقع'}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
