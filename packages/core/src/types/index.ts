export type ID = string;
export type ISO = string; // ISO 8601, minute precision minimum

export type PersonaKind = 'resident' | 'admin' | 'security';

export interface Person {
  id: ID;
  nameAr: string;
  nameEn?: string;
  nationalId: string; // هوية / إقامة
  phone: string;
  role:
    | 'owner'
    | 'tenant'
    | 'resident'
    | 'company_rep'
    | 'embassy_rep'
    | 'guard'
    | 'supervisor'
    | 'admin_staff'
    | 'inspector'
    | 'driver';
  propertyId?: ID;
  employerId?: ID; // company / school / embassy
  photoUrl?: string;
}

export interface Property {
  id: ID;
  code: string; // printed on the plate
  unitNo: string;
  type: 'villa' | 'apartment' | 'commercial' | 'embassy' | 'facility';
  /** commercial usage label — مدرسة / عيادات / سوق … */
  subtypeAr?: string;
  zone: string;
  lat: number;
  lng: number;
  ownerId: ID;
  tenantId?: ID;
  residentIds: ID[];
  vehicleIds: ID[];
  qrToken: string; // what the guard scans
}

export interface Suspension {
  reason: string;
  fromISO: ISO;
  untilISO: ISO;
  decidedBy: ID; // supervisor
  sourceViolationId: ID;
  liftedAtISO?: ISO;
}

export interface Vehicle {
  id: ID;
  plate: string; // keep as-is; render inside <bdi>
  make: string;
  color: string;
  ownerPersonId: ID;
  propertyId?: ID;
  accessState: 'allowed' | 'suspended' | 'blocked';
  suspension?: Suspension;
}

export type PermitKind =
  | 'visitor'
  | 'domestic_worker'
  | 'service_provider'
  | 'school_driver'
  | 'event'
  | 'event_vendor';

export type PermitStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expired'
  | 'cancelled';

export interface Approval {
  by: ID;
  role: string;
  decision: 'approved' | 'rejected' | 'info_requested';
  noteAr?: string;
  atISO: ISO;
}

export interface Permit {
  id: ID;
  kind: PermitKind;
  status: PermitStatus;
  requestedBy: ID;
  hostPropertyId?: ID;
  subject: { nameAr: string; nationalId?: string; phone?: string };
  vehicleId?: ID;
  plate?: string;
  gateIds: ID[];
  validFromISO: ISO;
  validToISO: ISO;
  companions: number;
  qrToken: string;
  approvals: Approval[];
  createdISO: ISO;
}

export type RequestKind =
  | 'maintenance'
  | 'cleanliness'
  | 'water_leak'
  | 'lighting'
  | 'pavement'
  | 'tree'
  | 'waste'
  | 'abandoned_vehicle'
  | 'visual_disorder'
  | 'noise'
  | 'traffic'
  | 'safety';

export type RequestStatus =
  | 'new'
  | 'triaged'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_verification'
  | 'closed'
  | 'reopened'
  | 'rejected'; // BR-058 — مكرر / خارج النطاق / كيدي

export interface TimelineEvent {
  atISO: ISO;
  actorId: ID;
  actorRole: string;
  action: string;
  detailAr?: string;
}

export interface ServiceRequest {
  id: ID;
  kind: RequestKind;
  status: RequestStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  raisedBy: ID;
  propertyId?: ID;
  lat: number;
  lng: number;
  descriptionAr: string;
  mediaBefore: string[];
  mediaAfter: string[];
  assignedToOrgId?: ID;
  dueISO?: ISO;
  slaBreached: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  /** BR-058 — يظهر للمبلّغ */
  rejectionReasonAr?: string;
  events: TimelineEvent[];
}

export type ViolationSubject = 'property' | 'vehicle' | 'person';

export type ViolationStatus =
  | 'open'
  | 'notified'
  | 'grace'
  | 'escalated'
  | 'appealed'   // EP-20 — تظلّم يوقف عدّاد المهلة
  | 'remediated'
  | 'closed'
  | 'cancelled'; // قُبل التظلّم — تُرفع كل الآثار

export interface Violation {
  id: ID;
  subject: ViolationSubject;
  subjectId: ID;
  code: string; // e.g. VD-03 visual disorder
  labelAr: string;
  status: ViolationStatus;
  loggedBy: ID;
  lat: number;
  lng: number;
  media: string[];
  graceUntilISO?: ISO;
  repeatCount: number; // drives the suspension ladder
  escalationStep: 0 | 1 | 2 | 3 | 4 | 5; // إشعار→إنذار→تصريح→مركبة→منع→ربط بوابي
  /** EP-20 — التظلّم يوقف عدّاد المهلة حتى البت */
  appeal?: {
    reasonAr: string;
    submittedBy: ID;
    submittedISO: ISO;
    decision?: 'accepted' | 'rejected';
    decisionNoteAr?: string;
    decidedBy?: ID;
    decidedISO?: ISO;
  };
  events: TimelineEvent[];
}

