/** روابط منصة السكان — تُخدم على المسار القاعدي /portal، وفي التطوير على منفذ 3003 المستقل */
export function portalUrl(path: string) {
  const origin = import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3003`
    : window.location.origin;
  return `${origin}/portal${path}`;
}
