import type {
  Ad,
  Asset,
  AuditEntry,
  EmbassyAppointment,
  Booking,
  Checkpoint,
  CheckpointScan,
  DayMetric,
  EscalationSettings,
  EventMinistry,
  EventRequest,
  Gate,
  GateEvent,
  ID,
  Incident,
  IncidentKind,
  IncidentParty,
  LostFoundItem,
  Mahdar,
  Notification,
  Organization,
  Patrol,
  Permit,
  PermitKind,
  Person,
  PersonaKind,
  Property,
  Restaurant,
  RequestKind,
  ServiceRequest,
  Shift,
  ToastMsg,
  Vehicle,
  Violation,
  ViolationSubject,
  VisitorPass,
} from '../types';

export interface Store {
  /* state */
  people: Person[];
  properties: Property[];
  vehicles: Vehicle[];
  permits: Permit[];
  requests: ServiceRequest[];
  violations: Violation[];
  incidents: Incident[];
  mahadir: Mahdar[];
  gates: Gate[];
  gateEvents: GateEvent[];
  assets: Asset[];
  sensorValues: Record<string, { fill?: number; battery?: number; lampOk?: boolean; tankLevel?: number; moisture?: number }>;
  bookings: Booking[];
  eventRequests: EventRequest[];
  lostFoundItems: LostFoundItem[];
  shifts: Shift[];
  checkpoints: Checkpoint[];
  checkpointScans: CheckpointScan[];
  patrols: Patrol[];
  organizations: Organization[];
  ads: Ad[];
  appointments: EmbassyAppointment[];
  restaurants: Restaurant[];
  visitorPasses: VisitorPass[];
  embassyConfigs: Record<ID, { dailyLimit: number }>;
  notifications: Notification[];
  audit: AuditEntry[];
  metrics: DayMetric[];
  settings: EscalationSettings;
  nextTxn: number;
  currentUsers: Record<PersonaKind, ID>;
  demoVehicleId: ID;
  persona: PersonaKind;
  toasts: ToastMsg[];
  demoSpeed: 1 | 10;

  /* system */
  setPersona: (p: PersonaKind) => void;
  setDemoSpeed: (s: 1 | 10) => void;
  pushToast: (titleAr: string, bodyAr?: string, tone?: ToastMsg['tone']) => void;
  dismissToast: (id: ID) => void;

  /* audit */
  appendAudit: (
    entity: string,
    entityId: ID,
    action: AuditEntry['action'],
    before?: unknown,
    after?: unknown,
  ) => void;

  /* notifications */
  notify: (
    to: PersonaKind | ID,
    titleAr: string,
    bodyAr: string,
    deepLink: string,
    severity?: Notification['severity'],
  ) => void;
  markAllRead: (persona: PersonaKind) => void;
  markRead: (id: ID) => void;

  /* permits */
  cancelPermit: (id: ID) => void;
  expirePermits: () => number;
  createPermit: (input: {
    kind: PermitKind;
    subjectNameAr: string;
    subjectNationalId?: string;
    subjectPhone?: string;
    plate?: string;
    validFromISO: string;
    validToISO: string;
    companions: number;
    gateIds: ID[];
  }) => Permit;
  decidePermit: (id: ID, decision: 'approved' | 'rejected' | 'info_requested', noteAr?: string) => void;
  suspendPermit: (id: ID, noteAr: string) => void;
  liftPermitSuspension: (id: ID) => void;

  /* requests */
  createRequest: (input: {
    kind: RequestKind;
    descriptionAr: string;
    priority: ServiceRequest['priority'];
    lat: number;
    lng: number;
    media: boolean;
  }) => ServiceRequest;
  triageRequest: (id: ID, orgId: ID, dueISO: string, priority: ServiceRequest['priority']) => void;
  startRequestWork: (id: ID) => void;
  completeRequestWork: (id: ID) => void;
  approveRequestClosure: (id: ID) => void;
  rateRequest: (id: ID, rating: 1 | 2 | 3 | 4 | 5) => void;
  reopenRequest: (id: ID, noteAr: string) => void;
  rejectRequest: (id: ID, reasonAr: string) => void;
  sweepSlaBreaches: () => number;

