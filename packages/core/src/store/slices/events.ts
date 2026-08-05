import { nanoid } from 'nanoid';
import type { EventApproval, EventMinistry, EventPartyKind, EventRequest } from '../../types';
import type { Get, Set } from '../storeTypes';
import { updateById } from '../storeTypes';
import { nowISO } from '../../lib/time';
import { eventMinistryAr, eventPartyAr, eventRequesterAr } from '../../i18n/strings';

/** الجهات التابعة لوزارة الداخلية — طلب أي منها يستوجب اعتماد الوزارة */
export const MOI_PARTIES: EventPartyKind[] = ['police', 'traffic_police', 'civil_defense'];

export const createEventsSlice = (set: Set, get: Get) => ({
  createEventRequest: (input: {
    titleAr: string;
    requesterKind: EventRequest['requesterKind'];
    requesterNameAr: string;
    requesterPropertyId?: string;
    facilityId: string;
    fromISO: string;
    toISO: string;
    attendees: number;
    notesAr?: string;
    parties: EventRequest['parties'];
  }) => {
    const from = new Date(input.fromISO).getTime();
    const to = new Date(input.toISO).getTime();
    if (!input.titleAr.trim() || !input.requesterNameAr.trim()) {
      get().pushToast('بيانات ناقصة', 'عنوان الفعالية واسم الجهة الطالبة مطلوبان', 'bad');
      return null;
    }
    if (Number.isNaN(from) || Number.isNaN(to) || to <= from) {
      get().pushToast('موعد غير صالح', 'وقت النهاية يجب أن يكون بعد وقت البداية', 'bad');
      return null;
    }
    if (from < Date.now()) {
      get().pushToast('تاريخ غير صالح', 'لا يمكن طلب فعالية في وقت مضى', 'bad');
      return null;
    }

    // مسار الاعتماد: الداخلية عند طلب جهة أمنية تابعة لها، والخارجية لفعاليات السفارات
    const approvals: EventApproval[] = [];
    if (input.parties.some((p) => MOI_PARTIES.includes(p))) approvals.push({ ministry: 'interior', status: 'pending' });
    if (input.requesterKind === 'embassy') approvals.push({ ministry: 'foreign_affairs', status: 'pending' });

    const req: EventRequest = {
      id: nanoid(8),
      titleAr: input.titleAr.trim(),
      requesterKind: input.requesterKind,
      requesterNameAr: input.requesterNameAr.trim(),
      requesterPropertyId: input.requesterPropertyId,
      facilityId: input.facilityId,
      fromISO: input.fromISO,
      toISO: input.toISO,
      attendees: input.attendees,
      notesAr: input.notesAr?.trim() || undefined,
      parties: input.parties,
      partiesSentISO: input.parties.length ? nowISO() : undefined,
      approvals,
      status: 'pending',
      createdISO: nowISO(),
    };
    set((st) => ({ eventRequests: [req, ...st.eventRequests] }));
    get().appendAudit('event_request', req.id, 'create', undefined, {
      requesterKind: req.requesterKind,
      parties: req.parties,
      approvals: approvals.map((a) => a.ministry),
    });

    // إرسال فوري للجهات المحددة: أمن الحي جهة داخلية (منصة العمليات)،
    // والبقية جهات خارجية تُحاكى بإشعار في مركز القيادة
    if (req.parties.includes('district_security')) {
      get().notify(
        'security',
        'طلب تأمين فعالية',
        `${req.titleAr} — ${eventRequesterAr[req.requesterKind]}: ${req.requesterNameAr} · ${req.attendees} شخص`,
        '/s/incidents',
        'warn',
      );
    }
    const external = req.parties.filter((p) => p !== 'district_security');
    if (external.length) {
      get().notify(
        'admin',
        'أُرسل طلب التنسيق للجهات الخارجية',
        `${req.titleAr} — ${external.map((p) => eventPartyAr[p]).join('، ')}`,
        '/a/events',
      );
    }
    if (approvals.length) {
      get().notify(
        'admin',
        'طلب فعالية بانتظار الاعتماد الوزاري',
        `${req.titleAr} — ${approvals.map((a) => eventMinistryAr[a.ministry]).join(' و')}`,
        '/a/events',
        'warn',
      );
    }
    get().pushToast(
      'سُجّل طلب الفعالية',
      [
        req.parties.length ? `أُرسل التنسيق إلى: ${req.parties.map((p) => eventPartyAr[p]).join('، ')}` : '',
        approvals.length ? `بانتظار اعتماد: ${approvals.map((a) => eventMinistryAr[a.ministry]).join(' و')}` : '',
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
      'ok',
    );
    return req;
  },

  /** قرار وزارة (محاكاة) — اكتمال كل الاعتمادات بالموافقة يعتمد الطلب، وأي رفض يرفضه */
  decideEventApproval: (id: string, ministry: EventMinistry, decision: 'approved' | 'rejected', noteAr?: string) => {
    const req = get().eventRequests.find((r) => r.id === id);
    if (!req || req.status !== 'pending') return;
    const target = req.approvals.find((a) => a.ministry === ministry);
    if (!target || target.status !== 'pending') return;

    const approvals = req.approvals.map((a) =>
      a.ministry === ministry ? { ...a, status: decision, decidedISO: nowISO(), noteAr } : a,
    );
    const status: EventRequest['status'] = approvals.some((a) => a.status === 'rejected')
      ? 'rejected'
      : approvals.every((a) => a.status === 'approved')
        ? 'approved'
        : 'pending';

    set((st) => ({ eventRequests: updateById(st.eventRequests, id, { approvals, status }) }));
    get().appendAudit('event_request', id, 'update', { ministry, status: 'pending' }, { ministry, status: decision });
    get().pushToast(
      `${eventMinistryAr[ministry]}: ${decision === 'approved' ? 'وافقت' : 'رفضت'}`,
      status === 'approved' ? `اكتمل الاعتماد — ${req.titleAr}` : req.titleAr,
      decision === 'approved' ? 'ok' : 'warn',
    );
    if (status !== 'pending') {
      get().notify(
        'admin',
        status === 'approved' ? 'اكتمل اعتماد الفعالية' : 'رُفض طلب الفعالية',
        req.titleAr,
        '/a/events',
        status === 'approved' ? 'info' : 'warn',
      );
    }
  },

  /** اعتماد مباشر من المشغّل — للطلبات التي لا تتطلب أي اعتماد وزاري */
  decideEventRequest: (id: string, decision: 'approved' | 'rejected') => {
    const req = get().eventRequests.find((r) => r.id === id);
    if (!req || req.status !== 'pending' || req.approvals.some((a) => a.status === 'pending')) return;
    set((st) => ({ eventRequests: updateById(st.eventRequests, id, { status: decision }) }));
    get().appendAudit('event_request', id, 'update', { status: 'pending' }, { status: decision });
    get().pushToast(
      decision === 'approved' ? 'اعتُمدت الفعالية' : 'رُفض طلب الفعالية',
      req.titleAr,
      decision === 'approved' ? 'ok' : 'warn',
    );
  },
});
