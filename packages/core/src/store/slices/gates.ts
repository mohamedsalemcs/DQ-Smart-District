import { nanoid } from 'nanoid';
import type { GateEvent } from '../../types';
import type { Get, Set } from '../storeTypes';
import { currentActor } from '../storeTypes';
import { evaluateGate } from '../../lib/rules';
import { nowISO } from '../../lib/time';

export const createGatesSlice = (set: Set, get: Get) => ({
  /** Every scan writes a GateEvent regardless of outcome — the log IS the record. */
  recordGateScan: (
    gateId: string,
    method: GateEvent['method'],
    input: string,
    opts?: { direction?: 'in' | 'out'; overrideReasonAr?: string },
  ) => {
    const s = get();
    // BR-033 · DEF-002 — البوابة تُمرَّر الآن، فتُحترم «البوابات المسموحة»
    const evaluated = evaluateGate(input, s, gateId);
    // BR-106 — التجاوز اليدوي قرار مشرف يقلب الرفض إلى سماح، بسبب موثّق
    const result = opts?.overrideReasonAr
      ? { ...evaluated, decision: 'allowed' as const, headlineAr: 'تجاوز يدوي — قرار مشرف' }
      : evaluated;
    const event: GateEvent = {
      id: nanoid(8),
      gateId,
      atISO: nowISO(),
      method,
      input,
      decision: result.decision,
      reasonAr: opts?.overrideReasonAr ?? result.reasonAr,
      permitId: result.permit?.id,
      vehicleId: result.vehicle?.id,
      byGuardId: currentActor(s),
      direction: opts?.direction ?? 'in',
      overrideReasonAr: opts?.overrideReasonAr,
    };
    set((st) => ({ gateEvents: [event, ...st.gateEvents] }));
    get().appendAudit('gateEvent', event.id, 'create', undefined, {
      gateId,
      input,
      decision: result.decision,
      reasonAr: result.reasonAr,
    });
    // visitor day-pass: first scan marks it used (re-entry stays valid the same day)
    if (result.decision === 'allowed' && result.visitorPass && result.visitorPass.status === 'paid') {
      set((st) => ({
        visitorPasses: st.visitorPasses.map((v) =>
          v.id === result.visitorPass!.id ? { ...v, status: 'used' as const } : v,
        ),
      }));
      get().appendAudit('visitorPass', result.visitorPass.id, 'update', { status: 'paid' }, { status: 'used' });
    }
    // an embassy appointment consumed at the gate is marked attended — single use
    if (result.decision === 'allowed' && result.appointment) {
      set((st) => ({
        appointments: st.appointments.map((a) =>
          a.id === result.appointment!.id ? { ...a, status: 'attended' as const } : a,
        ),
      }));
      get().appendAudit('appointment', result.appointment.id, 'update', { status: 'booked' }, { status: 'attended' });
    }
    // BR-108 · DEF-016 — رمز الحجز كان لا يُستهلك أبدًا رغم وجود الحالة
    if (result.decision === 'allowed' && result.booking && result.booking.status === 'confirmed') {
      set((st) => ({
        bookings: st.bookings.map((b) =>
          b.id === result.booking!.id ? { ...b, status: 'used' as const } : b,
        ),
      }));
      get().appendAudit('booking', result.booking.id, 'update', { status: 'confirmed' }, { status: 'used' });
    }
    // BR-106 — التجاوز اليدوي يُشعر الإدارة فورًا
    if (opts?.overrideReasonAr) {
      get().notify('admin', 'تجاوز يدوي عند البوابة',
        `${s.gates.find((g) => g.id === gateId)?.nameAr ?? ''} — ${opts.overrideReasonAr}`,
        '/gates', 'warn');
    }
    if (result.decision === 'denied') {
      // BR-110 · DEF-028 — يُشعَر مالك المركبة تحديدًا، لا كل سكان الحي
      const target = result.vehicle?.ownerPersonId ?? 'resident';
      get().notify(
        target,
        'محاولة دخول مرفوضة',
        `${result.vehicle ? `اللوحة ${result.vehicle.plate}` : input} — ${result.reasonAr}`,
        '/account',
        'warn',
      );
      get().notify('admin', 'رفض دخول عند البوابة', `${s.gates.find((g) => g.id === gateId)?.nameAr ?? ''} — ${result.reasonAr}`, '/a/violations', 'info');
    }
    return event;
  },
});
