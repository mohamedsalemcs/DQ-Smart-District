import { nanoid } from 'nanoid';
import type {
  Ad,
  Asset,
  Booking,
  EmbassyAppointment,
  Checkpoint,
  CheckpointScan,
  DayMetric,
  EscalationSettings,
  EventRequest,
  Gate,
  LostFoundItem,
  GateEvent,
  Incident,
  Mahdar,
  Notification,
  Organization,
  Patrol,
  Permit,
  Person,
  Property,
  Restaurant,
  ServiceRequest,
  Shift,
  Vehicle,
  Violation,
  VisitorPass,
} from '../../types';
import { mulberry32, pick, int } from '../../lib/rng';
import { clampToDistrict, districtPoint } from '../../lib/geo';
import { daysAgo, daysFromNow, hoursAgo, hoursFromNow, minutesAgo } from '../../lib/time';
import { formatTxn } from '../../lib/txn';

const rng = mulberry32(20260802);

const maleNames = ['محمد', 'عبدالله', 'سعد', 'فهد', 'خالد', 'تركي', 'ناصر', 'بندر', 'سلطان', 'ماجد', 'وليد', 'يوسف', 'عمر', 'أحمد', 'إبراهيم', 'فيصل', 'نواف', 'مشعل', 'طلال', 'سامي'];
const femaleNames = ['نورة', 'سارة', 'ريم', 'لطيفة', 'هند', 'منيرة', 'العنود', 'جواهر', 'دانة', 'أمل'];
/* middle = father's name; family names deliberately NOT the ubiquitous tribal ones */
const middleNames = ['عبدالله', 'محمد', 'صالح', 'إبراهيم', 'سعود', 'ناصر', 'حمد', 'خالد', 'عبدالعزيز', 'سليمان', 'عثمان', 'يوسف'];
const familyNames = ['البسام', 'الزامل', 'الفوزان', 'الطريقي', 'السويلم', 'الحمدان', 'المهنا', 'الجريسي', 'العليان', 'القاضي', 'الذكير', 'النعيم', 'الخضير', 'المنيف'];
const carMakes = ['تويوتا كامري', 'لكزس ES', 'جي إم سي يوكن', 'هيونداي سوناتا', 'نيسان باترول', 'مرسيدس E200', 'تويوتا لاندكروزر', 'كيا سبورتاج', 'شفروليه تاهو', 'فورد إكسبلورر'];
const carColors = ['أبيض', 'أسود', 'رمادي', 'فضي', 'أزرق داكن', 'بيج'];
const plateLetters = ['أ', 'ب', 'ح', 'د', 'ر', 'س', 'ص', 'ط', 'ع', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و'];
const zones = ['حي السفارات', 'القطاع السكني الشرقي', 'القطاع السكني الغربي', 'قطاع الخدمات'];
const embassies = [
  'سفارة بنغلاديش',
  'سفارة الهند',
  'سفارة السودان',
  'سفارة باكستان',
  'سفارة مصر',
  'الهيئة السعودية للتخصصات الطبية',
  'السفارة اليمنية',
  'السفارة السورية',
];

export const GARDEN_NAMES = ['النفل', 'الصدر', 'السبع', 'المشتل', 'الخزامة', 'الطلح', 'الأثل', 'العراء', 'منتزه عشية', 'طويق'];

const arabicName = () => {
  const first = rng() < 0.75 ? pick(rng, maleNames) : pick(rng, femaleNames);
  let middle = pick(rng, middleNames);
  if (middle === first) middle = middleNames[(middleNames.indexOf(middle) + 1) % middleNames.length];
  return `${first} ${middle} ${pick(rng, familyNames)}`;
};

const plate = () =>
  `${pick(rng, plateLetters)} ${pick(rng, plateLetters)} ${pick(rng, plateLetters)} ${int(rng, 1000, 9999)}`;

const phone = () => `05${int(rng, 10000000, 99999999)}`;

const natId = () => `1${int(rng, 100000000, 999999999)}`;

const token = (prefix: string, n: number) => `${prefix}-${String(n).padStart(3, '0')}`;

export interface SeedData {
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
  embassyConfigs: Record<string, { dailyLimit: number }>;
  notifications: Notification[];
  metrics: DayMetric[];
  settings: EscalationSettings;
  nextTxn: number;
  currentUsers: { resident: string; admin: string; security: string };
  demoVehicleId: string; // the school-driver vehicle with a prior violation (Path A)
}

export function buildSeed(): SeedData {
  /* ——— organizations ——— */
  const orgs: Organization[] = [
    { id: 'org-clean', nameAr: 'شركة النقاء للنظافة', kind: 'cleaning', kpiOnTime: 92, kpiRating: 4.3 },
    { id: 'org-land', nameAr: 'مؤسسة الواحة للتشجير', kind: 'landscape', kpiOnTime: 88, kpiRating: 4.1 },
    { id: 'org-maint', nameAr: 'شركة الإتقان للصيانة', kind: 'maintenance', kpiOnTime: 95, kpiRating: 4.6 },
    { id: 'org-sec', nameAr: 'شركة الحماية الأمنية', kind: 'security', kpiOnTime: 97, kpiRating: 4.5 },
    { id: 'org-school', nameAr: 'مدارس الحي الدبلوماسي العالمية', kind: 'school', kpiOnTime: 90, kpiRating: 4.0 },
  ];

  /* ——— gates — DQ has exactly two, at their real coordinates ——— */
  const gates: Gate[] = [
    { id: 'gate-1', nameAr: 'البوابة الرئيسية', lat: 24.686979, lng: 46.631565, state: 'open' },
    { id: 'gate-2', nameAr: 'البوابة الجنوبية', lat: 24.670695, lng: 46.62237, state: 'open' },
  ];

  /* ——— people ——— */
  const people: Person[] = [];
  const guards: Person[] = [];
  const supervisors: Person[] = [];
  const adminStaff: Person[] = [];
  const drivers: Person[] = [];

  for (let i = 0; i < 12; i++) {
    const g: Person = { id: `guard-${i + 1}`, nameAr: arabicName(), nationalId: natId(), phone: phone(), role: 'guard', employerId: 'org-sec' };
    guards.push(g);
    people.push(g);
  }
  for (let i = 0; i < 3; i++) {
    const s: Person = { id: `sup-${i + 1}`, nameAr: arabicName(), nationalId: natId(), phone: phone(), role: 'supervisor', employerId: 'org-sec' };
    supervisors.push(s);
    people.push(s);
  }
  for (let i = 0; i < 6; i++) {
    const a: Person = { id: `staff-${i + 1}`, nameAr: arabicName(), nationalId: natId(), phone: phone(), role: 'admin_staff' };
    adminStaff.push(a);
    people.push(a);
  }
  for (let i = 0; i < 8; i++) {
    const d: Person = { id: `driver-${i + 1}`, nameAr: arabicName(), nationalId: natId(), phone: phone(), role: 'driver', employerId: 'org-school' };
    drivers.push(d);
    people.push(d);
  }

  /* ——— properties + residents + vehicles ——— */
  const properties: Property[] = [];
  const vehicles: Vehicle[] = [];
  const residents: Person[] = [];

  const commercialUses = ['مدرسة الحي الدبلوماسي العالمية', 'مجمع عيادات الحي الطبي', 'سوق الحي المركزي', 'مركز أعمال السفارات'];
  // 44 units: 26 villas · 6 apartments · 4 commercial · 8 diplomatic missions/entities
  for (let i = 0; i < 44; i++) {
    const type: Property['type'] = i < 26 ? 'villa' : i < 32 ? 'apartment' : i < 36 ? 'commercial' : 'embassy';
    // some residential units are vacant — available for allocation (drives the units dashboard)
    const vacant = (type === 'villa' || type === 'apartment') && i % 6 === 4;
    const pt = districtPoint(rng(), rng());
    const pid = `prop-${i + 1}`;
    const owner: Person = {
      id: `res-${residents.length + 1}`,
      nameAr: type === 'embassy' ? embassies[i - 36] : arabicName(),
      nationalId: natId(),
      phone: phone(),
      role: type === 'embassy' ? 'embassy_rep' : type === 'commercial' ? 'company_rep' : 'owner',
      propertyId: vacant ? undefined : pid,
    };
    residents.push(owner);
    const extraCount = type === 'villa' && !vacant ? int(rng, 0, 1) : 0;
    const extras: Person[] = [];
    for (let e = 0; e < extraCount && residents.length < 58; e++) {
      const r: Person = { id: `res-${residents.length + 1}`, nameAr: arabicName(), nationalId: natId(), phone: phone(), role: 'resident', propertyId: pid };
      residents.push(r);
      extras.push(r);
    }
    const prop: Property = {
      id: pid,
      code: `DQ-${type === 'villa' ? 'V' : type === 'apartment' ? 'A' : type === 'commercial' ? 'C' : 'E'}-${String(i + 1).padStart(3, '0')}`,
      unitNo: type === 'embassy' ? owner.nameAr : type === 'commercial' ? commercialUses[i - 32] : `وحدة ${i + 1}`,
      type,
      subtypeAr: type === 'commercial' ? commercialUses[i - 32] : undefined,
      zone: type === 'embassy' ? zones[0] : pick(rng, zones),
      lat: pt.lat,
      lng: pt.lng,
      ownerId: owner.id,
      residentIds: vacant ? [] : [owner.id, ...extras.map((x) => x.id)],
      vehicleIds: [],
      qrToken: token('QR-PROP', i + 1),
    };
    properties.push(prop);
  }
  // top up residents to 60
  while (residents.length < 60) {
    const home = pick(rng, properties.filter((p) => p.type === 'villa' && p.residentIds.length > 0));
    const r: Person = { id: `res-${residents.length + 1}`, nameAr: arabicName(), nationalId: natId(), phone: phone(), role: 'resident', propertyId: home.id };
    home.residentIds.push(r.id);
    residents.push(r);
  }
  people.push(...residents);

  // 42 resident vehicles attached to properties
  for (let i = 0; i < 42; i++) {
    const owner = pick(rng, residents.filter((r) => r.propertyId));
    const prop = properties.find((p) => p.id === owner.propertyId)!;
    const v: Vehicle = {
      id: `veh-${i + 1}`,
      plate: plate(),
      make: pick(rng, carMakes),
      color: pick(rng, carColors),
      ownerPersonId: owner.id,
      propertyId: prop.id,
      accessState: 'allowed',
    };
    prop.vehicleIds.push(v.id);
    vehicles.push(v);
  }
  // 8 school-driver vehicles (no property link — enter on permits)
  for (let i = 0; i < 8; i++) {
    vehicles.push({
      id: `veh-sd-${i + 1}`,
      plate: plate(),
      make: i % 2 === 0 ? 'تويوتا هايس' : 'هيونداي H1',
      color: pick(rng, ['أبيض', 'فضي']),
      ownerPersonId: drivers[i].id,
      accessState: 'allowed',
    });
  }

  // ★ Path A vehicle: school-driver bus with a prior (closed) violation
  const demoVehicle = vehicles.find((v) => v.id === 'veh-sd-1')!;
  demoVehicle.plate = 'ن د ب 4821';
  const demoDriver = drivers[0];
  demoDriver.nameAr = 'رمضان صبحي عبدالعال';

  /* ——— شخصيات هامة: رؤساء البعثات الثمانية يحملون لقب السفير ——— */
  people.filter((p) => p.role === 'embassy_rep').forEach((p) => { p.vipTitleAr = 'سفير — رئيس البعثة'; });

  /* ——— السجل الكامل للحي: توسعة إلى حجم المدينة (~3,000 وحدة · ‎+10 آلاف ساكن) ———
   * الوحدات التفصيلية (prop-1..44) تحمل الروابط الغنية (مركبات، تصاريح، بلاغات)؛
   * هذه الكتلة تكمل الحجم الحقيقي وتُغذي الإحصاءات والخريطة والبحث */
  const VIP_TITLES = ['أمير', 'وزير سابق', 'سفير سابق', 'مستشار بالديوان الملكي', 'رجل أعمال بارز', 'قنصل عام'];
  let vipLeft = 28;
  const BULK = 2956;
  for (let i = 0; i < BULK; i++) {
    const n = 45 + i;
    const roll = i % 20;
    const type: Property['type'] = roll < 11 ? 'villa' : roll < 19 ? 'apartment' : 'commercial';
    const vacant = type !== 'commercial' && rng() < 0.08;
    const pid = `bprop-${i + 1}`;
    const pt = districtPoint(rng(), rng());
    const owner: Person = {
      id: `bres-${i + 1}-o`,
      nameAr: arabicName(),
      nationalId: natId(),
      phone: phone(),
      role: type === 'commercial' ? 'company_rep' : 'owner',
      propertyId: vacant ? undefined : pid,
    };
    if (vipLeft > 0 && type === 'villa' && !vacant && rng() < 0.02) {
      owner.vipTitleAr = VIP_TITLES[vipLeft % VIP_TITLES.length];
      vipLeft--;
    }
    people.push(owner);
    const extras: Person[] = [];
    if (!vacant && type !== 'commercial') {
      const count = int(rng, 2, 5);
      for (let k = 0; k < count; k++) {
        extras.push({ id: `bres-${i + 1}-x${k + 1}`, nameAr: arabicName(), nationalId: natId(), phone: phone(), role: 'resident', propertyId: pid });
      }
      people.push(...extras);
    }
    const prop: Property = {
      id: pid,
      code: `DQ-${type === 'villa' ? 'V' : type === 'apartment' ? 'A' : 'C'}-${String(n).padStart(4, '0')}`,
      unitNo: type === 'commercial' ? pick(rng, commercialUses) : `وحدة ${n}`,
      type,
      subtypeAr: type === 'commercial' ? pick(rng, commercialUses) : undefined,
      zone: pick(rng, zones),
      lat: pt.lat,
      lng: pt.lng,
      ownerId: owner.id,
      residentIds: vacant ? [] : [owner.id, ...extras.map((x) => x.id)],
      vehicleIds: [],
      qrToken: token('QR-PROP', n),
    };
    if (!vacant && rng() < 0.5) {
      const v: Vehicle = {
        id: `bveh-${i + 1}`,
        plate: plate(),
        make: pick(rng, carMakes),
        color: pick(rng, carColors),
        ownerPersonId: owner.id,
        propertyId: pid,
        accessState: 'allowed',
      };
      prop.vehicleIds.push(v.id);
      vehicles.push(v);
    }
    properties.push(prop);
  }

  /* ——— permits (12 across statuses) ——— */
  const permits: Permit[] = [];
  // hosts must live in an occupied unit — vacant-unit owners carry no propertyId
  const residentHost = residents.find((r) => r.role === 'owner' && r.propertyId)!;
  const hostProp = properties.find((p) => p.id === residentHost.propertyId)!;

  const mkPermit = (n: number, p: Partial<Permit>): Permit => ({
    id: `permit-${n}`,
    kind: 'visitor',
    status: 'approved',
    requestedBy: residentHost.id,
    hostPropertyId: hostProp.id,
    subject: { nameAr: arabicName(), nationalId: natId(), phone: phone() },
    gateIds: ['gate-1', 'gate-2'],
    validFromISO: daysAgo(1),
    validToISO: daysFromNow(2),
    companions: int(rng, 0, 3),
    qrToken: token('QR-PRM', n),
    approvals: [],
    createdISO: daysAgo(2),
    ...p,
  });

  // school-driver permits (incl. the demo vehicle — permit valid; the block must come from accessState)
  for (let i = 0; i < 4; i++) {
    permits.push(
      mkPermit(permits.length + 1, {
        kind: 'school_driver',
        requestedBy: drivers[i].id,
        hostPropertyId: undefined,
        subject: { nameAr: drivers[i].nameAr, nationalId: drivers[i].nationalId, phone: drivers[i].phone },
        vehicleId: vehicles.find((v) => v.ownerPersonId === drivers[i].id)?.id,
        plate: vehicles.find((v) => v.ownerPersonId === drivers[i].id)?.plate,
        validFromISO: daysAgo(30),
        validToISO: daysFromNow(150),
        companions: 0,
        approvals: [{ by: adminStaff[0].id, role: 'admin_staff', decision: 'approved', atISO: daysAgo(29) }],
        createdISO: daysAgo(31),
      }),
    );
  }
  const otherHosts = residents.filter((r) => r.role === 'owner' && r.id !== residentHost.id && r.propertyId);
  const statuses: Permit['status'][] = ['approved', 'approved', 'pending', 'pending', 'rejected', 'expired', 'suspended', 'cancelled'];
  statuses.forEach((status, i) => {
    const host = i === 0 ? residentHost : pick(rng, otherHosts);
    const hp = properties.find((p) => p.id === host.propertyId)!;
    permits.push(
      mkPermit(permits.length + 1, {
        kind: pick(rng, ['visitor', 'visitor', 'domestic_worker', 'service_provider'] as const),
        status,
        requestedBy: host.id,
        hostPropertyId: hp.id,
        validFromISO: status === 'expired' ? daysAgo(10) : hoursAgo(int(rng, 2, 20)),
        validToISO: status === 'expired' ? daysAgo(3) : daysFromNow(int(rng, 1, 5)),
        approvals:
          status === 'approved'
            ? [{ by: adminStaff[int(rng, 0, 5)].id, role: 'admin_staff', decision: 'approved', atISO: hoursAgo(int(rng, 1, 12)) }]
            : status === 'rejected'
              ? [{ by: adminStaff[0].id, role: 'admin_staff', decision: 'rejected', noteAr: 'بيانات الزائر غير مكتملة', atISO: hoursAgo(6) }]
              : [],
        createdISO: daysAgo(int(rng, 1, 6)),
      }),
    );
  });

  /* ——— event permits — feed the events dashboard ——— */
  permits.push(
    mkPermit(permits.length + 1, {
      kind: 'event',
      status: 'approved',
      requestedBy: residents[12].id,
      hostPropertyId: undefined,
      subject: { nameAr: 'أمسية أهالي الحي — حديقة الطلح', phone: phone() },
      validFromISO: daysFromNow(2),
      validToISO: daysFromNow(2),
      companions: 60,
      approvals: [{ by: adminStaff[1].id, role: 'admin_staff', decision: 'approved', atISO: daysAgo(1) }],
      createdISO: daysAgo(4),
    }),
  );
  permits.push(
    mkPermit(permits.length + 1, {
      kind: 'event_vendor',
      status: 'pending',
      requestedBy: residents[15].id,
      hostPropertyId: undefined,
      subject: { nameAr: 'عربة قهوة مختصة — سوق السبت', phone: phone() },
      validFromISO: daysFromNow(5),
      validToISO: daysFromNow(5),
      companions: 2,
      approvals: [],
      createdISO: daysAgo(2),
    }),
  );
  permits.push(
    mkPermit(permits.length + 1, {
      kind: 'event',
      status: 'pending',
      requestedBy: residents[8].id,
      hostPropertyId: undefined,
      subject: { nameAr: 'بطولة بادل الحي — الملعب الرئيسي', phone: phone() },
      validFromISO: daysFromNow(9),
      validToISO: daysFromNow(9),
      companions: 16,
      approvals: [],
      createdISO: hoursAgo(20),
    }),
  );

  /* ——— service requests (6 open + history) ——— */
  const requests: ServiceRequest[] = [];
  const reqSeed: Array<[ServiceRequest['kind'], ServiceRequest['status'], ServiceRequest['priority'], string, number]> = [
    ['water_leak', 'in_progress', 'urgent', 'تسرب مياه واضح عند رصيف حديقة الصدر — تجمع مياه على الممشى', 30],
    ['lighting', 'assigned', 'high', 'ثلاثة أعمدة إنارة مطفأة في شارع الأمم قرب البوابة الشمالية', 26],
    ['cleanliness', 'new', 'normal', 'مخلفات بناء متروكة خلف الوحدة التجارية', 4],
    ['tree', 'triaged', 'normal', 'أغصان متدلية تعيق الرؤية عند تقاطع حديقة الطلح', 18],
    ['abandoned_vehicle', 'new', 'low', 'مركبة متوقفة منذ أسابيع دون حراك أمام الوحدة ١٢', 8],
    ['pavement', 'assigned', 'normal', 'تكسر بلاط الرصيف أمام المدخل الغربي لحديقة المشتل', 40],
    ['visual_disorder', 'new', 'high', 'لوحة إعلانية مخالفة على واجهة وحدة تجارية تحجب النسق المعماري للشارع', 6],
    ['visual_disorder', 'in_progress', 'normal', 'كتابات وشخبطة على جدار الممشى الشرقي قرب بوابة الحديقة', 20],
    ['visual_disorder', 'assigned', 'high', 'مواد بناء مكشوفة دون ساتر نظامي أمام فيلا قيد الترميم', 30],
    ['visual_disorder', 'triaged', 'normal', 'أسلاك متدلية بين عمودي إنارة خلف السوق المركزي', 44],
    ['visual_disorder', 'closed', 'normal', 'مظلة مواقف متهالكة شوّهت واجهة الشارع — استُبدلت بمظلة موحدة', 150],
    ['visual_disorder', 'closed', 'low', 'ملصقات دعائية عشوائية على صناديق الكهرباء — أُزيلت ودُهنت الصناديق', 210],
    ['maintenance', 'closed', 'normal', 'باب دورة المياه في حديقة النفل لا يُغلق', 96],
    ['cleanliness', 'closed', 'normal', 'حاوية ممتلئة لم تُفرّغ في موعدها — القطاع الشرقي', 120],
    ['noise', 'closed', 'low', 'إزعاج متكرر مساءً من موقع أعمال مجاور', 200],
  ];
  reqSeed.forEach(([kind, status, priority, desc, hrs], i) => {
    const raiser = pick(rng, residents);
    const pt = districtPoint(rng(), rng());
    const isClosed = status === 'closed';
    const req: ServiceRequest = {
      id: `req-${i + 1}`,
      kind,
      status,
      priority,
      raisedBy: raiser.id,
      propertyId: raiser.propertyId,
      lat: pt.lat,
      lng: pt.lng,
      descriptionAr: desc,
      mediaBefore: ['before'],
      mediaAfter: isClosed ? ['after'] : [],
      assignedToOrgId: status === 'new' ? undefined : kind === 'cleanliness' || kind === 'waste' ? 'org-clean' : kind === 'tree' ? 'org-land' : 'org-maint',
      dueISO: status === 'new' ? undefined : hoursFromNow(int(rng, 4, 48)),
      slaBreached: i === 1, // the lighting request is over SLA — dashboard needs a breach
      rating: isClosed ? (pick(rng, [4, 5, 5, 3]) as 4) : undefined,
      events: [
        { atISO: hoursAgo(hrs), actorId: raiser.id, actorRole: 'resident', action: 'إنشاء البلاغ' },
        ...(status !== 'new'
          ? [{ atISO: hoursAgo(hrs - 2), actorId: adminStaff[1].id, actorRole: 'admin_staff', action: 'تصنيف وإسناد', detailAr: 'أُسند للمقاول المختص' }]
          : []),
        ...(isClosed
          ? [
              { atISO: hoursAgo(hrs - 20), actorId: adminStaff[1].id, actorRole: 'admin_staff', action: 'تنفيذ ورفع صور ما بعد المعالجة' },
              { atISO: hoursAgo(hrs - 16), actorId: raiser.id, actorRole: 'resident', action: 'تأكيد الإغلاق والتقييم' },
            ]
          : []),
      ],
    };
    requests.push(req);
  });

  /* ——— violations: prior closed one on the demo vehicle + 3 open ——— */
  const violations: Violation[] = [
    {
      id: 'vio-prior',
      subject: 'vehicle',
      subjectId: demoVehicle.id,
      code: 'TR-07',
      labelAr: 'وقوف خاطئ متكرر أمام مسار المشاة',
      status: 'closed',
      loggedBy: guards[2].id,
      lat: 24.6812,
      lng: 46.632,
      media: ['photo'],
      repeatCount: 1,
      escalationStep: 1,
      events: [
        { atISO: daysAgo(21), actorId: guards[2].id, actorRole: 'guard', action: 'تسجيل المخالفة' },
        { atISO: daysAgo(20), actorId: adminStaff[2].id, actorRole: 'admin_staff', action: 'إشعار المخالف', detailAr: 'إنذار أول' },
        { atISO: daysAgo(14), actorId: adminStaff[2].id, actorRole: 'admin_staff', action: 'إغلاق بعد التصحيح' },
      ],
    },
    {
      id: 'vio-1',
      subject: 'property',
      subjectId: properties[7].id,
      code: 'VD-03',
      labelAr: 'تشوه بصري — مواد بناء مكشوفة في الواجهة',
      status: 'grace',
      loggedBy: guards[4].id,
      lat: properties[7].lat,
      lng: properties[7].lng,
      media: ['photo'],
      graceUntilISO: daysFromNow(2),
      repeatCount: 1,
      escalationStep: 0,
      events: [
        { atISO: daysAgo(3), actorId: guards[4].id, actorRole: 'guard', action: 'تسجيل المخالفة' },
        { atISO: daysAgo(3), actorId: adminStaff[2].id, actorRole: 'admin_staff', action: 'إشعار وتحديد مهلة تصحيح' },
      ],
    },
    {
      id: 'vio-2',
      subject: 'vehicle',
      subjectId: vehicles[5].id,
      code: 'TR-02',
      labelAr: 'تجاوز السرعة داخل النطاق السكني',
      status: 'notified',
      loggedBy: guards[1].id,
      lat: 24.688,
      lng: 46.625,
      media: [],
      repeatCount: 1,
      escalationStep: 0,
      events: [
        { atISO: hoursAgo(30), actorId: guards[1].id, actorRole: 'guard', action: 'تسجيل المخالفة' },
        { atISO: hoursAgo(28), actorId: adminStaff[3].id, actorRole: 'admin_staff', action: 'إشعار المخالف' },
      ],
    },
    {
      id: 'vio-3',
      subject: 'person',
      subjectId: residents[9].id,
      code: 'CM-01',
      labelAr: 'إشغال مساحة عامة دون تصريح',
      status: 'open',
      loggedBy: guards[0].id,
      lat: 24.678,
      lng: 46.6198,
      media: ['photo'],
      repeatCount: 1,
      escalationStep: 0,
      events: [{ atISO: hoursAgo(5), actorId: guards[0].id, actorRole: 'guard', action: 'تسجيل المخالفة' }],
    },
    /* EP-20 — التظلّمات.
       لم تكن أي مخالفة في البذرة تحمل تظلّمًا، فشاشة التظلّمات تفتح فارغة
       دائمًا ولا يظهر أثر القاعدة الأهم فيها: التظلّم يوقف عدّاد المهلة حتى
       البتّ. ثلاث حالات هنا تغطّي المسار كاملًا: قائم، ومقبول، ومرفوض —
       والفرق بين الأخيرين هو أثرهما على العدّاد، ولا يبين بمثال واحد. */
    {
      id: 'vio-appeal-open',
      subject: 'vehicle',
      subjectId: vehicles[8].id,
      code: 'TR-02',
      labelAr: 'تجاوز السرعة داخل النطاق السكني',
      status: 'appealed',
      loggedBy: guards[5].id,
      lat: 24.6838,
      lng: 46.6262,
      media: ['photo'],
      graceUntilISO: daysFromNow(4),
      repeatCount: 1,
      escalationStep: 1,
      appeal: {
        reasonAr:
          'الرادار سجّل المركبة أثناء إفساح الطريق لسيارة إسعاف خارجة من البوابة الرئيسية. أرفقتُ تسجيل الكاميرا الأمامية الذي يوضح الإشارة الصوتية قبل التجاوز بثوانٍ.',
        submittedBy: residents[6].id,
        submittedISO: daysAgo(1),
      },
      events: [
        { atISO: daysAgo(4), actorId: guards[5].id, actorRole: 'guard', action: 'تسجيل المخالفة' },
        { atISO: daysAgo(4), actorId: adminStaff[2].id, actorRole: 'admin_staff', action: 'إشعار المخالف', detailAr: 'إنذار أول ومهلة تصحيح' },
        { atISO: daysAgo(1), actorId: residents[6].id, actorRole: 'resident', action: 'تقديم تظلّم', detailAr: 'عدّاد المهلة موقوف حتى البتّ' },
      ],
    },
    {
      id: 'vio-appeal-accepted',
      subject: 'property',
      subjectId: properties[11].id,
      code: 'VD-01',
      labelAr: 'مخلفات بناء على الرصيف',
      status: 'closed',
      loggedBy: guards[1].id,
      lat: properties[11].lat,
      lng: properties[11].lng,
      media: ['photo'],
      repeatCount: 1,
      escalationStep: 0,
      appeal: {
        reasonAr:
          'المخلفات تعود لمشروع البلدية على الرصيف المقابل لا للوحدة. صورة المخالفة التُقطت من زاوية تُظهر الرصيفين معًا.',
        submittedBy: residents[3].id,
        submittedISO: daysAgo(9),
        decision: 'accepted',
        decisionNoteAr:
          'بالمعاينة الميدانية ثبت أن المخلفات ضمن نطاق أعمال البلدية. تُلغى المخالفة ولا تُحتسب في سجل التكرار.',
        decidedBy: adminStaff[0].id,
        decidedISO: daysAgo(7),
      },
      events: [
        { atISO: daysAgo(12), actorId: guards[1].id, actorRole: 'guard', action: 'تسجيل المخالفة' },
        { atISO: daysAgo(9), actorId: residents[3].id, actorRole: 'resident', action: 'تقديم تظلّم' },
        { atISO: daysAgo(7), actorId: adminStaff[0].id, actorRole: 'admin_staff', action: 'قبول التظلّم', detailAr: 'إلغاء المخالفة ورفعها من سجل التكرار' },
      ],
    },
    {
      id: 'vio-appeal-rejected',
      subject: 'vehicle',
      subjectId: vehicles[3].id,
      code: 'TR-07',
      labelAr: 'وقوف خاطئ متكرر أمام مسار المشاة',
      status: 'notified',
      loggedBy: guards[2].id,
      lat: 24.6759,
      lng: 46.6231,
      media: ['photo'],
      graceUntilISO: daysFromNow(1),
      repeatCount: 2,
      escalationStep: 2,
      appeal: {
        reasonAr: 'المركبة كانت متوقفة دقيقتين فقط لإنزال الركاب.',
        submittedBy: residents[8].id,
        submittedISO: daysAgo(5),
        decision: 'rejected',
        decisionNoteAr:
          'مسار المشاة ممنوع الوقوف عليه مهما قصرت المدة. المهلة تُستأنف من تاريخ هذا القرار لا من تاريخ المخالفة.',
        decidedBy: adminStaff[0].id,
        decidedISO: daysAgo(3),
      },
      events: [
        { atISO: daysAgo(8), actorId: guards[2].id, actorRole: 'guard', action: 'تسجيل المخالفة' },
        { atISO: daysAgo(5), actorId: residents[8].id, actorRole: 'resident', action: 'تقديم تظلّم' },
        { atISO: daysAgo(3), actorId: adminStaff[0].id, actorRole: 'admin_staff', action: 'رفض التظلّم', detailAr: 'استئناف عدّاد المهلة' },
      ],
    },
  ];

  /* ——— incidents: history + 1 active ——— */
  const incidents: Incident[] = [
    {
      id: 'inc-hist-1',
      txnNo: formatTxn(429),
      kind: 'traffic_accident',
      severity: 'medium',
      occurredISO: daysAgo(6),
      reportedISO: daysAgo(6),
      reportedBy: guards[3].id,
      lat: 24.684,
      lng: 46.6335,
      vehicle: { plate: plate(), make: 'هيونداي سوناتا', color: 'أبيض' },
      parties: [{ nameAr: arabicName(), nationalId: natId(), role: 'subject' }],
      dispatch: { patrolId: 'patrol-2', dispatchedISO: daysAgo(6), arrivedISO: daysAgo(6), responseSeconds: 312 },
      status: 'closed',
      events: [
        { atISO: daysAgo(6), actorId: guards[3].id, actorRole: 'guard', action: 'تسجيل البلاغ' },
        { atISO: daysAgo(6), actorId: supervisors[0].id, actorRole: 'supervisor', action: 'إغلاق بعد اعتماد المحضر' },
      ],
    },
    {
      id: 'inc-hist-2',
      txnNo: formatTxn(430),
      kind: 'lost_property',
      severity: 'low',
      occurredISO: daysAgo(2),
      reportedISO: daysAgo(2),
      reportedBy: residents[4].id,
      lat: 24.672,
      lng: 46.621,
      parties: [{ personId: residents[4].id, nameAr: residents[4].nameAr, role: 'reporter' }],
      dispatch: { patrolId: 'patrol-1', dispatchedISO: daysAgo(2), arrivedISO: daysAgo(2), responseSeconds: 428 },
      status: 'closed',
      events: [{ atISO: daysAgo(2), actorId: residents[4].id, actorRole: 'resident', action: 'تسجيل البلاغ' }],
    },
    {
      id: 'inc-active',
      txnNo: formatTxn(431),
      kind: 'suspicious_vehicle',
      severity: 'medium',
      occurredISO: minutesAgo(42),
      reportedISO: minutesAgo(38),
      reportedBy: guards[6].id,
      lat: 24.6895,
      lng: 46.6305,
      vehicle: { plate: plate(), make: 'شفروليه تاهو', color: 'أسود' },
      parties: [{ nameAr: guards[6].nameAr, personId: guards[6].id, role: 'reporter' }],
      status: 'open',
      events: [{ atISO: minutesAgo(38), actorId: guards[6].id, actorRole: 'guard', action: 'تسجيل البلاغ', detailAr: 'مركبة متوقفة أمام سور السفارة لفترة طويلة' }],
    },
  ];

  /* ——— المحاضر ———
     كانت `mahadir` تُبذر مصفوفةً فارغة، فتفتح شاشة المحاضر بلا سجل واحد،
     ومعها يختفي الدليل على أهم خاصية فيها: المحضر المعتمَد يُقفل ويصير
     سلسلة تجزئة لا تُعدَّل. محضران معتمدان مقفلان وثالث قيد التحرير على
     البلاغ المفتوح — فتظهر الحالتان معًا. */
  const mahdarHash = (payload: string, prior: string) => {
    /* تجزئة استعراضية حتمية — الإنتاج يستبدلها بـSHA-256 على الخادم */
    let h = 0x811c9dc5;
    for (const ch of prior + payload) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0').repeat(4);
  };
  const chain1 = mahdarHash('mah-1', '');
  const chain2 = mahdarHash('mah-2', chain1);

  const mahadir: Mahdar[] = [
    {
      id: 'mah-1',
      incidentId: 'inc-hist-1',
      txnNo: formatTxn(429),
      summaryAr:
        'تصادم جانبي بين مركبتين عند تقاطع الشارع الرئيسي مع مدخل القطاع السكني الشرقي أثناء انعطاف غير مصرّح به. لا إصابات. أضرار مادية محدودة في المصد الأمامي الأيسر للمركبة الأولى والباب الخلفي الأيمن للثانية.',
      resolutionAr:
        'تم التوفيق بين الطرفين ميدانيًا. أقرّ سائق المركبة الأولى بالمسؤولية وتعهّد بإصلاح الضرر خلال أسبوع. لم يُطلب تحرير بلاغ مروري رسمي.',
      waiver: { agreed: true, noteAr: 'تنازل الطرف الثاني عن المطالبة بعد الإقرار والتعهّد بالإصلاح.' },
      seized: [],
      signatures: [
        { partyId: guards[3].id, dataUrl: 'sig:guard', atISO: daysAgo(6) },
        { partyId: supervisors[0].id, dataUrl: 'sig:supervisor', atISO: daysAgo(6) },
      ],
      approvedBy: supervisors[0].id,
      approvedISO: daysAgo(6),
      locked: true,
      hashChain: [chain1],
    },
    {
      id: 'mah-2',
      incidentId: 'inc-hist-2',
      txnNo: formatTxn(430),
      summaryAr:
        'بلاغ فقدان حقيبة يد داخل الحديقة قرب منطقة الألعاب. عُثر عليها بعد ساعتين لدى نقطة الأمن الجنوبية وسُلّمت لصاحبتها بعد التحقق من الهوية ومطابقة محتويات الحقيبة.',
      resolutionAr: 'سُلّمت المفقودات كاملة إلى صاحبتها بعد توقيع محضر الاستلام. لم تُسجَّل أي شبهة جنائية.',
      seized: [
        {
          id: 'itm-1',
          descriptionAr: 'حقيبة يد جلدية بنّية تحتوي على محفظة وهاتف ومفاتيح',
          custody: [
            { byPersonId: guards[2].id, action: 'seized', atISO: daysAgo(2), locationAr: 'الحديقة — منطقة الألعاب' },
            { byPersonId: guards[2].id, action: 'labelled', atISO: daysAgo(2), locationAr: 'نقطة الأمن الجنوبية' },
            { byPersonId: supervisors[0].id, action: 'stored', atISO: daysAgo(2), locationAr: 'خزانة المفقودات — غرفة العمليات' },
            { byPersonId: supervisors[0].id, action: 'released', atISO: daysAgo(2), locationAr: 'غرفة العمليات — تسليم للمالكة' },
          ],
        },
      ],
      signatures: [
        { partyId: guards[2].id, dataUrl: 'sig:guard', atISO: daysAgo(2) },
        { partyId: residents[4].id, dataUrl: 'sig:owner', atISO: daysAgo(2) },
      ],
      approvedBy: supervisors[0].id,
      approvedISO: daysAgo(2),
      locked: true,
      hashChain: [chain1, chain2],
    },
    {
      id: 'mah-3',
      incidentId: 'inc-active',
      txnNo: formatTxn(431),
      summaryAr:
        'مركبة دفع رباعي سوداء متوقفة أمام السور الخارجي لإحدى السفارات منذ ما يزيد على أربعين دقيقة دون راكب ظاهر. رُصدت من الدورية أثناء الجولة الاعتيادية.',
      resolutionAr: '',
      seized: [],
      signatures: [],
      locked: false,
      hashChain: [],
    },
  ];

  /* ——— assets: gardens, court, bins, poles, tanks, restrooms ——— */
  const assets: Asset[] = [];
  const sensorValues: SeedData['sensorValues'] = {};
  GARDEN_NAMES.forEach((g, i) => {
    const pt = districtPoint(rng(), rng());
    assets.push({ id: `garden-${i + 1}`, kind: 'garden', nameAr: g.startsWith('منتزه') ? g : `حديقة ${g}`, lat: pt.lat, lng: pt.lng, qrToken: token('QR-GRD', i + 1) });
  });
  assets.push({ id: 'court-1', kind: 'court', nameAr: 'ملعب بادل — حديقة الطلح', lat: 24.6742, lng: 46.6305, qrToken: 'QR-CRT-001' });
  for (let i = 0; i < 30; i++) {
    const pt = districtPoint(rng(), rng());
    const a: Asset = { id: `bin-${i + 1}`, kind: 'bin', nameAr: `حاوية ${String(i + 1).padStart(2, '0')}`, lat: pt.lat, lng: pt.lng, qrToken: token('QR-BIN', i + 1) };
    assets.push(a);
    sensorValues[a.id] = { fill: int(rng, 15, i === 4 ? 78 : 70), battery: int(rng, 60, 100) };
  }
  for (let i = 0; i < 10; i++) {
    const pt = districtPoint(rng(), rng());
    const a: Asset = { id: `pole-${i + 1}`, kind: 'light_pole', nameAr: `عمود إنارة ${String(i + 1).padStart(2, '0')}`, lat: pt.lat, lng: pt.lng, qrToken: token('QR-POL', i + 1) };
    assets.push(a);
    sensorValues[a.id] = { lampOk: i !== 3, battery: int(rng, 70, 100) };
  }
  for (let i = 0; i < 6; i++) {
    const pt = districtPoint(rng(), rng());
    const a: Asset = { id: `tank-${i + 1}`, kind: 'irrigation_tank', nameAr: `خزان مياة ${i + 1}`, lat: pt.lat, lng: pt.lng, qrToken: token('QR-TNK', i + 1) };
    assets.push(a);
    sensorValues[a.id] = { tankLevel: int(rng, 35, 95), battery: int(rng, 60, 100) };
  }
  for (let i = 0; i < 4; i++) {
    const pt = districtPoint(rng(), rng());
    assets.push({ id: `wc-${i + 1}`, kind: 'restroom', nameAr: `دورة مياه — ${assets[i].nameAr}`, lat: pt.lat, lng: pt.lng, qrToken: token('QR-WCX', i + 1) });
  }
  // trees with soil-moisture sensors — clustered inside the gardens; a few start dry (alert state)
  let treeN = 0;
  for (const g of assets.filter((a) => a.kind === 'garden')) {
    const count = int(rng, 3, 5);
    for (let t = 0; t < count; t++) {
      treeN++;
      const pos = clampToDistrict(g.lat + (rng() - 0.5) * 0.0018, g.lng + (rng() - 0.5) * 0.0018);
      const a: Asset = {
        id: `tree-${treeN}`,
        kind: 'tree',
        nameAr: `شجرة ${String(treeN).padStart(2, '0')} — ${g.nameAr}`,
        lat: pos.lat,
        lng: pos.lng,
        qrToken: token('QR-TRE', treeN),
      };
      assets.push(a);
      sensorValues[a.id] = {
        moisture: treeN % 13 === 0 ? int(rng, 12, 22) : int(rng, 35, 85),
        battery: int(rng, 55, 100),
      };
    }
  }

  /* ——— bookings ——— */
  const bookings: Booking[] = [
    { id: 'bk-1', facilityId: 'court-1', byPersonId: residentHost.id, fromISO: hoursAgo(1), toISO: hoursFromNow(2), status: 'confirmed', qrToken: 'QR-BKG-001', attendees: 4 },
    { id: 'bk-2', facilityId: 'garden-6', byPersonId: residents[12].id, fromISO: daysFromNow(2), toISO: daysFromNow(2), status: 'confirmed', qrToken: 'QR-BKG-002', attendees: 25 },
    { id: 'bk-3', facilityId: 'court-1', byPersonId: residents[8].id, fromISO: daysAgo(3), toISO: daysAgo(3), status: 'used', qrToken: 'QR-BKG-003', attendees: 4 },
    { id: 'bk-4', facilityId: 'garden-9', byPersonId: residents[15].id, fromISO: daysFromNow(5), toISO: daysFromNow(5), status: 'confirmed', qrToken: 'QR-BKG-004', attendees: 120 },
    { id: 'bk-5', facilityId: 'court-1', byPersonId: residents[8].id, fromISO: daysFromNow(9), toISO: daysFromNow(9), status: 'confirmed', qrToken: 'QR-BKG-005', attendees: 16 },
    { id: 'bk-6', facilityId: 'garden-2', byPersonId: residents[20].id, fromISO: daysAgo(6), toISO: daysAgo(6), status: 'cancelled', qrToken: 'QR-BKG-006', attendees: 40 },
    { id: 'bk-7', facilityId: 'garden-4', byPersonId: residents[25].id, fromISO: daysFromNow(12), toISO: daysFromNow(12), status: 'confirmed', qrToken: 'QR-BKG-007', attendees: 35 },
  ];

  /* ——— event requests — فعاليات تتطلب تنسيق جهات خارجية ——— */
  const eventRequests: EventRequest[] = [
    {
      id: 'evr-1',
      titleAr: 'احتفال اليوم الوطني',
      requesterKind: 'embassy',
      requesterNameAr: embassies[0],
      requesterPropertyId: 'prop-37',
      facilityId: 'garden-6',
      fromISO: daysFromNow(9),
      toISO: daysFromNow(9),
      attendees: 250,
      notesAr: 'حضور دبلوماسي رفيع — تنظيم مواقف وتأمين المداخل',
      parties: ['district_security', 'police', 'traffic_police'],
      partiesSentISO: daysAgo(2),
      approvals: [
        { ministry: 'interior', status: 'approved', decidedISO: daysAgo(1) },
        { ministry: 'foreign_affairs', status: 'approved', decidedISO: hoursAgo(30) },
      ],
      status: 'approved',
      createdISO: daysAgo(2),
    },
    {
      id: 'evr-2',
      titleAr: 'بازار الحي الموسمي',
      requesterKind: 'commercial',
      requesterNameAr: 'سوق الحي التجاري',
      requesterPropertyId: 'prop-35',
      facilityId: 'garden-2',
      fromISO: daysFromNow(14),
      toISO: daysFromNow(14),
      attendees: 400,
      parties: ['district_security', 'civil_defense', 'red_crescent'],
      partiesSentISO: hoursAgo(5),
      approvals: [{ ministry: 'interior', status: 'pending' }],
      status: 'pending',
      createdISO: hoursAgo(5),
    },
    {
      id: 'evr-3',
      titleAr: 'أمسية ثقافية وعرض فني',
      requesterKind: 'embassy',
      requesterNameAr: embassies[1],
      requesterPropertyId: 'prop-38',
      facilityId: 'garden-9',
      fromISO: daysFromNow(20),
      toISO: daysFromNow(20),
      attendees: 120,
      parties: ['district_security', 'police'],
      partiesSentISO: hoursAgo(26),
      approvals: [
        { ministry: 'interior', status: 'pending' },
        { ministry: 'foreign_affairs', status: 'pending' },
      ],
      status: 'pending',
      createdISO: hoursAgo(26),
    },
  ];

  /* ——— lost & found — أغراض معثور عليها لدى البوابات وبلاغات فقدان عامة ——— */
  const lostFoundItems: LostFoundItem[] = [
    {
      id: 'lf-1',
      refNo: 'LF-A3K2M',
      kind: 'found',
      category: 'keys',
      colorAr: 'فضي',
      descriptionAr: 'سلسلة مفاتيح فيها ٤ مفاتيح وميدالية جلدية',
      locationAr: 'حديقة النفل — قرب الملعب',
      dateISO: daysAgo(2),
      reporterNameAr: 'حارس البوابة الرئيسية',
      reporterPhone: '0500000001',
      status: 'open',
      createdISO: daysAgo(2),
    },
    {
      id: 'lf-2',
      refNo: 'LF-B7Q9X',
      kind: 'found',
      category: 'electronics',
      colorAr: 'أسود',
      descriptionAr: 'سماعات لاسلكية في علبة شحن',
      locationAr: 'الممشى — بوابة الحديقة الشرقية',
      dateISO: daysAgo(1),
      reporterNameAr: 'مشرف المرافق',
      reporterPhone: '0500000002',
      status: 'open',
      createdISO: daysAgo(1),
    },
    {
      id: 'lf-3',
      refNo: 'LF-C4D8R',
      kind: 'lost',
      category: 'bag',
      colorAr: 'بني',
      descriptionAr: 'محفظة جلدية فيها بطاقات بنكية وهوية',
      locationAr: 'موقف البوابة الجنوبية',
      dateISO: daysAgo(3),
      reporterNameAr: 'سالم عبدالله الحربي',
      reporterPhone: '0553219876',
      status: 'open',
      createdISO: daysAgo(3),
    },
    {
      id: 'lf-4',
      refNo: 'LF-D1N6P',
      kind: 'lost',
      category: 'documents',
      colorAr: 'أزرق',
      descriptionAr: 'جواز سفر داخل غلاف أزرق',
      locationAr: 'حديقة الصدر',
      dateISO: daysAgo(4),
      reporterNameAr: 'نورة فهد العتيبي',
      reporterPhone: '0561234500',
      status: 'matched',
      matchedItemId: 'lf-5',
      matchedISO: daysAgo(1),
      createdISO: daysAgo(4),
    },
    {
      id: 'lf-5',
      refNo: 'LF-E9T2W',
      kind: 'found',
      category: 'documents',
      colorAr: 'أزرق',
      descriptionAr: 'جواز سفر بغلاف أزرق سُلّم عند البوابة',
      locationAr: 'البوابة الرئيسية',
      dateISO: daysAgo(1),
      reporterNameAr: 'حارس البوابة الرئيسية',
      reporterPhone: '0500000001',
      status: 'matched',
      matchedItemId: 'lf-4',
      matchedISO: daysAgo(1),
      createdISO: daysAgo(1),
    },
    {
      id: 'lf-6',
      refNo: 'LF-F5H3J',
      kind: 'lost',
      category: 'jewelry',
      colorAr: 'ذهبي',
      descriptionAr: 'ساعة يد ذهبية بسوار معدني',
      dateISO: daysAgo(9),
      reporterNameAr: 'مشعل سعود القحطاني',
      reporterPhone: '0509871234',
      status: 'returned',
      matchedItemId: 'lf-7',
      matchedISO: daysAgo(7),
      createdISO: daysAgo(9),
    },
    {
      id: 'lf-7',
      refNo: 'LF-G8V4Y',
      kind: 'found',
      category: 'jewelry',
      colorAr: 'ذهبي',
      descriptionAr: 'ساعة ذهبية وُجدت في دورات مياه حديقة المشتل',
      locationAr: 'حديقة المشتل',
      dateISO: daysAgo(8),
      reporterNameAr: 'عامل النظافة — شركة النقاء',
      reporterPhone: '0500000003',
      status: 'returned',
      matchedItemId: 'lf-6',
      matchedISO: daysAgo(7),
      createdISO: daysAgo(8),
    },
  ];

  /* ——— patrols / shifts / checkpoints ——— */
  const patrols: Patrol[] = [
    { id: 'patrol-1', nameAr: 'دورية ١ — القطاع الشرقي', guardId: guards[7].id, lat: 24.6825, lng: 46.6355, status: 'available' },
    { id: 'patrol-2', nameAr: 'دورية ٢ — القطاع الغربي', guardId: guards[8].id, lat: 24.6785, lng: 46.6195, status: 'available' },
    { id: 'patrol-3', nameAr: 'دورية ٣ — حي السفارات', guardId: guards[9].id, lat: 24.6905, lng: 46.6285, status: 'available' },
  ];
  const shifts: Shift[] = guards.slice(0, 6).map((g, i) => ({
    id: `shift-${i + 1}`,
    guardId: g.id,
    postId: gates[i % 2].id,
    startISO: hoursAgo(2),
    endISO: hoursFromNow(6),
    checkedInISO: i < 4 ? hoursAgo(2) : undefined, // two posts uncovered — ops room shows it
  }));
  const checkpoints: Checkpoint[] = [1, 2, 3, 4, 5, 6].map((n) => {
    const pt = districtPoint(rng(), rng());
    return { id: `cp-${n}`, nameAr: `نقطة تفتيش ${n}`, lat: pt.lat, lng: pt.lng, qrToken: token('QR-CHK', n) };
  });
  const checkpointScans: CheckpointScan[] = [
    { checkpointId: 'cp-1', guardId: guards[7].id, atISO: minutesAgo(95) },
    { checkpointId: 'cp-2', guardId: guards[7].id, atISO: minutesAgo(63) },
    { checkpointId: 'cp-3', guardId: guards[8].id, atISO: minutesAgo(31) },
  ];

  /* ——— gate events history ——— */
  const gateEvents: GateEvent[] = [];
  for (let i = 0; i < 14; i++) {
    const v = pick(rng, vehicles.filter((x) => x.propertyId));
    gateEvents.push({
      id: nanoid(8),
      gateId: pick(rng, gates).id,
      atISO: minutesAgo(int(rng, 5, 600)),
      method: rng() < 0.5 ? 'plate' : 'qr',
      input: v.plate,
      decision: rng() < 0.92 ? 'allowed' : 'escalated',
      reasonAr: 'مركبة مقيم مسجلة',
      vehicleId: v.id,
      direction: 'in' as const,
      byGuardId: pick(rng, guards).id,
    });
  }
  gateEvents.sort((a, b) => b.atISO.localeCompare(a.atISO));

  /* ——— ads — commercial units advertising on the Community page (revenue stream) ——— */
  const ads: Ad[] = [
    {
      id: 'ad-1',
      advertiserPropId: 'prop-33',
      titleAr: 'التسجيل مفتوح للعام الدراسي الجديد',
      bodyAr: 'مقاعد محدودة في مدرسة الحي الدبلوماسي العالمية — منهج دولي وأنشطة إثرائية، وأولوية تسجيل لأبناء سكان الحي.',
      ctaAr: 'سجّل اهتمامك',
      package: 'featured',
      monthlyPrice: 900,
      status: 'active',
      startISO: daysAgo(12),
      endISO: daysFromNow(48),
    },
    {
      id: 'ad-2',
      advertiserPropId: 'prop-34',
      titleAr: 'فحص شامل بخصم 20% لسكان الحي',
      bodyAr: 'مجمع عيادات الحي الطبي — باقة الفحص السنوي الشامل مع تقرير إلكتروني خلال 24 ساعة.',
      ctaAr: 'احجز موعدك',
      package: 'standard',
      monthlyPrice: 400,
      status: 'active',
      startISO: daysAgo(20),
      endISO: daysFromNow(40),
    },
    {
      id: 'ad-3',
      advertiserPropId: 'prop-35',
      titleAr: 'توصيل مجاني للطلبات فوق 100 ر.س',
      bodyAr: 'سوق الحي المركزي — خضار وفواكه طازجة يوميًا، وتوصيل لباب الفيلا خلال ساعة داخل الحي.',
      ctaAr: 'اطلب الآن',
      package: 'standard',
      monthlyPrice: 400,
      status: 'active',
      startISO: daysAgo(8),
      endISO: daysFromNow(52),
    },
    {
      id: 'ad-4',
      advertiserPropId: 'prop-36',
      titleAr: 'مكاتب مفروشة جاهزة — عروض الافتتاح',
      bodyAr: 'مركز أعمال السفارات — مكاتب مجهزة وقاعات اجتماعات بالساعة لممثلي البعثات والشركات.',
      ctaAr: 'اطلب جولة',
      package: 'featured',
      monthlyPrice: 900,
      status: 'pending',
      startISO: daysFromNow(3),
      endISO: daysFromNow(63),
    },
    {
      id: 'ad-5',
      advertiserPropId: 'prop-35',
      titleAr: 'مهرجان العروض الموسمية',
      bodyAr: 'انتهت الحملة — أرشيف.',
      ctaAr: 'انتهى',
      package: 'standard',
      monthlyPrice: 400,
      status: 'ended',
      startISO: daysAgo(70),
      endISO: daysAgo(40),
    },
  ];

  /* ——— embassy entry management: per-embassy daily limits + booked appointments ——— */
  const embassyProps = properties.filter((p) => p.type === 'embassy');
  const embassyConfigs: Record<string, { dailyLimit: number }> = {};
  embassyProps.forEach((p, i) => {
    embassyConfigs[p.id] = { dailyLimit: [20, 15, 25, 12][i % 4] };
  });
  const visitPurposes = ['تأشيرة زيارة', 'خدمات قنصلية', 'توثيق مستندات', 'مقابلة رسمية', 'استلام جواز'];
  const appointments: EmbassyAppointment[] = [];
  let apptN = 0;
  for (const emb of embassyProps) {
    const perDay = [4, 3, 5, 2][embassyProps.indexOf(emb) % 4];
    for (let day = -5; day <= 2; day++) {
      const count = Math.max(1, perDay + int(rng, -1, 2));
      for (let k = 0; k < count; k++) {
        apptN++;
        const base = new Date(Date.now() + day * 864e5);
        base.setHours(9 + int(rng, 0, 5), rng() < 0.5 ? 0 : 30, 0, 0);
        appointments.push({
          id: `appt-${apptN}`,
          embassyPropId: emb.id,
          visitorNameAr: arabicName(),
          nationalId: natId(),
          phone: phone(),
          purposeAr: pick(rng, visitPurposes),
          dateISO: base.toISOString(),
          qrToken: token('QR-EMB', apptN),
          status: day < 0 ? (rng() < 0.72 ? 'attended' : 'expired') : 'booked',
          createdISO: new Date(base.getTime() - int(rng, 1, 4) * 864e5).toISOString(),
        });
      }
    }
  }

  /* ——— visitor economy: restaurants + paid day-passes (50 SAR / vehicle) ——— */
  const restaurants: Restaurant[] = [
    {
      id: 'rest-1',
      nameAr: 'مطعم الديوان',
      categoryAr: 'مأكولات سعودية',
      items: [
        { nameAr: 'كبسة لحم', price: 58 },
        { nameAr: 'جريش بالدجاج', price: 42 },
        { nameAr: 'مطازيز', price: 45 },
        { nameAr: 'قهوة سعودية وتمر', price: 18 },
      ],
    },
    {
      id: 'rest-2',
      nameAr: 'مقهى الياسمين',
      categoryAr: 'مقهى مختص',
      items: [
        { nameAr: 'لاتيه مختص', price: 22 },
        { nameAr: 'V60', price: 20 },
        { nameAr: 'كيك التمر', price: 26 },
        { nameAr: 'ماتشا بارد', price: 24 },
      ],
    },
    {
      id: 'rest-3',
      nameAr: 'بيت الباستا',
      categoryAr: 'إيطالي',
      items: [
        { nameAr: 'باستا ألفريدو', price: 54 },
        { nameAr: 'بيتزا مارغريتا', price: 48 },
        { nameAr: 'ريزوتو الفطر', price: 62 },
        { nameAr: 'تيراميسو', price: 28 },
      ],
    },
    {
      id: 'rest-4',
      nameAr: 'شاورما البوليفارد',
      categoryAr: 'وجبات سريعة',
      items: [
        { nameAr: 'شاورما عربي', price: 16 },
        { nameAr: 'صحن شاورما', price: 32 },
        { nameAr: 'بطاطس بالجبن', price: 14 },
        { nameAr: 'عصير ليمون نعناع', price: 12 },
      ],
    },
  ];

  const visitorPasses: VisitorPass[] = [];
  for (let i = 0; i < 22; i++) {
    const dayOffset = i < 5 ? 0 : -int(rng, 1, 6); // 5 passes today, rest across last week
    const day = new Date(Date.now() + dayOffset * 864e5);
    day.setHours(int(rng, 10, 21), 0, 0, 0);
    const orders: VisitorPass['orders'] = [];
    const orderCount = int(rng, 0, 3);
    for (let k = 0; k < orderCount; k++) {
      const r = pick(rng, restaurants);
      const item = pick(rng, r.items);
      orders.push({ restaurantId: r.id, itemAr: item.nameAr, price: item.price, qty: int(rng, 1, 2) });
    }
    const total = 50 + orders.reduce((a, o) => a + o.price * o.qty, 0);
    visitorPasses.push({
      id: `vp-${i + 1}`,
      visitorNameAr: arabicName(),
      phone: phone(),
      plate: plate(),
      dateISO: day.toISOString(),
      entryFee: 50,
      orders,
      totalPaid: total,
      qrToken: token('QR-VIS', i + 1),
      status: dayOffset < 0 ? (rng() < 0.85 ? 'used' : 'expired') : i % 2 === 0 ? 'paid' : 'used',
      createdISO: new Date(day.getTime() - int(rng, 2, 48) * 3600e3).toISOString(),
    });
  }

  /* ——— notifications at load ——— */
  const notifications: Notification[] = [
    { id: nanoid(8), toPersonaOrPerson: 'admin', titleAr: 'بلاغ تسرب مياه عاجل', bodyAr: 'حديقة الصدر — قيد التنفيذ منذ 30 ساعة', atISO: hoursAgo(3), read: false, deepLink: '/a/requests', severity: 'warn' },
    { id: nanoid(8), toPersonaOrPerson: 'security', titleAr: 'بلاغ نشط: مركبة مشتبه بها', bodyAr: `${formatTxn(431)} — بانتظار الإسناد`, atISO: minutesAgo(38), read: false, deepLink: '/s/incidents/inc-active', severity: 'warn' },
    { id: nanoid(8), toPersonaOrPerson: 'resident', titleAr: 'تحديث بلاغك: إنارة', bodyAr: 'تم إسناد بلاغ الإنارة للمقاول المختص', atISO: hoursAgo(20), read: true, deepLink: '/r/requests' },
  ];

  /* ——— 90-day metrics series: weekly seasonality (Fri/Sat dip), slow growth,
         response time improving, satisfaction climbing — real shape, not noise ——— */
  const metrics: DayMetric[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = new Date(Date.now() - d * 864e5);
    const dow = date.getDay(); // Saudi weekend: Fri(5) / Sat(6)
    const weekend = dow === 5 || dow === 6;
    const progress = (89 - d) / 89; // 0 → 1 across the window
    const growth = 1 + progress * 0.35;
    const gateBase = weekend ? 430 : 760;
    const gateAllowed = Math.round(gateBase * growth + (rng() - 0.5) * 90);
    metrics.push({
      dateISO: date.toISOString(),
      requestsOpened: Math.max(0, Math.round((weekend ? 3.5 : 6.5) * growth + (rng() - 0.5) * 4)),
      requestsClosed: Math.max(0, Math.round((weekend ? 3 : 6) * growth + (rng() - 0.5) * 4)),
      incidents: int(rng, 0, weekend ? 2 : 3),
      violations: int(rng, 0, weekend ? 1 : 3),
      gateAllowed,
      gateDenied: rng() < 0.55 ? int(rng, 0, 3) : 0,
      avgResponseSec: Math.round(470 - progress * 120 + (rng() - 0.5) * 60), // improving story
      satisfaction: +(4.0 + progress * 0.5 + (rng() - 0.5) * 0.2).toFixed(2),
    });
  }

  const settings: EscalationSettings = {
    ladder: [
      { step: 0, labelAr: 'إشعار', descriptionAr: 'إشعار المخالف بالمخالفة وتوثيقها' },
      { step: 1, labelAr: 'إنذار', descriptionAr: 'إنذار رسمي مع مهلة تصحيح' },
      { step: 2, labelAr: 'إيقاف التصريح', descriptionAr: 'تعليق تصريح الدخول المرتبط' },
      { step: 3, labelAr: 'إيقاف المركبة', descriptionAr: 'إيقاف مركبة المخالف مؤقتًا' },
      { step: 4, labelAr: 'منع مؤقت', descriptionAr: 'منع مؤقت من دخول الحي' },
      { step: 5, labelAr: 'ربط بوابي', descriptionAr: 'إنفاذ آلي عند البوابات — الرفض عند المسح' },
    ],
    graceDays: 3,
    suspendAtStep: 3,
    suspensionDays: 14,
    /* BR-182 · DEF-027 — جدول SLA كان معروضًا للقراءة ولا يقود شيئًا،
       وخيارات المهلة عند الإسناد ثابتة ولا علاقة لها به. الآن هو المصدر. */
    slaRules: [
      { kind: 'water_leak', priority: 'urgent', hours: 2 },
      { kind: 'water_leak', priority: 'high', hours: 4 },
      { kind: 'water_leak', priority: 'normal', hours: 8 },
      { kind: 'water_leak', priority: 'low', hours: 24 },
      { kind: 'safety', priority: 'urgent', hours: 2 },
      { kind: 'safety', priority: 'high', hours: 4 },
      { kind: 'safety', priority: 'normal', hours: 12 },
      { kind: 'safety', priority: 'low', hours: 24 },
      { kind: 'lighting', priority: 'urgent', hours: 8 },
      { kind: 'lighting', priority: 'high', hours: 12 },
      { kind: 'lighting', priority: 'normal', hours: 24 },
      { kind: 'lighting', priority: 'low', hours: 48 },
      { kind: 'waste', priority: 'urgent', hours: 4 },
      { kind: 'waste', priority: 'high', hours: 8 },
      { kind: 'waste', priority: 'normal', hours: 24 },
      { kind: 'waste', priority: 'low', hours: 48 },
      { kind: 'cleanliness', priority: 'urgent', hours: 6 },
      { kind: 'cleanliness', priority: 'high', hours: 12 },
      { kind: 'cleanliness', priority: 'normal', hours: 24 },
      { kind: 'cleanliness', priority: 'low', hours: 48 },
      { kind: 'maintenance', priority: 'urgent', hours: 4 },
      { kind: 'maintenance', priority: 'high', hours: 12 },
      { kind: 'maintenance', priority: 'normal', hours: 48 },
      { kind: 'maintenance', priority: 'low', hours: 72 },
      { kind: 'pavement', priority: 'urgent', hours: 12 },
      { kind: 'pavement', priority: 'high', hours: 24 },
      { kind: 'pavement', priority: 'normal', hours: 72 },
      { kind: 'pavement', priority: 'low', hours: 120 },
      { kind: 'tree', priority: 'urgent', hours: 12 },
      { kind: 'tree', priority: 'high', hours: 24 },
      { kind: 'tree', priority: 'normal', hours: 72 },
      { kind: 'tree', priority: 'low', hours: 120 },
      { kind: 'abandoned_vehicle', priority: 'urgent', hours: 12 },
      { kind: 'abandoned_vehicle', priority: 'high', hours: 24 },
      { kind: 'abandoned_vehicle', priority: 'normal', hours: 72 },
      { kind: 'abandoned_vehicle', priority: 'low', hours: 120 },
      { kind: 'visual_disorder', priority: 'urgent', hours: 24 },
      { kind: 'visual_disorder', priority: 'high', hours: 48 },
      { kind: 'visual_disorder', priority: 'normal', hours: 72 },
      { kind: 'visual_disorder', priority: 'low', hours: 120 },
      { kind: 'noise', priority: 'urgent', hours: 2 },
      { kind: 'noise', priority: 'high', hours: 6 },
      { kind: 'noise', priority: 'normal', hours: 24 },
      { kind: 'noise', priority: 'low', hours: 48 },
      { kind: 'traffic', priority: 'urgent', hours: 2 },
      { kind: 'traffic', priority: 'high', hours: 6 },
      { kind: 'traffic', priority: 'normal', hours: 24 },
      { kind: 'traffic', priority: 'low', hours: 48 },
    ],
  };

  return {
    people,
    properties,
    vehicles,
    permits,
    requests,
    violations,
    incidents,
    mahadir,
    gates,
    gateEvents,
    assets,
    sensorValues,
    bookings,
    eventRequests,
    lostFoundItems,
    shifts,
    checkpoints,
    checkpointScans,
    patrols,
    organizations: orgs,
    ads,
    appointments,
    restaurants,
    visitorPasses,
    embassyConfigs,
    notifications,
    metrics,
    settings,
    nextTxn: 432,
    currentUsers: { resident: residentHost.id, admin: adminStaff[0].id, security: supervisors[0].id },
    demoVehicleId: demoVehicle.id,
  };
}
