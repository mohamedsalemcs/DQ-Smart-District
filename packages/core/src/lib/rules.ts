import type {
  Booking,
  EmbassyAppointment,
  ID,
  IncidentStatus,
  Permit,
  PermitStatus,
  Property,
  RequestStatus,
  Vehicle,
  ViolationStatus,
  VisitorPass,
} from '../types';
import { withinWindow } from './time';

/* ————— آلات الحالة. الانتقال غير المسموح يرمي. ————— */

type TransitionMap<S extends string> = Record<S, S[]>;

export const permitTransitions: TransitionMap<PermitStatus> = {
  draft: ['pending'],
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['suspended', 'expired', 'cancelled'],
  suspended: ['approved'],
  rejected: [],
  expired: [],
  cancelled: [],
};

/** SM-02 — آلة جديدة كليًا. البلاغات كانت الكيان الوحيد بلا حماية (DEF-010). */
export const requestTransitions: TransitionMap<RequestStatus> = {
  new: ['triaged', 'assigned', 'rejected'],
  /* triaged كانت حالة يتيمة بلا مخرج فتعلق البلاغات فيها للأبد (DEF-009) */
  triaged: ['assigned', 'rejected'],
  assigned: ['in_progress', 'assigned'],
  in_progress: ['awaiting_verification'],
  awaiting_verification: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'triaged', 'rejected'],
  rejected: ['reopened'],
};

export const violationTransitions: TransitionMap<ViolationStatus> = {
  open: ['notified'],
  notified: ['grace', 'escalated', 'appealed'],
  grace: ['remediated', 'escalated', 'appealed'],
  escalated: ['grace', 'remediated', 'escalated', 'appealed'],
  appealed: ['cancelled', 'escalated', 'grace'],
  remediated: ['closed'],
  closed: [],
  cancelled: [],
};

export const incidentTransitions: TransitionMap<IncidentStatus> = {
  open: ['dispatched', 'closed_no_action'],
  dispatched: ['on_scene'],
  on_scene: ['pending_mahdar', 'closed_no_action'],
  pending_mahdar: ['pending_approval'],
  pending_approval: ['closed'],
  closed: [],
  closed_no_action: [],
};

export class IllegalTransition extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`انتقال غير مسموح (${entity}): ${from} ← ${to}`);
    this.name = 'IllegalTransition';
  }
}

export function assertTransition<S extends string>(
  entity: string,
  map: TransitionMap<S>,
  from: S,
  to: S,
) {
  if (from === to) return;
  if (!map[from]?.includes(to)) throw new IllegalTransition(entity, from, to);
}

/* ═══════════════════════════════════════════════════════════════════════
   انتهاء الإيقاف — DEF-001 · BR-121 · ADR-010
   ───────────────────────────────────────────────────────────────────────
   كان `untilISO` يُكتب ويُعرض في كل شاشة («الإيقاف حتى 17 أغسطس»)
   ولا يُفحص في أي موضع. إيقاف 14 يومًا كان إيقافًا أبديًا.

   الفحص هنا عند القراءة يضمن الصحة دائمًا — حتى لو كان التطبيق مغلقًا
   لحظة الانتهاء. النبضة الدورية تضيف التصحيح المرئي والإشعار فقط.
   ═══════════════════════════════════════════════════════════════════════ */

export function isSuspensionExpired(v: Vehicle, now = Date.now()): boolean {
  if (v.accessState !== 'suspended' || !v.suspension) return false;
  if (v.suspension.liftedAtISO) return true;
  return new Date(v.suspension.untilISO).getTime() <= now;
}

/** الحالة الفعّالة بعد احتساب انقضاء المدة. `blocked` لا تنتهي بالزمن (BR-104). */
export function effectiveAccessState(v: Vehicle, now = Date.now()): Vehicle['accessState'] {
  return isSuspensionExpired(v, now) ? 'allowed' : v.accessState;
}

