import { useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Coins,
  Cog,
  FileWarning,
  Gavel,
  Handshake,
  Landmark,
  LayoutDashboard,
  Leaf,
  Orbit,
  Route,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { AppShell, NotificationsBell, SpeedToggle, ToastHost, type NavItem } from '@dq/ui';
import { ago, useStore } from '@dq/core';
import { useI18n } from './i18n';

/** مبدّل اللغة — العربية افتراضية · CFL-03 */
function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t('language')}
      className="flex items-center rounded-[--radius-pill] bg-ink-50 p-0.5"
    >
      {(['ar', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`plate rounded-[--radius-pill] px-2.5 py-1 text-[--text-micro] font-bold uppercase transition-colors ${
            lang === l ? 'bg-ink-0 text-brand-700 shadow-e1' : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function AdminShell() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  /* محدِّدات ذرّية — لا useStore() عاريًا (DEF-035) */
  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const notifications = useStore((s) => s.notifications);
  const currentUsers = useStore((s) => s.currentUsers);
  const markAllRead = useStore((s) => s.markAllRead);
  const markRead = useStore((s) => s.markRead);
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);
  const demoSpeed = useStore((s) => s.demoSpeed);
  const setDemoSpeed = useStore((s) => s.setDemoSpeed);

  if (persona !== 'admin') setPersona('admin');

  const myNotifications = useMemo(() => {
    const me = currentUsers.admin;
    return notifications.filter((n) => n.toPersonaOrPerson === 'admin' || n.toPersonaOrPerson === me);
  }, [notifications, currentUsers]);

  const nav: NavItem[] = [
    { to: '/', labelAr: t('navDashboard'), icon: LayoutDashboard, end: true, groupAr: 'تشخيص' },
    { to: '/twin', labelAr: t('navTwin'), icon: Orbit },
    { to: '/requests', labelAr: t('navRequests'), icon: ClipboardList, groupAr: 'تصريف الطوابير' },
    { to: '/permits', labelAr: t('navPermits'), icon: ShieldCheck },
    { to: '/violations', labelAr: t('navViolations'), icon: FileWarning, groupAr: 'إنفاذ' },
    { to: '/appeals', labelAr: t('navAppeals'), icon: Gavel },
    { to: '/embassies', labelAr: t('navEmbassies'), icon: Landmark },
    { to: '/operations', labelAr: t('navOperations'), icon: Wrench, groupAr: 'تشغيل' },
    { to: '/sustainability', labelAr: t('navSustainability'), icon: Leaf },
    { to: '/mobility', labelAr: t('navMobility'), icon: Route },
    { to: '/contracts', labelAr: t('navContracts'), icon: Handshake },
    { to: '/events', labelAr: t('navEvents'), icon: CalendarDays },
    { to: '/people', labelAr: t('navPeople'), icon: Users, groupAr: 'سجلات' },
    { to: '/revenue', labelAr: t('navRevenue'), icon: Coins },
    { to: '/reports', labelAr: t('navReports'), icon: BarChart3 },
    { to: '/settings', labelAr: t('navSettings'), icon: Cog, groupAr: 'حوكمة' },
  ];

  return (
    <>
      <AppShell
        nav={nav}
        density="compact"
        portalNameAr={t('portal')}
        portalNameEn="COMMAND CENTER"
        isActive={(i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))}
        renderLink={(item, cls, children) => (
          <NavLink to={item.to} end={item.end} className={cls}>
            {children}
          </NavLink>
        )}
        headerEnd={
          <>
            <SpeedToggle speed={demoSpeed} onToggle={() => setDemoSpeed(demoSpeed === 1 ? 10 : 1)} />
            <LangToggle />
            <NotificationsBell
              items={myNotifications}
              relTime={ago}
              onMarkAllRead={() => markAllRead('admin')}
              onOpen={(n) => {
                markRead(n.id);
                navigate(n.deepLink);
              }}
              labelAr={t('notifications')}
              emptyAr={t('noNotifications')}
              markAllAr={t('markAllRead')}
            />
            <span className="hidden items-center gap-2 border-s border-ink-100 ps-3 md:flex">
              <span className="flex size-8 items-center justify-center rounded-[--radius-pill] bg-brand-50 text-[--text-micro] font-bold text-brand-700">
                <Building2 size={15} aria-hidden />
              </span>
              <span className="text-[--text-micro] font-semibold text-ink-700">إدارة الحي</span>
            </span>
          </>
        }
      >
        <Outlet />
      </AppShell>
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