export type IncidentKind =
  | 'suspicious_person'
  | 'suspicious_vehicle'
  | 'gathering'
  | 'nuisance'
  | 'traffic_accident'
  | 'altercation'
  | 'access_violation'
  | 'suspicious_object'
  | 'lost_property'
  | 'medical'
  | 'fire'
  | 'device_fault';

export type IncidentStatus =
  | 'open'
  | 'dispatched'
  | 'on_scene'
  | 'pending_mahdar'
  | 'pending_approval'
  | 'closed'
  | 'closed_no_action'; // BR-072 — إنذار كاذب / لا واقعة، بقرار مشرف

export interface IncidentParty {
  personId?: ID;
  nameAr: string;
  nationalId?: string;
  role: 'reporter' | 'subject' | 'witness';
  signatureDataUrl?: string;
  signedISO?: ISO;
}

export interface Incident {
  id: ID;
  txnNo: string; // DQ-2026-000431 — issued at creation
  kind: IncidentKind;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurredISO: ISO; // when it happened
  reportedISO: ISO; // when it was logged — keep separate
  reportedBy: ID;
  lat: number;
  lng: number;
  propertyId?: ID;
  gateId?: ID;
  vehicle?: { plate: string; make: string; color: string; driverNameAr?: string };
  parties: IncidentParty[];
  dispatch?: {
    patrolId: ID;
    dispatchedISO: ISO;
    arrivedISO?: ISO;
    responseSeconds?: number;
  };
  status: IncidentStatus;
  mahdarId?: ID;
  events: TimelineEvent[];
}

export interface CustodyStep {
  byPersonId: ID;
  action: 'seized' | 'labelled' | 'stored' | 'verified' | 'released';
  atISO: ISO;
  locationAr: string;
}

export interface SeizedItem {
  id: ID;
  descriptionAr: string;
  photo?: string;
  custody: CustodyStep[];
}

export interface Mahdar {
  id: ID;
  incidentId: ID;
  txnNo: string;
  summaryAr: string;
  resolutionAr: string;
  waiver?: { agreed: boolean; noteAr: string };
  seized: SeizedItem[];
  signatures: { partyId: ID; dataUrl: string; atISO: ISO }[];
  approvedBy?: ID;
  approvedISO?: ISO;
  locked: boolean; // once true: reject all mutations
  hashChain: string[]; // demo: sha-256 of prior entry + payload
}

export interface Gate {
  id: ID;
  nameAr: string;
  lat: number;
  lng: number;
  state: 'open' | 'closed' | 'manual';
}

export interface GateEvent {
  id: ID;
  gateId: ID;
  atISO: ISO;
  method: 'qr' | 'plate' | 'manual';
  input: string;
  decision: 'allowed' | 'denied' | 'escalated';
  reasonAr?: string;
  permitId?: ID;
  vehicleId?: ID;
  byGuardId: ID;
  /** BR-109 — كل مسح له اتجاه؛ يُمكّن تقارير الإشغال */
  direction: 'in' | 'out';
  /** BR-106 — تجاوز يدوي بقرار مشرف، بسبب موثّق */
  overrideReasonAr?: string;
}

export type AssetKind =
  | 'bin'
  | 'irrigation_tank'
  | 'light_pole'
  | 'pump'
  | 'restroom'
  | 'court'
  | 'garden'
  | 'tree';

export interface Asset {
  id: ID;
  kind: AssetKind;
  nameAr: string;
  lat: number;
  lng: number;
  qrToken: string;
}

export interface SensorReading {
  assetId: ID;
  metric: 'fill' | 'soil_moisture' | 'tank_level' | 'leak' | 'lamp_state' | 'battery';
  value: number;
  atISO: ISO;
}

export interface Booking {
  id: ID;
  facilityId: ID;
  byPersonId: ID;
  fromISO: ISO;
  toISO: ISO;
  status: 'confirmed' | 'cancelled' | 'used';
  qrToken: string;
  attendees: number;
}

/** جهة طالبة للفعالية */
export type EventRequesterKind = 'embassy' | 'resident' | 'commercial' | 'school' | 'government';

/** جهة خارجية تُنسَّق معها الفعالية */
export type EventPartyKind = 'district_security' | 'police' | 'traffic_police' | 'civil_defense' | 'red_crescent' | 'municipality';

/** وزارة يمر عبرها اعتماد الفعالية */
export type EventMinistry = 'interior' | 'foreign_affairs';

/** اعتماد وزاري على طلب فعالية — يُنشأ معلقًا عند تسجيل الطلب */
export interface EventApproval {
  ministry: EventMinistry;
  status: 'pending' | 'approved' | 'rejected';
  decidedISO?: ISO;
  noteAr?: string;
}

