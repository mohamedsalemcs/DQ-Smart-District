import type {
  AssetKind,
  EventMinistry,
  EventPartyKind,
  EventRequesterKind,
  IncidentKind,
  IncidentStatus,
  PermitKind,
  PermitStatus,
  RequestKind,
  RequestStatus,
  ViolationStatus,
} from '../types';

/** All UI strings live here (English retrofit stays cheap). */

export const permitKindAr: Record<PermitKind, string> = {
  visitor: 'زائر',
  domestic_worker: 'عمالة منزلية',
  service_provider: 'مزوّد خدمة',
  school_driver: 'سائق مدرسة',
  event: 'فعالية',
  event_vendor: 'عارض فعالية',
};

export const permitStatusAr: Record<PermitStatus, string> = {
  draft: 'مسودة',
  pending: 'قيد الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  suspended: 'موقوف',
  expired: 'منتهي',
  cancelled: 'ملغى',
};

export const requestKindAr: Record<RequestKind, string> = {
  maintenance: 'صيانة',
  cleanliness: 'نظافة',
  water_leak: 'تسرب مياه',
  lighting: 'إنارة',
  pavement: 'أرصفة',
  tree: 'أشجار وتشجير',
  waste: 'نفايات',
  abandoned_vehicle: 'مركبة مهملة',
  visual_disorder: 'تشوه بصري',
  noise: 'إزعاج',
  traffic: 'مروري',
  safety: 'سلامة',
};

export const requestStatusAr: Record<RequestStatus, string> = {
  new: 'جديد',
  triaged: 'مصنّف',
  assigned: 'مُسند',
  in_progress: 'قيد التنفيذ',
  awaiting_verification: 'بانتظار التحقق',
  closed: 'مغلق',
  reopened: 'أعيد فتحه',
  rejected: 'مرفوض',
};

export const violationStatusAr: Record<ViolationStatus, string> = {
  open: 'مفتوحة',
  notified: 'تم الإشعار',
  grace: 'مهلة تصحيح',
  escalated: 'مصعّدة',
  appealed: 'قيد التظلّم',
  remediated: 'تم التصحيح',
  closed: 'مغلقة',
  cancelled: 'ملغاة (قُبل التظلّم)',
};

export const incidentKindAr: Record<IncidentKind, string> = {
  suspicious_person: 'شخص مشتبه به',
  suspicious_vehicle: 'مركبة مشتبه بها',
  gathering: 'تجمهر',
  nuisance: 'إزعاج',
  traffic_accident: 'حادث مروري',
  altercation: 'مشاجرة',
  access_violation: 'تجاوز دخول',
  suspicious_object: 'جسم مشتبه به',
  lost_property: 'مفقودات',
  medical: 'حالة طبية',
  fire: 'حريق',
  device_fault: 'عطل جهاز',
};

export const incidentStatusAr: Record<IncidentStatus, string> = {
  open: 'مفتوح',
  dispatched: 'تم الإسناد',
  on_scene: 'في الموقع',
  pending_mahdar: 'بانتظار المحضر',
  pending_approval: 'بانتظار الاعتماد',
  closed: 'مغلق',
  closed_no_action: 'أُغلق بلا إجراء',
};

export const eventRequesterAr: Record<EventRequesterKind, string> = {
  embassy: 'سفارة',
  resident: 'مقيم',
  commercial: 'منشأة تجارية',
  school: 'مدرسة',
  government: 'جهة حكومية',
};

export const eventPartyAr: Record<EventPartyKind, string> = {
  district_security: 'أمن الحي',
  police: 'الشرطة',
  traffic_police: 'المرور',
  civil_defense: 'الدفاع المدني',
  red_crescent: 'الهلال الأحمر',
  municipality: 'الأمانة',
};

export const eventRequestStatusAr = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
} as const;

export const eventMinistryAr: Record<EventMinistry, string> = {
  interior: 'وزارة الداخلية',
  foreign_affairs: 'وزارة الخارجية',
};

export const eventApprovalStatusAr = {
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
} as const;

export const severityAr = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  critical: 'حرجة',
} as const;

export const priorityAr = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
} as const;

export const assetKindAr: Record<AssetKind, string> = {
  bin: 'حاوية نفايات',
  irrigation_tank: 'خزان ري',
  light_pole: 'عمود إنارة',
  pump: 'مضخة',
  restroom: 'دورة مياه',
  court: 'ملعب',
  garden: 'حديقة',
  tree: 'شجرة — مستشعر ري',
};

export const propertyTypeAr = {
  villa: 'فيلا',
  apartment: 'شقة',
  commercial: 'تجاري',
  embassy: 'سفارة',
  facility: 'مرفق',
} as const;

export const roleAr = {
  owner: 'مالك',
  tenant: 'مستأجر',
  resident: 'مقيم',
  company_rep: 'ممثل شركة',
  embassy_rep: 'ممثل سفارة',
  guard: 'حارس أمن',
  supervisor: 'مشرف أمن',
  admin_staff: 'موظف إدارة',
  inspector: 'مفتش',
  driver: 'سائق',
} as const;

export const gateDecisionAr = {
  allowed: 'مسموح',
  denied: 'مرفوض',
  escalated: 'تصعيد',
} as const;

export const accessStateAr = {
  allowed: 'مسموح',
  suspended: 'موقوف',
  blocked: 'محظور',
} as const;

export const personaAr = {
  resident: 'المقيم',
  admin: 'الإدارة',
  security: 'الأمن',
} as const;

export const t = {
  appName: 'الحي الدبلوماسي الذكي',
  search: 'بحث',
  save: 'حفظ',
  cancel: 'إلغاء',
  confirm: 'تأكيد',
  close: 'إغلاق',
  details: 'التفاصيل',
  all: 'الكل',
  none: '—',
  newItem: 'جديد',
  submit: 'إرسال',
  approve: 'اعتماد',
  reject: 'رفض',
  requestInfo: 'طلب معلومات',
  auditTrail: 'سجل التدقيق',
  timeline: 'الخط الزمني',
  notifications: 'الإشعارات',
  markAllRead: 'تعليم الكل كمقروء',
  emptyNotifications: 'لا توجد إشعارات',
  demoHarness: 'أداة العرض — تبديل الشخصية',
  emergency: 'طوارئ',
  txnNo: 'رقم المعاملة',
  status: 'الحالة',
  actions: 'إجراءات',
} as const;
