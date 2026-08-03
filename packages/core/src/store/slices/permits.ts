import { nanoid } from 'nanoid';
import type { Permit } from '../../types';
import type { Get, Set } from '../storeTypes';
import { currentActor, updateById } from '../storeTypes';
import { assertTransition, permitTransitions } from '../../lib/rules';
import { nowISO } from '../../lib/time';
import { permitKindAr } from '../../i18n/strings';

export const createPermitsSlice = (set: Set, get: Get) => ({
  createPermit: (input: Parameters<import('../storeTypes').Store['createPermit']>[0]) => {
    const s = get();
    const actor = currentActor(s);
    const host = s.people.find((p) => p.id === actor);
    const permit: Permit = {
      id: nanoid(8),
      kind: input.kind,
      status: 'pending',
      requestedBy: actor,
      hostPropertyId: host?.propertyId,
      subject: { nameAr: input.subjectNameAr, nationalId: input.subjectNationalId, phone: input.subjectPhone },
      plate: input.plate || undefined,
      gateIds: input.gateIds,
      validFromISO: input.validFromISO,
      validToISO: input.validToISO,
      companions: input.companions,
      qrToken: `QR-PRM-${nanoid(6).toUpperCase()}`,
      approvals: [],
      createdISO: nowISO(),
    };
    set((st) => ({ permits: [permit, ...st.permits] }));
    get().appendAudit('permit', permit.id, 'create', undefined, { kind: permit.kind, subject: permit.subject.nameAr });
    get().notify('admin', 'طلب تصريح جديد', `${permitKindAr[permit.kind]} — ${permit.subject.nameAr}`, '/a/permits');
    get().pushToast('تم إرسال طلب التصريح', 'سيصلك إشعار عند الاعتماد', 'ok');
    return permit;
  },

  decidePermit: (id: string, decision: 'approved' | 'rejected' | 'info_requested', noteAr?: string) => {
    const s = get();
    const permit = s.permits.find((p) => p.id === id);
    if (!permit) return;
    const actor = currentActor(s);
    if (decision !== 'info_requested') {
      assertTransition('permit', permitTransitions, permit.status, decision);
    }
    set((st) => ({
      permits: updateById(st.permits, id, (p) => ({
        status: decision === 'info_requested' ? p.status : decision,
        approvals: [...p.approvals, { by: actor, role: st.persona, decision, noteAr, atISO: nowISO() }],
      })),
    }));
    get().appendAudit('permit', id, decision === 'approved' ? 'approve' : 'update', { status: permit.status }, { status: decision, noteAr });
    const label = decision === 'approved' ? 'تم اعتماد التصريح' : decision === 'rejected' ? 'تم رفض التصريح' : 'مطلوب معلومات إضافية';
    // BR-177 · DEF-026 — كان يرسل إشعارين متطابقين لنفس الحدث
    get().notify(permit.requestedBy, label, `${permitKindAr[permit.kind]} — ${permit.subject.nameAr}${noteAr ? ` · ${noteAr}` : ''}`, '/permits', decision === 'rejected' ? 'warn' : 'info');
    get().pushToast(label, permit.subject.nameAr, decision === 'rejected' ? 'warn' : 'ok');
  },

  /** BR-038 — صاحب الطلب يلغي تصريحه؛ الرمز يُبطل فورًا عند البوابة */
  cancelPermit: (id: string) => {
    const s = get();
    const permit = s.permits.find((p) => p.id === id);
    if (!permit) return;
    assertTransition('permit', permitTransitions, permit.status, 'cancelled');
    set((st) => ({ permits: updateById(st.permits, id, { status: 'cancelled' as const }) }));
    get().appendAudit('permit', id, 'update', { status: permit.status }, { status: 'cancelled' });
    get().pushToast('أُلغي التصريح', 'الرمز لم يعد صالحًا عند البوابة', 'warn');
  },

  /**
   * BR-035 · DEF-008 — التصريح المنتهي زمنيًا كان يبقى «معتمدًا» في كل شاشة
   * بينما البوابة ترفضه، فينشأ تناقض مرئي.
   */
  expirePermits: () => {
    const s = get();
    const now = Date.now();
    const due = s.permits.filter((p) => p.status === 'approved' && new Date(p.validToISO).getTime() < now);
    if (!due.length) return 0;
    const ids = new Set(due.map((p) => p.id));
    set((st) => ({
      permits: st.permits.map((p) => (ids.has(p.id) ? { ...p, status: 'expired' as const } : p)),
    }));
    due.forEach((p) => get().appendAudit('permit', p.id, 'update', { status: 'approved' }, { status: 'expired', by: 'system' }));
    return due.length;
  },

  suspendPermit: (id: string, noteAr: string) => {
    const s = get();
    const permit = s.permits.find((p) => p.id === id);
    if (!permit) return;
    assertTransition('permit', permitTransitions, permit.status, 'suspended');
    set((st) => ({ permits: updateById(st.permits, id, { status: 'suspended' }) }));
    get().appendAudit('permit', id, 'update', { status: permit.status }, { status: 'suspended', noteAr });
    get().notify(permit.requestedBy, 'تم إيقاف تصريح', `${permitKindAr[permit.kind]} — ${permit.subject.nameAr} · ${noteAr}`, '/permits', 'warn');
    get().pushToast('تم إيقاف التصريح', noteAr, 'warn');
  },

  liftPermitSuspension: (id: string) => {
    const s = get();
    const permit = s.permits.find((p) => p.id === id);
    if (!permit) return;
    assertTransition('permit', permitTransitions, permit.status, 'approved');
    set((st) => ({ permits: updateById(st.permits, id, { status: 'approved' }) }));
    get().appendAudit('permit', id, 'update', { status: 'suspended' }, { status: 'approved' });
    get().notify(permit.requestedBy, 'تم رفع إيقاف التصريح', `${permitKindAr[permit.kind]} — ${permit.subject.nameAr}`, '/permits');
    get().pushToast('تم رفع الإيقاف', undefined, 'ok');
  },
});