/** طلب إقامة فعالية — يُنشئه المشغّل ويحدد الجهات الخارجية المطلوب تنسيقها */
export interface EventRequest {
  id: ID;
  titleAr: string;
  requesterKind: EventRequesterKind;
  requesterNameAr: string;
  /** العقار المرتبط عندما تكون الجهة سفارة أو منشأة */
  requesterPropertyId?: ID;
  facilityId: ID;
  fromISO: ISO;
  toISO: ISO;
  attendees: number;
  notesAr?: string;
  /** الجهات المحددة عند الإنشاء — يُرسل إشعار لكل جهة فور الحفظ */
  parties: EventPartyKind[];
  partiesSentISO?: ISO;
  /** اعتمادات وزارية معلقة: الداخلية عند طلب جهات أمنية، والخارجية لفعاليات السفارات */
  approvals: EventApproval[];
  status: 'pending' | 'approved' | 'rejected';
  createdISO: ISO;
}

export interface Shift {
  id: ID;
  guardId: ID;
  postId: ID;
  startISO: ISO;
  endISO: ISO;
  checkedInISO?: ISO;
  checkedOutISO?: ISO;
  handoverNoteAr?: string;
}

export interface Checkpoint {
  id: ID;
  nameAr: string;
  lat: number;
  lng: number;
  qrToken: string;
}

export interface CheckpointScan {
  checkpointId: ID;
  guardId: ID;
  atISO: ISO;
  noteAr?: string;
  photo?: string;
}

export interface AuditEntry {
  id: ID;
  atISO: ISO;
  actorId: ID;
  entity: string;
  entityId: ID;
  action: 'create' | 'update' | 'approve' | 'lock' | 'reject';
  before?: unknown;
  after?: unknown;
}

export interface Notification {
  id: ID;
  toPersonaOrPerson: PersonaKind | ID;
  titleAr: string;
  bodyAr: string;
  atISO: ISO;
  read: boolean;
  deepLink: string;
  severity?: 'info' | 'warn' | 'critical';
}

/* ——— PoC-only types (not in the domain spec) ——— */

/** embassy visit appointment booked through the embassy's public link;
 *  the QR token is accepted directly at the gate */
export interface EmbassyAppointment {
  id: ID;
  embassyPropId: ID;
  visitorNameAr: string;
  nationalId: string;
  phone: string;
  purposeAr: string;
  dateISO: ISO; // slot start
  qrToken: string;
  status: 'booked' | 'attended' | 'expired' | 'cancelled';
  createdISO: ISO;
}

/** district restaurant available to visitors through the visitor portal */
export interface Restaurant {
  id: ID;
  nameAr: string;
  categoryAr: string;
  items: { nameAr: string; price: number }[];
}

/** paid visitor day-pass: 50 SAR per vehicle + optional restaurant pre-orders.
 *  One QR token — opens the gate on the visit day and redeems the orders. */
export interface VisitorPass {
  id: ID;
  visitorNameAr: string;
  phone: string;
  plate: string;
  dateISO: ISO; // visit day
  entryFee: number; // 50 SAR
  orders: { restaurantId: ID; itemAr: string; price: number; qty: number }[];
  totalPaid: number;
  qrToken: string;
  status: 'paid' | 'used' | 'expired';
  createdISO: ISO;
}

/** paid ad placed by a commercial unit, shown on the resident Community page */
export interface Ad {
  id: ID;
  advertiserPropId: ID; // commercial property
  titleAr: string;
  bodyAr: string;
  ctaAr: string;
  package: 'standard' | 'featured';
  monthlyPrice: number; // SAR — pricing exclusion lifted by designer for the revenue module
  status: 'active' | 'pending' | 'ended';
  startISO: ISO;
  endISO: ISO;
}

/** One day of district activity — powers the dashboards' trends and deltas. */
export interface DayMetric {
  dateISO: ISO;
  requestsOpened: number;
  requestsClosed: number;
  incidents: number;
  violations: number;
  gateAllowed: number;
  gateDenied: number;
  avgResponseSec: number;
  satisfaction: number; // 0..5
}

export interface Patrol {
  id: ID;
  nameAr: string;
  guardId: ID;
  lat: number;
  lng: number;
  status: 'available' | 'dispatched' | 'on_scene';
  /** wander waypoint while available — the ticker moves the patrol toward it */
  wpLat?: number;
  wpLng?: number;
  /** road-graph position (set once the road network is loaded) */
  nodeIdx?: number;
  prevIdx?: number;
}

export interface LadderStep {
  step: 0 | 1 | 2 | 3 | 4 | 5;
  labelAr: string;
  descriptionAr: string;
}

/** BR-182 · DEF-027 — جدول SLA يقود مهل الإنجاز فعلًا، لا جدول معروض */
export interface SlaRule {
  kind: RequestKind;
  priority: ServiceRequest['priority'];
  hours: number;
}

export interface EscalationSettings {
  ladder: LadderStep[];
  slaRules: SlaRule[];
  graceDays: number; // default remediation window
  suspendAtStep: number; // reaching this step suspends the vehicle
  suspensionDays: number; // default suspension duration
}

export interface ToastMsg {
  id: ID;
  titleAr: string;
  bodyAr?: string;
  tone: 'ok' | 'warn' | 'bad' | 'info';
}

export interface Organization {
  id: ID;
  nameAr: string;
  kind: 'cleaning' | 'landscape' | 'maintenance' | 'security' | 'school' | 'embassy';
  kpiOnTime: number; // %
  kpiRating: number; // 0..5
}