/* ═══════════════════════════════════════════════════════════════════════
   قرار البوابة
   البوابة لا تعيد اشتقاق قاعدة التصعيد — تقرأ accessState فقط (ADR-003).
   ═══════════════════════════════════════════════════════════════════════ */

export interface GateDecision {
  decision: 'allowed' | 'denied' | 'escalated';
  reasonAr: string;
  headlineAr: string;
  permit?: Permit;
  vehicle?: Vehicle;
  property?: Property;
  booking?: Booking;
  appointment?: EmbassyAppointment;
  visitorPass?: VisitorPass;
  detailAr?: string;
}

const normalizePlate = (s: string) => s.replace(/[\s-]+/g, '').trim();

export interface GateDb {
  vehicles: Vehicle[];
  permits: Permit[];
  properties: Property[];
  bookings: Booking[];
  appointments: EmbassyAppointment[];
  visitorPasses: VisitorPass[];
  gates: { id: ID; nameAr: string }[];
}

export function evaluateGate(rawInput: string, db: GateDb, gateId?: ID): GateDecision {
  const input = rawInput.trim();
  const now = Date.now();
  if (!input)
    return { decision: 'escalated', headlineAr: 'إدخال فارغ', reasonAr: 'لم يتم إدخال رمز أو لوحة' };

  const gateNameOf = (id: ID) => db.gates.find((g) => g.id === id)?.nameAr ?? id;

  /** BR-033 · DEF-002 — «البوابات المسموحة» كانت تُخزَّن ولا تُقرأ إطلاقًا. */
  const permitCoversGate = (p: Permit) => !gateId || !p.gateIds?.length || p.gateIds.includes(gateId);
  const gateRefusal = (p: Permit): GateDecision => ({
    decision: 'denied',
    headlineAr: 'الدخول مرفوض',
    reasonAr: `التصريح لا يشمل هذه البوابة — المسموح: ${p.gateIds.map(gateNameOf).join('، ')}`,
    permit: p,
  });

  /* 1 — لوحة مركبة */
  const vehicle = db.vehicles.find((v) => normalizePlate(v.plate) === normalizePlate(input));
  if (vehicle) {
    const state = effectiveAccessState(vehicle, now);

    if (state === 'suspended' && vehicle.suspension) {
      return {
        decision: 'denied',
        headlineAr: 'الدخول مرفوض',
        reasonAr: vehicle.suspension.reason,
        vehicle,
      };
    }
    if (state === 'blocked') {
      return { decision: 'denied', headlineAr: 'الدخول مرفوض', reasonAr: 'مركبة محظورة من الدخول', vehicle };
    }

    /* مركبة مقيم مرتبطة بوحدة — رخصة مقصودة وموثّقة (BR-107 · ADR-006) */
    if (vehicle.propertyId) {
      const property = db.properties.find((p) => p.id === vehicle.propertyId);
      return {
        decision: 'allowed',
        headlineAr: 'مسموح بالدخول',
        reasonAr: 'مركبة مقيم مسجلة',
        vehicle,
        property,
      };
    }

    const matches = db.permits.filter(
      (p) =>
        p.status === 'approved' &&
        (p.vehicleId === vehicle.id ||
          (p.plate && normalizePlate(p.plate) === normalizePlate(vehicle.plate))) &&
        withinWindow(p.validFromISO, p.validToISO),
    );
    const permit = matches.find(permitCoversGate);
    if (permit) {
      const property = permit.hostPropertyId
        ? db.properties.find((p) => p.id === permit.hostPropertyId)
        : undefined;
      return {
        decision: 'allowed',
        headlineAr: 'مسموح بالدخول',
        reasonAr: 'تصريح فعال',
        permit,
        vehicle,
        property,
      };
    }
    if (matches.length) return { ...gateRefusal(matches[0]), vehicle };

    return {
      decision: 'escalated',
      headlineAr: 'يتطلب تحقق',
      reasonAr: 'لا يوجد تصريح فعال لهذه المركبة',
      vehicle,
    };
  }

  /* 2 — رمز تصريح */
  const permit = db.permits.find((p) => p.qrToken === input);
  if (permit) {
    if (permit.status === 'suspended')
      return { decision: 'denied', headlineAr: 'الدخول مرفوض', reasonAr: 'التصريح موقوف', permit };
    if (permit.status === 'cancelled')
      return { decision: 'denied', headlineAr: 'الدخول مرفوض', reasonAr: 'التصريح ملغى', permit };
    if (permit.status !== 'approved')
      return { decision: 'denied', headlineAr: 'الدخول مرفوض', reasonAr: 'التصريح غير معتمد', permit };
    if (!withinWindow(permit.validFromISO, permit.validToISO))
      return {
        decision: 'denied',
        headlineAr: 'الدخول مرفوض',
        reasonAr: 'التصريح خارج فترة الصلاحية',
        permit,
      };
    if (!permitCoversGate(permit)) return gateRefusal(permit);

    const property = permit.hostPropertyId
      ? db.properties.find((p) => p.id === permit.hostPropertyId)
      : undefined;
    return { decision: 'allowed', headlineAr: 'مسموح بالدخول', reasonAr: 'تصريح فعال', permit, property };
  }

  /* 3 — رمز عقار · BR-022 · DEF-005
     الرمز مطبوع على لوحة الوحدة ومرئي لأي مارّ. كان يُرجع `allowed`
     فيفتح البوابة لمن صوّره. هو معرّف تحقق لا إذن دخول. */
  const property = db.properties.find((p) => p.qrToken === input);
  if (property)
    return {
      decision: 'escalated',
      headlineAr: 'بطاقة تعريف عقار',
      reasonAr: 'رمز العقار للتحقق لا للدخول — تحقق من هوية الزائر أو اتصل بالمضيف',
      detailAr: `${property.code} — ${property.unitNo} · ${property.zone}`,
      property,
    };

  /* 4 — موعد سفارة */
  const appointment = db.appointments.find((a) => a.qrToken === input);
  if (appointment) {
    const embassy = db.properties.find((p) => p.id === appointment.embassyPropId);
    if (appointment.status === 'attended')
      return {
        decision: 'denied',
        headlineAr: 'الدخول مرفوض',
        reasonAr: 'رمز الموعد مستخدم مسبقًا',
        appointment,
        property: embassy,
      };
    if (appointment.status !== 'booked')
      return {
        decision: 'denied',
        headlineAr: 'الدخول مرفوض',
        reasonAr: 'الموعد غير صالح',
        appointment,
        property: embassy,
      };
    if (new Date(appointment.dateISO).toDateString() !== new Date(now).toDateString())
      return {
        decision: 'denied',
        headlineAr: 'الدخول مرفوض',
        reasonAr: `الموعد ليس اليوم — ${embassy?.unitNo ?? 'سفارة'}`,
        appointment,
        property: embassy,
      };
    return {
      decision: 'allowed',
      headlineAr: 'مسموح بالدخول',
      reasonAr: `موعد ${embassy?.unitNo ?? 'سفارة'} — ${appointment.purposeAr}`,
      detailAr: appointment.visitorNameAr,
      appointment,
      property: embassy,
    };
  }

  /* 5 — تصريح زائر مدفوع · إعادة الدخول مسموحة طوال يوم الزيارة (BR-140) */
  const visitorPass = db.visitorPasses.find((v) => v.qrToken === input);
  if (visitorPass) {
    const sameDay = new Date(visitorPass.dateISO).toDateString() === new Date(now).toDateString();
    if (visitorPass.status === 'expired' || !sameDay)
      return {
        decision: 'denied',
        headlineAr: 'الدخول مرفوض',
        reasonAr: 'تصريح الزائر غير صالح لهذا اليوم',
        visitorPass,
      };
    return {
      decision: 'allowed',
      headlineAr: 'مسموح بالدخول',
      reasonAr: 'زائر مدفوع — تصريح يومي',
      detailAr: visitorPass.visitorNameAr,
      visitorPass,
    };
  }

  /* 6 — رمز حجز مرفق · يُستهلك عند القبول (BR-108 · DEF-016) */
  const booking = db.bookings.find((b) => b.qrToken === input);
  if (booking) {
    if (booking.status !== 'confirmed')
      return {
        decision: 'denied',
        headlineAr: 'الدخول مرفوض',
        reasonAr: booking.status === 'cancelled' ? 'الحجز ملغى' : 'الحجز مستخدم مسبقًا',
        booking,
      };
    if (!withinWindow(booking.fromISO, booking.toISO))
      return { decision: 'denied', headlineAr: 'الدخول مرفوض', reasonAr: 'الحجز خارج وقته', booking };
    return { decision: 'allowed', headlineAr: 'مسموح بالدخول', reasonAr: 'حجز مرفق مؤكد', booking };
  }

  return {
    decision: 'escalated',
    headlineAr: 'يتطلب تحقق',
    reasonAr: 'لا توجد نتيجة مطابقة — تواصل مع المضيف أو المشرف',
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   قواعد أعمال مساندة
   ═══════════════════════════════════════════════════════════════════════ */

/** BR-130 · DEF-023 — لا حجزين متداخلين زمنيًا على نفس المرفق. */
export function findBookingConflict(
  bookings: Booking[],
  facilityId: ID,
  fromISO: string,
  toISO: string,
  ignoreId?: ID,
): Booking | undefined {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return bookings.find(
    (b) =>
      b.id !== ignoreId &&
      b.facilityId === facilityId &&
      b.status === 'confirmed' &&
      from < new Date(b.toISO).getTime() &&
      to > new Date(b.fromISO).getTime(),
  );
}

/** BR-136 · DEF-024 — الحد اليومي يشمل booked و attended؛ الحضور لا يحرّر مقعدًا. */
export function embassyDayCount(
  appointments: EmbassyAppointment[],
  embassyPropId: ID,
  dateISO: string,
): number {
  const day = new Date(dateISO).toDateString();
  return appointments.filter(
    (a) =>
      a.embassyPropId === embassyPropId &&
      (a.status === 'booked' || a.status === 'attended') &&
      new Date(a.dateISO).toDateString() === day,
  ).length;
}

/** BR-035 · DEF-008 — التصريح المنتهي زمنيًا لا يُعرض «معتمدًا». */
export function effectivePermitStatus(p: Permit, now = Date.now()): PermitStatus {
  if (p.status === 'approved' && new Date(p.validToISO).getTime() < now) return 'expired';
  return p.status;
}

/** BR-115 · GAP-11 — التكرار يُحتسب خلال نافذة 12 شهرًا، لا مدى الحياة. */
export const REPEAT_WINDOW_MONTHS = 12;
export function withinRepeatWindow(atISO: string, now = Date.now()): boolean {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - REPEAT_WINDOW_MONTHS);
  return new Date(atISO).getTime() >= cutoff.getTime();
}

/**
 * BR-084 · DEF-003 — شرط اعتماد المحضر.
 * كان `parties.length > 0 && every(signed)` فيصبح `false` أبدًا للبلاغ بلا أطراف
 * (تجمهر · جسم مشتبه · عطل جهاز · حريق) فلا يُعتمد المحضر ولا يُغلق البلاغ.
 * المصفوفة الفارغة تستوفي الشرط منطقيًا، والمشرف يعتمد بإقراره.
 */
export function mahdarReadyToApprove(parties: { signatureDataUrl?: string }[]): boolean {
  return parties.every((p) => !!p.signatureDataUrl);
}
