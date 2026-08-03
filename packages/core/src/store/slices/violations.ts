import { nanoid } from 'nanoid';
import type { Violation } from '../../types';
import type { Get, Set, Store } from '../storeTypes';
import { currentActor, updateById } from '../storeTypes';
import { assertTransition, violationTransitions, isSuspensionExpired, withinRepeatWindow } from '../../lib/rules';
import { daysFromNow, nowISO } from '../../lib/time';

const ev = (s: Store, action: string, detailAr?: string) => ({
  atISO: nowISO(),
  actorId: currentActor(s),
  actorRole: s.persona,
  action,
  detailAr,
});

export const createViolationsSlice = (set: Set, get: Get) => ({
  logViolation: (input: Parameters<Store['logViolation']>[0]) => {
    const s = get();
    // BR-115 · GAP-11 — التكرار خلال 12 شهرًا لا مدى الحياة
    const priors = s.violations.filter(
      (v) =>
        v.subject === input.subject &&
        v.subjectId === input.subjectId &&
        v.status !== 'cancelled' && // BR-124 — الملغاة بتظلّم لا تُحتسب
        withinRepeatWindow(v.events[0]?.atISO ?? nowISO()),
    );
    const violation: Violation = {
      id: nanoid(8),
      subject: input.subject,
      subjectId: input.subjectId,
      code: input.code,
      labelAr: input.labelAr,
      status: 'open',
      loggedBy: currentActor(s),
      lat: input.lat,
      lng: input.lng,
      media: input.withPhoto ? ['photo'] : [],
      repeatCount: priors.length + 1,
      escalationStep: 0,
      events: [ev(s, 'تسجيل المخالفة', input.labelAr)],
    };
    set((st) => ({ violations: [violation, ...st.violations] }));
    get().appendAudit('violation', violation.id, 'create', undefined, {
      code: violation.code,
      subject: violation.subject,
      repeatCount: violation.repeatCount,
    });
    const subjectLabel = describeSubject(get(), violation);
    get().notify(
      'admin',
      violation.repeatCount > 1 ? `مخالفة متكررة (${violation.repeatCount})` : 'مخالفة جديدة',
      `${violation.code} · ${violation.labelAr} — ${subjectLabel}`,
      '/a/violations',
      violation.repeatCount > 1 ? 'warn' : 'info',
    );
    get().pushToast('تم تسجيل المخالفة', `تكرار: ${violation.repeatCount} — أُشعرت الإدارة`, 'ok');
    return violation;
  },

  notifyViolation: (id: string) => {
    transition(set, get, id, 'notified', 'إشعار المخالف');
  },

  setViolationGrace: (id: string, days: number) => {
    const s = get();
    const v = s.violations.find((x) => x.id === id);
    if (!v) return;
    assertTransition('violation', violationTransitions, v.status, 'grace');
    set((st) => ({
      violations: updateById(st.violations, id, (x) => ({
        status: 'grace' as const,
        graceUntilISO: daysFromNow(days),
        events: [...x.events, ev(st, 'تحديد مهلة تصحيح', `${days} أيام`)],
      })),
    }));
    get().appendAudit('violation', id, 'update', { status: v.status }, { status: 'grace', days });
    notifySubject(get(), v, 'مهلة تصحيح مخالفة', `${v.labelAr} — المهلة ${days} أيام`);
    get().pushToast('تم تحديد مهلة التصحيح', `${days} أيام`, 'ok');
  },

  escalateViolation: (id: string) => {
    const s = get();
    const v = s.violations.find((x) => x.id === id);
    if (!v) return;
    assertTransition('violation', violationTransitions, v.status, 'escalated');
    const nextStep = Math.min(5, v.escalationStep + 1) as Violation['escalationStep'];
    const stepLabel = s.settings.ladder[nextStep]?.labelAr ?? '';
    set((st) => ({
      violations: updateById(st.violations, id, (x) => ({
        status: 'escalated' as const,
        escalationStep: nextStep,
        events: [...x.events, ev(st, `تصعيد — الدرجة ${nextStep}: ${stepLabel}`)],
      })),
    }));
    get().appendAudit('violation', id, 'update', { step: v.escalationStep, status: v.status }, { step: nextStep, status: 'escalated' });
    notifySubject(get(), v, 'تصعيد مخالفة', `${v.labelAr} — ${stepLabel}`);
    get().pushToast(`تم التصعيد إلى: ${stepLabel}`, undefined, 'warn');
  },

  remediateViolation: (id: string) => {
    transition(set, get, id, 'remediated', 'تأكيد التصحيح');
  },

  closeViolation: (id: string) => {
    transition(set, get, id, 'closed', 'إغلاق المخالفة');
  },

  /** The ladder writes the suspension; the gate only ever reads accessState. */
  suspendVehicleFromViolation: (violationId: string, days: number, reason: string) => {
    const s = get();
    const v = s.violations.find((x) => x.id === violationId);
    if (!v || v.subject !== 'vehicle') return;
    const vehicle = s.vehicles.find((x) => x.id === v.subjectId);
    if (!vehicle) return;
    // BR-002 · DEF-006 — كان يُنسب القرار لأول مشرف في المصفوفة لا للفاعل الحقيقي،
    // فتعرض شاشة البوابة اسم مشرف لم يقرّر شيئًا.
    const decider = currentActor(s);
    const suspension = {
      reason,
      fromISO: nowISO(),
      untilISO: daysFromNow(days),
      decidedBy: decider,
      sourceViolationId: violationId,
    };
    // BR-119 · DEF-013 — الدرجة من الإعدادات لا 5 ثابتة
    const step = Math.min(5, Math.max(0, s.settings.suspendAtStep)) as Violation['escalationStep'];
    const prevState = vehicle.accessState; // DEF-015 — القيمة الحقيقية قبل التغيير
    set((st) => ({
      vehicles: updateById(st.vehicles, vehicle.id, { accessState: 'suspended' as const, suspension }),
      violations: updateById(st.violations, violationId, (x) => ({
        escalationStep: step,
        events: [...x.events, ev(st, 'إيقاف المركبة وربطه بالبوابات', `${days} يومًا — ${reason}`)],
      })),
    }));
    get().appendAudit('vehicle', vehicle.id, 'update', { accessState: prevState }, { accessState: 'suspended', reason, days, sourceViolationId: violationId, decidedBy: decider });
    // owner + host file notification
    // BR-175 · DEF-004 — يصل لمالك المركبة نفسه، لا لشخصية «المقيم» عمومًا
    get().notify(vehicle.ownerPersonId, 'تم إيقاف مركبتك', `${reason} — مدة الإيقاف ${days} يومًا`, '/account', 'critical');
    get().notify('security', 'إنفاذ بوابي مفعّل', `اللوحة ${vehicle.plate} سترفض عند جميع البوابات`, '/gate/gate-1', 'warn');
    get().pushToast('تم إيقاف المركبة', 'الإنفاذ البوابي مفعّل — البوابة سترفض اللوحة تلقائيًا', 'bad');
  },

  /** BR-122 · DEF-014 — كان الرفع يترك المخالفة مصعّدة بلا حدث ولا إشعار للأمن */
  liftVehicleSuspension: (vehicleId: string, auto = false) => {
    const s = get();
    const vehicle = s.vehicles.find((x) => x.id === vehicleId);
    if (!vehicle?.suspension) return;
    const srcId = vehicle.suspension.sourceViolationId;
    set((st) => ({
      vehicles: updateById(st.vehicles, vehicleId, {
        accessState: 'allowed' as const,
        suspension: { ...vehicle.suspension!, liftedAtISO: nowISO() },
      }),
      violations: srcId
        ? updateById(st.violations, srcId, (x) => ({
            events: [
              ...x.events,
              ev(st, auto ? 'انتهاء مدة الإيقاف تلقائيًا' : 'رفع الإيقاف', `اللوحة ${vehicle.plate}`),
            ],
          }))
        : st.violations,
    }));
    get().appendAudit('vehicle', vehicleId, 'update', { accessState: 'suspended' }, { accessState: 'allowed', lifted: true, auto });
    get().notify(vehicle.ownerPersonId, auto ? 'انتهى إيقاف مركبتك' : 'تم رفع إيقاف المركبة', `اللوحة ${vehicle.plate} — الدخول مسموح`, '/account');
    get().notify('security', 'رُفع الإنفاذ البوابي', `اللوحة ${vehicle.plate} — لم تعد مرفوضة`, '/gate/gate-1');
    if (!auto) get().pushToast('تم رفع الإيقاف', undefined, 'ok');
  },

  /**
   * BR-121 · DEF-001 · ADR-010 — انتهاء الإيقاف تلقائيًا.
   * كان untilISO يُكتب ويُعرض ولا يُفحص: إيقاف 14 يومًا = إيقاف أبدي.
   * تُستدعى من نبضة المستشعرات؛ و evaluateGate يفحص عند القراءة أيضًا،
   * فالصحة مضمونة حتى لو كان التطبيق مغلقًا لحظة الانتهاء.
   */
  reconcileSuspensions: () => {
    const s = get();
    const due = s.vehicles.filter((v) => isSuspensionExpired(v) && !v.suspension?.liftedAtISO);
    due.forEach((v) => get().liftVehicleSuspension(v.id, true));
    return due.length;
  },

  /* ─── EP-20 · التظلّمات — لا نظام عقوبات بلا مسار اعتراض ─── */

  submitAppeal: (violationId: string, reasonAr: string) => {
    const s = get();
    const v = s.violations.find((x) => x.id === violationId);
    if (!v) return;
    assertTransition('violation', violationTransitions, v.status, 'appealed');
    set((st) => ({
      violations: updateById(st.violations, violationId, (x) => ({
        status: 'appealed' as const,
        appeal: { reasonAr, submittedBy: currentActor(st), submittedISO: nowISO() },
        events: [...x.events, ev(st, 'تقديم تظلّم', reasonAr)],
      })),
    }));
    get().appendAudit('violation', violationId, 'update', { status: v.status }, { status: 'appealed', reasonAr });
    get().notify('admin', 'تظلّم على مخالفة', `${v.code} — ${reasonAr.slice(0, 60)}`, '/appeals', 'warn');
    get().pushToast('سُجّل التظلّم', 'عدّاد المهلة متوقف حتى البت فيه', 'ok');
  },

  decideAppeal: (violationId: string, decision: 'accepted' | 'rejected', noteAr: string) => {
    const s = get();
    const v = s.violations.find((x) => x.id === violationId);
    if (!v?.appeal) return;
    const to: Violation['status'] = decision === 'accepted' ? 'cancelled' : 'escalated';
    assertTransition('violation', violationTransitions, v.status, to);
    set((st) => ({
      violations: updateById(st.violations, violationId, (x) => ({
        status: to,
        appeal: { ...x.appeal!, decision, decisionNoteAr: noteAr, decidedBy: currentActor(st), decidedISO: nowISO() },
        events: [...x.events, ev(st, decision === 'accepted' ? 'قُبل التظلّم وأُلغيت المخالفة' : 'رُفض التظلّم', noteAr)],
      })),
    }));
    get().appendAudit('violation', violationId, decision === 'accepted' ? 'approve' : 'reject', { status: v.status }, { status: to, noteAr });
    // BR-124 — القبول يرفع كل الآثار بما فيها الإيقاف
    if (decision === 'accepted' && v.subject === 'vehicle') {
      const veh = s.vehicles.find((x) => x.id === v.subjectId);
      if (veh?.accessState === 'suspended') get().liftVehicleSuspension(veh.id);
    }
    get().notify(v.loggedBy, decision === 'accepted' ? 'قُبل تظلّمك' : 'رُفض تظلّمك', noteAr, '/violations');
    get().pushToast(decision === 'accepted' ? 'قُبل التظلّم' : 'رُفض التظلّم', noteAr, decision === 'accepted' ? 'ok' : 'warn');
  },
});

