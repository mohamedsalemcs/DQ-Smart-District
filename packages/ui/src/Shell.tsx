import { useEffect, useState, type ReactNode } from 'react';
import { Menu, X, type LucideIcon } from 'lucide-react';
import { LogoMark } from './Logo';

/* ═══════════════════════════════════════════════════════════════════════
   غلاف المنصة — مشترك بين البوابات الثلاث، مع فارق الكثافة فقط.
   ثيم فاتح موحّد. الشخصية تُعرف بالإيقاع والكثافة لا بلون مختلف.
   ═══════════════════════════════════════════════════════════════════════ */

export interface NavItem {
  to: string;
  labelAr: string;
  icon: LucideIcon;
  end?: boolean;
  descAr?: string;
  /** فاصل مجموعة يظهر فوق هذا العنصر — يعالج UX-01 (13 عنصرًا مسطّحًا) */
  groupAr?: string;
}

export type Density = 'comfortable' | 'compact';

interface ShellProps {
  nav: NavItem[];
  /** يقرر أي رابط نشط — يُمرَّر من التطبيق ليبقى الغلاف بلا تبعية للراوتر */
  isActive: (item: NavItem) => boolean;
  /** عنصر الرابط — يمرره التطبيق (NavLink) */
  renderLink: (item: NavItem, className: string, children: ReactNode) => ReactNode;
  portalNameAr: string;
  portalNameEn?: string;
  density?: Density;
  headerEnd?: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
  maxWidth?: number;
}

export function AppShell({
  nav,
  isActive,
  renderLink,
  portalNameAr,
  portalNameEn,
  density = 'comfortable',
  headerEnd,
  children,
  extra,
  maxWidth = 1440,
}: ShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  /* يغلق الدرج عند تغيّر المسار — بلا تبعية للراوتر */
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  const pad = density === 'compact' ? 'p-4 lg:p-5' : 'p-4 lg:p-6';

  return (
    <div className="min-h-screen bg-ink-25 text-ink-800">
      {/* رابط التخطي — أول عنصر في ترتيب التركيز (WCAG 2.4.1) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[70] focus:rounded-[--radius-ctl] focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-ink-0"
      >
        تخطي إلى المحتوى
      </a>

      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-ink-100 bg-ink-0/95 px-4 backdrop-blur">
        <button
          className="rounded-[--radius-ctl] p-2 text-ink-600 hover:bg-ink-50 lg:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="القائمة"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>

        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <div className="hidden leading-tight sm:block">
            <p className="text-[--text-caption] font-bold text-ink-900">{portalNameAr}</p>
            {portalNameEn && (
              <p className="plate text-[--text-micro] font-semibold tracking-[0.1em] text-brand-600">
                {portalNameEn}
              </p>
            )}
          </div>
        </div>

        <div className="ms-auto flex items-center gap-1.5">{headerEnd}</div>
      </header>

      <div className="flex">
        {/* الحاجب — يظهر مع الدرج على الشاشات الصغيرة */}
        {menuOpen && (
          <div
            className="fixed inset-0 top-[60px] z-20 bg-ink-900/30 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
        )}

        <nav
          aria-label="التنقل الرئيسي"
          className={`fixed inset-y-0 top-[60px] z-20 w-[240px] shrink-0 overflow-y-auto border-e border-ink-100 bg-ink-0 p-3 thin-scroll transition-transform
            lg:sticky lg:h-[calc(100vh-60px)] lg:translate-x-0
            ${menuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
        >
          {nav.map((item) => {
            const active = isActive(item);
            const cls = `flex items-center gap-2.5 rounded-[--radius-ctl] px-3 py-2.5 text-[--text-caption] font-medium transition-colors ${
              active
                ? 'bg-brand-600 text-ink-0 font-semibold shadow-e1'
                : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900'
            }`;
            return (
              <div key={item.to}>
                {/* مجموعات معنونة بدل 13 عنصرًا مسطّحًا (UX-01) */}
                {item.groupAr && (
                  <p className="mb-1.5 mt-4 px-3 text-[--text-micro] font-bold uppercase tracking-wider text-ink-400 first:mt-0">
                    {item.groupAr}
                  </p>
                )}
                <div onClick={() => setMenuOpen(false)}>
                  {renderLink(
                    item,
                    cls,
                    <>
                      <item.icon size={17} aria-hidden />
                      <span className="truncate">{item.labelAr}</span>
                    </>,
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        <main id="main" className={`min-w-0 flex-1 ${pad}`}>
          <div className="mx-auto w-full" style={{ maxWidth }}>
            {children}
          </div>
        </main>
      </div>

      {extra}
    </div>
  );
}
