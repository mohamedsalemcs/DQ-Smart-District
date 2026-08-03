import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileText, History, MapPin, Radio, Siren } from 'lucide-react';
import { useStore } from '@dq/core';
import { Button, Card, EmptyState, SectionTitle } from '@dq/ui';
import { incidentPill } from '../components/StatusPill';
import { Timeline } from '../components/Timeline';
import { AuditDrawer } from '../components/AuditDrawer';
import { Map3D } from '../components/three/DQTwin';
import { PlateBadge, Txn } from '@dq/ui';
import { distance } from '@dq/core';
import { elapsedSince, fmtDateTime, secondsToClock } from '@dq/core';
import { incidentKindAr, severityAr } from '@dq/core';

/** Live mm:ss since dispatch — the response timer the client watches. */
function ResponseTimer({ fromISO }: { fromISO: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="plate text-3xl font-bold tabular-nums text-warn-600">{elapsedSince(fromISO)}</span>;
}

export function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const [auditOpen, setAuditOpen] = useState(false);
  const incident = store.incidents.find((i) => i.id === id);

  const nearestPatrols = useMemo(() => {
    if (!incident) return [];
    return [...store.patrols]
      .map((p) => ({ ...p, d: distance(p.lat, p.lng, incident.lat, incident.lng) }))
      .sort((a, b) => a.d - b.d);
  }, [store.patrols, incident]);

  if (!incident) return <EmptyState title="البلاغ غير موجود" />;

  const patrol = incident.dispatch ? store.patrols.find((p) => p.id === incident.dispatch!.patrolId) : undefined;
  const mahdar = incident.mahdarId ? store.mahadir.find((m) => m.id === incident.mahdarId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Siren size={18} className="text-brand-600" />
            {incidentKindAr[incident.kind]}
            <Txn no={incident.txnNo} className="text-brand-600" />
          </h1>
          <p className="mt-0.5 text-[--text-caption] text-ink-500">
            وقعت {fmtDateTime(incident.occurredISO)} · أُبلغت {fmtDateTime(incident.reportedISO)} · الخطورة: {severityAr[incident.severity]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {incidentPill(incident.status)}
          <Button size="sm" variant="ghost" onClick={() => setAuditOpen(true)}>
            <History size={13} /> سجل التدقيق
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* dispatch panel */}
          <Card className="p-5">
            <SectionTitle>الإسناد والاستجابة</SectionTitle>

            {incident.status === 'open' && (
              <div>
                <p className="mb-2 text-sm text-ink-500">أقرب الدوريات للموقع — الأقرب أولًا:</p>
                <div className="space-y-2">
                  {nearestPatrols.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between rounded-[--radius-card] bg-ink-0 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Radio size={15} className={p.status === 'available' ? 'text-ok-600' : 'text-ink-500'} />
                        <span>{p.nameAr}</span>
                        {i === 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[--text-micro] font-bold text-brand-600">الأقرب</span>}
                      </div>
                      <Button size="sm" disabled={p.status !== 'available'} onClick={() => store.dispatchPatrol(incident.id, p.id)}>
                        إسناد
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {incident.status === 'dispatched' && incident.dispatch && (
              <div className="text-center">
                <p className="text-sm text-ink-500">{patrol?.nameAr} في الطريق — عدّاد الاستجابة</p>
                <div className="my-3"><ResponseTimer fromISO={incident.dispatch.dispatchedISO} /></div>
                <Button size="lg" variant="success" onClick={() => store.confirmArrival(incident.id)}>
                  <CheckCircle2 size={18} /> تأكيد الوصول للموقع
                </Button>
                <p className="mt-2 text-[--text-caption] text-ink-500">وقت الوصول يُسجَّل تلقائيًا عند التأكيد</p>
              </div>
            )}

            {incident.dispatch?.arrivedISO && (
              <div className="rounded-[--radius-card] bg-ok-600-50 p-4 text-center">
                <p className="text-sm text-ok-600">وصلت {patrol?.nameAr}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ok-600">
                  زمن الاستجابة {secondsToClock(incident.dispatch.responseSeconds ?? 0)}
                </p>
                <p className="mt-0.5 text-[--text-caption] text-ink-500">سُجّل الوصول {fmtDateTime(incident.dispatch.arrivedISO)}</p>
              </div>
            )}

            {incident.status === 'on_scene' && (
              <div className="mt-4 text-center">
                <Button size="lg" onClick={() => { const m = store.startMahdar(incident.id); navigate(`/s/incidents/${incident.id}/mahdar`); void m; }}>
                  <FileText size={18} /> فتح المحضر
                </Button>
              </div>
            )}

            {(incident.status === 'pending_mahdar' || incident.status === 'pending_approval' || incident.status === 'closed') && mahdar && (
              <div className="mt-2 text-center">
                <Link to={`/s/incidents/${incident.id}/mahdar`}>
                  <Button variant={mahdar.locked ? 'outline' : 'primary'} className={mahdar.locked ? 'border-ink-300 text-ink-800' : ''}>
                    <FileText size={16} /> {mahdar.locked ? 'عرض المحضر المعتمد (مقفل)' : 'متابعة المحضر'}
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* facts */}
          <Card className="p-5">
            <SectionTitle>وقائع البلاغ</SectionTitle>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-ink-500">المبلّغ</dt>
              <dd>{store.people.find((p) => p.id === incident.reportedBy)?.nameAr ?? '—'}</dd>
              {incident.vehicle && (
                <>
                  <dt className="text-ink-500">المركبة</dt>
                  <dd className="flex items-center gap-2">
                    <PlateBadge plate={incident.vehicle.plate} size="sm" />
                    {incident.vehicle.make} · {incident.vehicle.color}
                  </dd>
                  {incident.vehicle.driverNameAr && (
                    <>
                      <dt className="text-ink-500">السائق</dt>
                      <dd>{incident.vehicle.driverNameAr}</dd>
                    </>
                  )}
                </>
              )}
              {incident.gateId && (
                <>
                  <dt className="text-ink-500">البوابة</dt>
                  <dd>{store.gates.find((g) => g.id === incident.gateId)?.nameAr}</dd>
                </>
              )}
              {incident.parties.length > 0 && (
                <>
                  <dt className="text-ink-500">الأطراف</dt>
                  <dd>{incident.parties.map((p) => p.nameAr).join('، ')}</dd>
                </>
              )}
            </dl>
          </Card>

          <Card className="p-5">
            <SectionTitle>الخط الزمني</SectionTitle>
            <Timeline events={incident.events} />
          </Card>
        </div>

        {/* map */}
        <Card className="p-3">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-[--text-caption] font-semibold text-ink-500">
            <MapPin size={13} /> موقع البلاغ والدوريات — حي
          </p>
          <Map3D layers={{ incidents: true, patrols: true, gates: true }} className="aspect-[4/3]" />
        </Card>
      </div>

      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} entity="incident" entityId={incident.id} />
    </div>
  );
}
