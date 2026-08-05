/* ═══════════════════════════════════════════════════════════════════════
   @dq/core — منطق الأعمال المشترك بين المنصات الثلاث
   قواعد نقية + مخزن واحد. لا واجهة هنا إطلاقًا.
   ═══════════════════════════════════════════════════════════════════════ */

export * from './types';
export { useStore } from './store';
export { currentActor, updateById, type Store } from './store/storeTypes';

export {
  /* آلات الحالة */
  assertTransition,
  IllegalTransition,
  incidentTransitions,
  permitTransitions,
  requestTransitions,
  violationTransitions,
  /* قرار البوابة */
  evaluateGate,
  type GateDb,
  type GateDecision,
  /* قواعد مساندة */
  effectiveAccessState,
  effectivePermitStatus,
  embassyDayCount,
  findBookingConflict,
  isSuspensionExpired,
  mahdarReadyToApprove,
  REPEAT_WINDOW_MONTHS,
  withinRepeatWindow,
} from './lib/rules';

export {
  ago,
  daysAgo,
  daysFromNow,
  elapsedSince,
  fmtDate,
  fmtDateTime,
  fmtTime,
  hoursAgo,
  hoursFromNow,
  isPast,
  minutesAgo,
  nowISO,
  secondsToClock,
  withinWindow,
} from './lib/time';

export { BOUNDS, VIEW, clampToDistrict, distance, districtPoint, project } from './lib/geo';
export { sha256Hex } from './lib/hash';
export { formatTxn } from './lib/txn';
export {
  APP_BASE,
  PERSONA_APP,
  resolveLink,
  type AppKey,
  type Resolved,
} from './lib/appBase';
export { int, mulberry32, pick } from './lib/rng';
export * from './i18n/strings';

/** BR-182 — مهلة الإنجاز تُشتق من جدول SLA في الإعدادات، لا من قائمة ثابتة */
export function slaHoursFor(
  rules: import('./types').SlaRule[],
  kind: import('./types').RequestKind,
  priority: import('./types').ServiceRequest['priority'],
): number {
  return rules.find((r) => r.kind === kind && r.priority === priority)?.hours ?? 24;
}