  /* violations */
  logViolation: (input: {
    subject: ViolationSubject;
    subjectId: ID;
    code: string;
    labelAr: string;
    lat: number;
    lng: number;
    withPhoto: boolean;
  }) => Violation;
  notifyViolation: (id: ID) => void;
  setViolationGrace: (id: ID, days: number) => void;
  escalateViolation: (id: ID) => void;
  remediateViolation: (id: ID) => void;
  closeViolation: (id: ID) => void;
  suspendVehicleFromViolation: (violationId: ID, days: number, reason: string) => void;
  liftVehicleSuspension: (vehicleId: ID, auto?: boolean) => void;
  /** BR-121 · DEF-001 — يعيد المركبات التي انقضت مدة إيقافها إلى allowed */
  reconcileSuspensions: () => number;
  submitAppeal: (violationId: ID, reasonAr: string) => void;
  decideAppeal: (violationId: ID, decision: 'accepted' | 'rejected', noteAr: string) => void;

  /* incidents */
  createIncident: (input: {
    kind: IncidentKind;
    severity: Incident['severity'];
    occurredISO: string;
    lat: number;
    lng: number;
    gateId?: ID;
    propertyId?: ID;
    vehicle?: Incident['vehicle'];
    parties: IncidentParty[];
    detailAr?: string;
  }) => Incident;
  dispatchPatrol: (incidentId: ID, patrolId: ID) => void;
  confirmArrival: (incidentId: ID) => void;
  startMahdar: (incidentId: ID) => Mahdar;

  /* mahadir — every mutation refuses when locked */
  updateMahdar: (id: ID, patch: Partial<Pick<Mahdar, 'summaryAr' | 'resolutionAr'>>) => boolean;
  setMahdarWaiver: (id: ID, agreed: boolean, noteAr: string) => boolean;
  addSeizedItem: (id: ID, descriptionAr: string) => boolean;
  signMahdar: (id: ID, partyName: string, dataUrl: string) => boolean;
  approveMahdar: (id: ID) => Promise<boolean>;

  /* gates */
  recordGateScan: (
    gateId: ID,
    method: GateEvent['method'],
    input: string,
    opts?: { direction?: 'in' | 'out'; overrideReasonAr?: string },
  ) => GateEvent;

  /* sensors */
  tickSensors: () => void;

  /* bookings */
  createBooking: (facilityId: ID, fromISO: string, toISO: string, attendees: number) => Booking | null;
  cancelBooking: (id: ID) => void;

  /* event requests */
  createEventRequest: (input: {
    titleAr: string;
    requesterKind: EventRequest['requesterKind'];
    requesterNameAr: string;
    requesterPropertyId?: ID;
    facilityId: ID;
    fromISO: string;
    toISO: string;
    attendees: number;
    notesAr?: string;
    parties: EventRequest['parties'];
  }) => EventRequest | null;
  decideEventApproval: (id: ID, ministry: EventMinistry, decision: 'approved' | 'rejected', noteAr?: string) => void;
  decideEventRequest: (id: ID, decision: 'approved' | 'rejected') => void;

  /* lost & found */
  reportLostItem: (input: {
    category: LostFoundItem['category'];
    colorAr: string;
    descriptionAr: string;
    locationAr?: string;
    dateISO: string;
    reporterNameAr: string;
    reporterPhone: string;
  }) => LostFoundItem | null;
  reportFoundItem: (input: {
    category: LostFoundItem['category'];
    colorAr: string;
    descriptionAr: string;
    locationAr?: string;
    dateISO: string;
    reporterNameAr: string;
    reporterPhone: string;
  }) => LostFoundItem | null;
  resolveLostFoundMatch: (id: ID, decision: 'returned' | 'unmatch') => void;

  /* embassy entry management */
  setEmbassyLimit: (propId: ID, dailyLimit: number) => void;
  bookEmbassyAppointment: (input: {
    embassyPropId: ID;
    visitorNameAr: string;
    nationalId: string;
    phone: string;
    purposeAr: string;
    dateISO: string;
  }) => EmbassyAppointment | null;

  /* visitor portal */
  purchaseVisitorPass: (input: {
    visitorNameAr: string;
    phone: string;
    plate: string;
    dateISO: string;
    orders: { restaurantId: ID; itemAr: string; price: number; qty: number }[];
  }) => VisitorPass;

  /* security ops */
  checkInShift: (shiftId: ID) => void;
  checkOutShift: (shiftId: ID, handoverNoteAr: string) => void;
  scanCheckpoint: (checkpointId: ID) => void;
}

export type Set = {
  (partial: Partial<Store> | ((state: Store) => Partial<Store>)): void;
};
export type Get = () => Store;

export const currentActor = (s: Store) => s.currentUsers[s.persona];

export const updateById = <T extends { id: ID }>(arr: T[], id: ID, patch: Partial<NoInfer<T>> | ((t: NoInfer<T>) => Partial<NoInfer<T>>)): T[] =>
  arr.map((x) => (x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x));
