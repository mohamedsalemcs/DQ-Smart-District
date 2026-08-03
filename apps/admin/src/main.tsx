import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { useStore } from '@dq/core';
import './styles.css';
import { router } from './router';
import { I18nProvider } from './i18n';

/**
 * نبضة المنظومة — كل 3 ثوانٍ (300ms في وضع العرض 10×).
 * تحرّك المستشعرات والدوريات، وتُنهي الإيقافات المنقضية (BR-121 · DEF-001)،
 * وتعلّم تجاوزات SLA حال حدوثها (BR-054 · DEF-011).
 */
function Ticker() {
  const tick = useStore((s) => s.tickSensors);
  const speed = useStore((s) => s.demoSpeed);
  useEffect(() => {
    const id = setInterval(tick, 3000 / speed);
    return () => clearInterval(id);
  }, [tick, speed]);
  return null;
}

function Root() {
  return (
    <>
      <Ticker />
      <RouterProvider router={router} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Root />
    </I18nProvider>
  </StrictMode>,
);
