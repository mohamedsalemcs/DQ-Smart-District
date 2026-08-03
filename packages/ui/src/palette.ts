/**
 * جسر اللوحة — القيم الحرفية للسياقات التي لا تقرأ متغيّرات CSS.
 * ─────────────────────────────────────────────────────────────────
 * three.js و canvas 2D و بعض خصائص Recharts تحتاج قيمة لونية حرفية،
 * ولا تستطيع قراءة var(--color-…). هذا الملف هو المنفذ الوحيد المسموح
 * لتلك القيم، ويجب أن يبقى مطابقًا لـ tokens.css حرفًا بحرف.
 *
 * أي لون سداسي في مكوّن خارج هذا الملف = مخالفة للمعيار CS-01.
 */

export const PALETTE = {
  brand50: '#ecf7f5',
  brand100: '#d0ede8',
  brand200: '#a3dbd3',
  brand300: '#6bc2b7',
  brand400: '#38a296',
  brand500: '#178578',
  brand600: '#0e6a60',
  brand700: '#0b554d',
  brand800: '#0a443e',
  brand900: '#07302b',

  ink0: '#ffffff',
  ink25: '#f8fafa',
  ink50: '#f1f5f5',
  ink100: '#e4eaea',
  ink200: '#cbd5d5',
  ink300: '#a4b3b3',
  ink400: '#7b8c8c',
  ink500: '#5c6d6d',
  ink600: '#465555',
  ink700: '#33403f',
  ink800: '#1f2a29',
  ink900: '#141c1b',

  ok50: '#e7f5ed',
  ok300: '#4fbe85',
  ok500: '#0e7c4a',
  ok600: '#0a6139',

  warn50: '#fdf2e3',
  warn300: '#e8a94a',
  warn500: '#9a5b0a',
  warn600: '#7a4708',

  danger50: '#fcecea',
  danger300: '#f0897f',
  danger500: '#a82a22',
  danger600: '#871e18',

  info50: '#eaf1fa',
  info300: '#79ace4',
  info500: '#1f5fa8',
  info600: '#194b85',
} as const;

/** سلسلة تصوير البيانات — متمايزة إدراكيًا، مختبَرة لعمى الألوان */
export const VIZ = [
  PALETTE.brand600,
  PALETTE.info500,
  PALETTE.ok500,
  PALETTE.danger500,
  PALETTE.brand300,
  PALETTE.warn500,
] as const;

/** ألوان مشهد التوأم الرقمي — WebGL يحتاج قيمًا حرفية */
export const SCENE = {
  ground: PALETTE.ink100,
  groundEdge: PALETTE.ink200,
  building: PALETTE.ink200,
  buildingAlt: PALETTE.ink300,
  road: PALETTE.ink400,
  water: PALETTE.info300,
  green: PALETTE.ok300,
  sky: PALETTE.ink25,

  /* طبقات حية */
  traffic: PALETTE.warn500,
  patrol: PALETTE.brand600,
  patrolBusy: PALETTE.warn500,
  incident: PALETTE.danger500,
  gate: PALETTE.brand700,
  asset: PALETTE.brand400,
  assetAlert: PALETTE.warn500,
  request: PALETTE.info500,
  violation: PALETTE.danger600,
  checkpoint: PALETTE.brand300,

  /* العقارات حسب النوع */
  villa: PALETTE.brand500,
  apartment: PALETTE.info500,
  commercial: PALETTE.warn500,
  embassy: PALETTE.brand700,
  facility: PALETTE.ok500,
  suspended: PALETTE.danger500,

  /* التمييز والتحديد */
  highlight: PALETTE.brand400,
  selected: PALETTE.brand600,
} as const;
