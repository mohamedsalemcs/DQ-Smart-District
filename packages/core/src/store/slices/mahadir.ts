import { nanoid } from 'nanoid';
import type { Mahdar } from '../../types';
import type { Get, Set } from '../storeTypes';
import { currentActor, updateById } from '../storeTypes';
import { nowISO } from '../../lib/time';
import { sha256Hex } from '../../lib/hash';
import { assertTransition, incidentTransitions } from '../../lib/rules';

/**
 * Every mutation checks the lock FIRST. A locked maḥḍar rejects the write,
 * shows a visible error, and records the rejected attempt in the audit trail.
 * This refusal is a demo feature — try it on stage.
 */
function rejectIfLocked(get: Get, m: Mahdar | undefined, attemptedAction: string): boolean {
  if (!m) return true;
  if (!m.locked) return false;
  get().appendAudit('mahdar', m.id, 'reject', undefined, {
    attemptedAction,
    reason: 'المحضر مقفل — مرفوض',
  });
  get().pushToast('المحضر مقفل', 'المحضر معتمد ومقفل — أي تعديل مرفوض ويُسجّل في سجل التدقيق', 'bad');
  return true;
}

export const createMahadirSlice = (set: Set, get: Get) => ({
  updateMahdar: (id: string, patch: Partial<Pick<Mahdar, 'summaryAr' | 'resolutionAr'>>) => {
    const m = get().mahadir.find((x) => x.id === id);
    if (rejectIfLocked(get, m, 'تعديل نص المحضر')) return false;
    set((st) => ({ mahadir: updateById(st.mahadir, id, patch) }));
    get().appendAudit('mahdar', id, 'update', undefined, patch);
    return true;
  },

  setMahdarWaiver: (id: string, agreed: boolean, noteAr: string) => {
    const m = get().mahadir.find((x) => x.id === id);
    if (rejectIfLocked(get, m, 'تسجيل تنازل')) return false;
    set((st) => ({ mahadir: updateById(st.mahadir, id, { waiver: { agreed, noteAr } }) }));
    get().appendAudit('mahdar', id, 'update', undefined, { waiver: { agreed, noteAr } });
    if (agreed) get().pushToast('سُجّل التنازل', undefined, 'ok');
    return true;
  },

  addSeizedItem: (id: string, descriptionAr: string) => {
    const m = get().mahadir.find((x) => x.id === id);
    if (rejectIfLocked(get, m, 'إضافة مضبوطات')) return false;
    const s = get();
    const item = {
      id: nanoid(6),
      descriptionAr,
      custody: [
        { byPersonId: currentActor(s), action: 'seized' as const, atISO: nowISO(), locationAr: 'موقع الحادث' },
        { byPersonId: currentActor(s), action: 'labelled' as const, atISO: nowISO(), locationAr: 'موقع الحادث' },
      ],
    };
    set((st) => ({ mahadir: updateById(st.mahadir, id, (x) => ({ seized: [...x.seized, item] })) }));
    get().appendAudit('mahdar', id, 'update', undefined, { seizedAdd: descriptionAr });
    return true;
  },

  signMahdar: (id: string, partyName: string, dataUrl: string) => {
    const m = get().mahadir.find((x) => x.id === id);
    if (rejectIfLocked(get, m, 'توقيع')) return false;
    const atISO = nowISO();
    set((st) => ({
      mahadir: updateById(st.mahadir, id, (x) => ({
        signatures: [...x.signatures, { partyId: partyName, dataUrl, atISO }],
      })),
      incidents: st.incidents.map((i) =>
        i.mahdarId === id
          ? {
              ...i,
              parties: i.parties.map((p) =>
                p.nameAr === partyName ? { ...p, signatureDataUrl: dataUrl, signedISO: atISO } : p,
              ),
            }
          : i,
      ),
    }));
    get().appendAudit('mahdar', id, 'update', undefined, { signedBy: partyName });
    get().pushToast('تم التوقيع', partyName, 'ok');
    return true;
  },

  approveMahdar: async (id: string) => {
    const s = get();
    const m = s.mahadir.find((x) => x.id === id);
    if (!m || m.locked) return false;
    const incident = s.incidents.find((i) => i.mahdarId === id);
    const supervisor = currentActor(s);
    const approvedISO = nowISO();
    const prior = m.hashChain[m.hashChain.length - 1] ?? 'GENESIS';
    const payload = JSON.stringify({ id: m.id, txnNo: m.txnNo, summaryAr: m.summaryAr, resolutionAr: m.resolutionAr, waiver: m.waiver, signatures: m.signatures.map((x) => x.partyId), approvedISO });
    const hash = await sha256Hex(prior + payload);
    // BR-087 · DEF-019 — كان يقفز إلى closed متجاوزًا assertTransition،
    // فتصبح pending_approval حالة ميتة والآلة المعلنة ليست المنفَّذة.
    if (incident) {
      assertTransition('incident', incidentTransitions, incident.status, 'pending_approval');
      assertTransition('incident', incidentTransitions, 'pending_approval', 'closed');
    }
    set((st) => ({
      mahadir: updateById(st.mahadir, id, {
        approvedBy: supervisor,
        approvedISO,
        locked: true,
        hashChain: [...m.hashChain, hash],
      }),
      incidents: incident
        ? updateById(
            st.incidents,
            incident.id,
            (i) => ({
              status: 'closed' as const,
              events: [
                ...i.events,
                { atISO: approvedISO, actorId: supervisor, actorRole: 'supervisor', action: 'اعتماد المحضر وقفله', detailAr: `hash ${hash.slice(0, 12)}…` },
              ],
            }),
          )
        : st.incidents,
    }));
    // pending_mahdar → pending_approval → closed happens atomically at approve time in the PoC
    get().appendAudit('mahdar', id, 'approve', { locked: false }, { locked: true, hash });
    get().appendAudit('mahdar', id, 'lock', undefined, { hash });
    get().notify('admin', 'اعتُمد محضر وقُفل', `${m.txnNo} — السجل نهائي`, '/a', 'info');
    get().notify('security', 'اعتُمد المحضر', `${m.txnNo} — أي تعديل لاحق سيُرفض`, `/s/incidents/${incident?.id ?? ''}`, 'info');
    get().pushToast('اعتُمد المحضر وقُفل', 'أي تعديل لاحق سيُرفض ويُسجّل', 'ok');
    return true;
  },
});
