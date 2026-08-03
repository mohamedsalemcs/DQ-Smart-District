import { nanoid } from 'nanoid';
import type { ServiceRequest } from '../../types';
import type { Get, Set, Store } from '../storeTypes';
import { currentActor, updateById } from '../storeTypes';
import { nowISO } from '../../lib/time';
import { requestKindAr } from '../../i18n/strings';
import { assertTransition, requestTransitions } from '../../lib/rules';

const ev = (s: Store, action: string, detailAr?: string) => ({
  atISO: nowISO(),
  actorId: currentActor(s),
  actorRole: s.persona,
  action,
  detailAr,
});

export const createRequestsSlice = (set: Set, get: Get) => ({
  createRequest: (input: Parameters<Store['createRequest']>[0]) => {
    const s = get();
    const actor = currentActor(s);
    const person = s.people.find((p) => p.id === actor);
    const req: ServiceRequest = {
      id: nanoid(8),
      kind: input.kind,
      status: 'new',
      priority: input.priority,
      raisedBy: actor,
      propertyId: person?.propertyId,
      lat: input.lat,
      lng: input.lng,
      descriptionAr: input.descriptionAr,
      mediaBefore: input.media ? ['before'] : [],
      mediaAfter: [],
      slaBreached: false,
      events: [ev(s, 'إنشاء البلاغ')],
    };
    set((st) => ({ requests: [req, ...st.requests] }));
    get().appendAudit('request', req.id, 'create', undefined, { kind: req.kind, priority: req.priority });
    get().notify('admin', 'بلاغ جديد', `${requestKindAr[req.kind]} — ${req.descriptionAr.slice(0, 60)}`, '/a/requests', input.priority === 'urgent' ? 'warn' : 'info');
    get().pushToast('تم إرسال البلاغ', 'سيصلك إشعار عند التصنيف والمعالجة', 'ok');
    return req;
  },

  triageRequest: (id: string, orgId: string, dueISO: string, priority: ServiceRequest['priority']) => {
    const s = get();
    const req = s.requests.find((r) => r.id === id);
    if (!req) return;
    // DEF-010 — البلاغات كانت الكيان الوحيد بلا آلة حالة
    assertTransition('request', requestTransitions, req.status, 'assigned');
    set((st) => ({
      requests: updateById(st.requests, id, (r) => ({
        status: 'assigned',
        assignedToOrgId: orgId,
        dueISO,
        priority,
        events: [...r.events, ev(st, 'تصنيف وإسناد', st.organizations.find((o) => o.id === orgId)?.nameAr)],
      })),
    }));
    get().appendAudit('request', id, 'update', { status: req.status }, { status: 'assigned', orgId, dueISO });
    get().notify(req.raisedBy, 'تم إسناد بلاغك', `${requestKindAr[req.kind]} — قيد المعالجة`, `/r/requests/${id}`);
    get().notify('resident', 'تم إسناد بلاغك', requestKindAr[req.kind], `/r/requests/${id}`);
    get().pushToast('تم الإسناد', undefined, 'ok');
  },

  startRequestWork: (id: string) => {
    const s = get();
    const req = s.requests.find((r) => r.id === id);
    if (!req) return;
    assertTransition('request', requestTransitions, req.status, 'in_progress');
    set((st) => ({
      requests: updateById(st.requests, id, (r) => ({ status: 'in_progress', events: [...r.events, ev(st, 'بدء التنفيذ')] })),
    }));
    get().appendAudit('request', id, 'update', { status: req.status }, { status: 'in_progress' });
  },

  completeRequestWork: (id: string) => {
    const s = get();
    const req = s.requests.find((r) => r.id === id);
    if (!req) return;
    assertTransition('request', requestTransitions, req.status, 'awaiting_verification');
    set((st) => ({
      requests: updateById(st.requests, id, (r) => ({
        status: 'awaiting_verification',
        mediaAfter: ['after'],
        events: [...r.events, ev(st, 'اكتمال التنفيذ ورفع صور ما بعد المعالجة')],
      })),
    }));
    get().appendAudit('request', id, 'update', { status: req.status }, { status: 'awaiting_verification' });
    get().notify(req.raisedBy, 'تمت معالجة بلاغك', 'يمكنك الآن تأكيد الإغلاق أو إعادة الفتح', `/r/requests/${id}`);
    get().notify('resident', 'تمت معالجة بلاغك', requestKindAr[req.kind], `/r/requests/${id}`);
  },

  approveRequestClosure: (id: string) => {
    const s = get();
    const req = s.requests.find((r) => r.id === id);
    if (!req) return;
    assertTransition('request', requestTransitions, req.status, 'closed');
    set((st) => ({
      requests: updateById(st.requests, id, (r) => ({ status: 'closed', events: [...r.events, ev(st, 'اعتماد الإغلاق')] })),
    }));
    get().appendAudit('request', id, 'approve', { status: req.status }, { status: 'closed' });
    get().pushToast('تم إغلاق البلاغ', undefined, 'ok');
  },

  rateRequest: (id: string, rating: 1 | 2 | 3 | 4 | 5) => {
    // BR-057 · DEF-029 — الحرس كان في الواجهة فقط: مرة واحدة، بعد الإغلاق
    const r0 = get().requests.find((r) => r.id === id);
    if (!r0 || r0.status !== 'closed' || r0.rating) return;
    set((st) => ({
      requests: updateById(st.requests, id, (r) => ({ rating, events: [...r.events, ev(st, `تقييم الخدمة: ${rating}/5`)] })),
    }));
    get().appendAudit('request', id, 'update', undefined, { rating });
    get().pushToast('شكرًا لتقييمك', undefined, 'ok');
  },

  /** BR-058 — لم يكن للإدارة مسار رفض بلاغ (مكرر / خارج النطاق / كيدي) */
  rejectRequest: (id: string, reasonAr: string) => {
    const s = get();
    const req = s.requests.find((r) => r.id === id);
    if (!req) return;
    assertTransition('request', requestTransitions, req.status, 'rejected');
    set((st) => ({
      requests: updateById(st.requests, id, (r) => ({
        status: 'rejected' as const,
        rejectionReasonAr: reasonAr,
        events: [...r.events, ev(st, 'رفض البلاغ', reasonAr)],
      })),
    }));
    get().appendAudit('request', id, 'update', { status: req.status }, { status: 'rejected', reasonAr });
    get().notify(req.raisedBy, 'رُفض بلاغك', reasonAr, `/requests/${id}`, 'warn');
    get().pushToast('رُفض البلاغ', reasonAr, 'warn');
  },

  /**
   * BR-054 · DEF-011 — تجاوز SLA يُعلَّم حال حدوثه ويُشعَر به.
   * كان slaBreached يُكتب false ولا يُحدَّث أبدًا، فيُحسب عند العرض فقط
   * ولا يعلم أحد بالتجاوز ما لم يفتح الشاشة.
   */
  sweepSlaBreaches: () => {
    const s = get();
    const now = Date.now();
    const newly = s.requests.filter(
      (r) =>
        !r.slaBreached &&
        r.dueISO &&
        new Date(r.dueISO).getTime() < now &&
        r.status !== 'closed' &&
        r.status !== 'rejected',
    );
    if (!newly.length) return 0;
    const ids = new Set(newly.map((r) => r.id));
    set((st) => ({
      requests: st.requests.map((r) => (ids.has(r.id) ? { ...r, slaBreached: true } : r)),
    }));
    newly.forEach((r) => {
      get().appendAudit('request', r.id, 'update', { slaBreached: false }, { slaBreached: true });
      get().notify('admin', 'تجاوز مهلة SLA', `${requestKindAr[r.kind]} — ${r.descriptionAr.slice(0, 50)}`, `/requests`, 'warn');
    });
    return newly.length;
  },

  reopenRequest: (id: string, noteAr: string) => {
    const s = get();
    const req = s.requests.find((r) => r.id === id);
    if (!req) return;
    assertTransition('request', requestTransitions, req.status, 'reopened');
    set((st) => ({
      requests: updateById(st.requests, id, (r) => ({ status: 'reopened', events: [...r.events, ev(st, 'إعادة فتح البلاغ', noteAr)] })),
    }));
    get().appendAudit('request', id, 'update', { status: req.status }, { status: 'reopened', noteAr });
    get().notify('admin', 'أُعيد فتح بلاغ', `${requestKindAr[req.kind]} — ${noteAr}`, '/a/requests', 'warn');
    get().pushToast('أُعيد فتح البلاغ', undefined, 'warn');
  },
});
