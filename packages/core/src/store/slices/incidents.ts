import { nanoid } from 'nanoid';
import type { Incident, Mahdar } from '../../types';
import type { Get, Set, Store } from '../storeTypes';
import { currentActor, updateById } from '../storeTypes';
import { assertTransition, incidentTransitions } from '../../lib/rules';
import { nowISO } from '../../lib/time';
import { formatTxn } from '../../lib/txn';
import { incidentKindAr } from '../../i18n/strings';

const ev = (s: Store, action: string, detailAr?: string) => ({
  atISO: nowISO(),
  actorId: currentActor(s),
  actorRole: s.persona,
  action,
  detailAr,
});

export const createIncidentsSlice = (set: Set, get: Get) => ({
  createIncident: (input: Parameters<Store['createIncident']>[0]) => {
    const s = get();
    const txnNo = formatTxn(s.nextTxn);
    const incident: Incident = {
      id: nanoid(8),
      txnNo,
      kind: input.kind,
      severity: input.severity,
      occurredISO: input.occurredISO,
      reportedISO: nowISO(),
      reportedBy: currentActor(s),
      lat: input.lat,
      lng: input.lng,
      gateId: input.gateId,
      propertyId: input.propertyId,
      vehicle: input.vehicle,
      parties: input.parties,
      status: 'open',
      events: [ev(s, 'تسجيل البلاغ', input.detailAr)],
    };
    set((st) => ({ incidents: [incident, ...st.incidents], nextTxn: st.nextTxn + 1 }));
    get().appendAudit('incident', incident.id, 'create', undefined, { txnNo, kind: incident.kind, severity: incident.severity });
    get().notify('security', `بلاغ جديد ${txnNo}`, `${incidentKindAr[incident.kind]} — بانتظار الإسناد`, `/s/incidents/${incident.id}`, incident.severity === 'critical' || incident.severity === 'high' ? 'critical' : 'warn');
    get().notify('admin', `بلاغ أمني ${txnNo}`, incidentKindAr[incident.kind], '/a', 'info');
    get().pushToast(`صدر رقم المعاملة ${txnNo}`, 'أُشعرت غرفة العمليات', 'ok');
    return incident;
  },

  dispatchPatrol: (incidentId: string, patrolId: string) => {
    const s = get();
    const incident = s.incidents.find((i) => i.id === incidentId);
    const patrol = s.patrols.find((p) => p.id === patrolId);
    if (!incident || !patrol) return;
    assertTransition('incident', incidentTransitions, incident.status, 'dispatched');
    set((st) => ({
      incidents: updateById(st.incidents, incidentId, (i) => ({
        status: 'dispatched' as const,
        dispatch: { patrolId, dispatchedISO: nowISO() },
        events: [...i.events, ev(st, 'إسناد دورية', patrol.nameAr)],
      })),
      patrols: updateById(st.patrols, patrolId, { status: 'dispatched' as const }),
    }));
    get().appendAudit('incident', incidentId, 'update', { status: incident.status }, { status: 'dispatched', patrolId });
    get().notify('security', 'تم إسناد دورية', `${incident.txnNo} — ${patrol.nameAr} في الطريق`, `/s/incidents/${incidentId}`);
    get().pushToast('انطلقت الدورية', 'عدّاد الاستجابة يعمل', 'ok');
  },

  confirmArrival: (incidentId: string) => {
    const s = get();
    const incident = s.incidents.find((i) => i.id === incidentId);
    if (!incident?.dispatch) return;
    assertTransition('incident', incidentTransitions, incident.status, 'on_scene');
    const arrivedISO = nowISO();
    const responseSeconds = Math.round(
      (new Date(arrivedISO).getTime() - new Date(incident.dispatch.dispatchedISO).getTime()) / 1000,
    );
    set((st) => ({
      incidents: updateById(st.incidents, incidentId, (i) => ({
        status: 'on_scene' as const,
        dispatch: { ...i.dispatch!, arrivedISO, responseSeconds },
        events: [...i.events, ev(st, 'تأكيد الوصول للموقع', `زمن الاستجابة ${Math.floor(responseSeconds / 60)}:${String(responseSeconds % 60).padStart(2, '0')}`)],
      })),
      patrols: updateById(st.patrols, incident.dispatch!.patrolId, { status: 'on_scene' as const, lat: incident.lat, lng: incident.lng }),
    }));
    get().appendAudit('incident', incidentId, 'update', { status: incident.status }, { status: 'on_scene', responseSeconds });
    get().pushToast('سُجّل الوصول تلقائيًا', `زمن الاستجابة ${Math.floor(responseSeconds / 60)} د ${responseSeconds % 60} ث`, 'ok');
  },

  startMahdar: (incidentId: string) => {
    const s = get();
    const incident = s.incidents.find((i) => i.id === incidentId)!;
    const existing = s.mahadir.find((m) => m.incidentId === incidentId);
    if (existing) return existing;
    assertTransition('incident', incidentTransitions, incident.status, 'pending_mahdar');
    const mahdar: Mahdar = {
      id: nanoid(8),
      incidentId,
      txnNo: incident.txnNo,
      summaryAr: '',
      resolutionAr: '',
      seized: [],
      signatures: [],
      locked: false,
      hashChain: [],
    };
    set((st) => ({
      mahadir: [mahdar, ...st.mahadir],
      incidents: updateById(st.incidents, incidentId, (i) => ({
        status: 'pending_mahdar' as const,
        mahdarId: mahdar.id,
        events: [...i.events, ev(st, 'فتح المحضر')],
      })),
      patrols: incident.dispatch
        ? updateById(st.patrols, incident.dispatch.patrolId, { status: 'available' as const })
        : st.patrols,
    }));
    get().appendAudit('mahdar', mahdar.id, 'create', undefined, { txnNo: incident.txnNo });
    return mahdar;
  },
});