function transition(set: Set, get: Get, id: string, to: Violation['status'], actionAr: string) {
  const s = get();
  const v = s.violations.find((x) => x.id === id);
  if (!v) return;
  assertTransition('violation', violationTransitions, v.status, to);
  set((st) => ({
    violations: updateById(st.violations, id, (x) => ({ status: to, events: [...x.events, ev(st, actionAr)] })),
  }));
  get().appendAudit('violation', id, 'update', { status: v.status }, { status: to });
  if (to === 'notified') notifySubject(get(), v, 'إشعار مخالفة', v.labelAr);
  get().pushToast(actionAr, undefined, 'ok');
}

function describeSubject(s: Store, v: Violation): string {
  if (v.subject === 'vehicle') {
    const veh = s.vehicles.find((x) => x.id === v.subjectId);
    return veh ? `مركبة ${veh.plate}` : 'مركبة';
  }
  if (v.subject === 'property') {
    const p = s.properties.find((x) => x.id === v.subjectId);
    return p ? `عقار ${p.code}` : 'عقار';
  }
  const person = s.people.find((x) => x.id === v.subjectId);
  return person?.nameAr ?? 'شخص';
}

function notifySubject(s: Store, v: Violation, titleAr: string, bodyAr: string) {
  s.notify('resident', titleAr, `${bodyAr} — ${describeSubject(s, v)}`, '/r', 'warn');
}
