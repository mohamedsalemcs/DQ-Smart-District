import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from '@dq/ui';
import type { Map3DProps, TwinLayers } from './TwinCanvas';

/* ═══════════════════════════════════════════════════════════════════════
   حدّ التحميل الكسول للتوأم الرقمي.

   PERF — `TwinCanvas` يجرّ three.js و@react-three/drei وthree-mesh-bvh
   (~1.2MB مصغّرة) ويطلب نموذج المدينة بحجم 10.5MB فور تقييم الوحدة.
   استيراده استيرادًا ساكنًا من لوحة القيادة كان يُدخل ذلك كلَّه في الحزمة
   الأولى للمنصة ويُلغي مفعول `lazy` الموضوع على شاشة التوأم في المسيّر.

   هذا الملف يحتفظ بالمسار نفسه ويعرض الواجهة نفسها — فلا تتغيّر مواضع
   الاستدعاء — لكنه لا يستورد المشهد إلا لحظةَ ظهور خريطة على الشاشة.
   ═══════════════════════════════════════════════════════════════════════ */

export type { TwinLayers, Map3DProps };

const Map3DInner = lazy(() =>
  import('./TwinCanvas').then((m) => ({ default: m.Map3DInner })),
);

const TwinCanvasInner = lazy(() =>
  import('./TwinCanvas').then((m) => ({ default: m.DQTwinCanvas })),
);

function MapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-card bg-[#07302b] ${className}`}
    >
      <p dir="rtl" className="text-caption font-semibold text-white/70">
        جارٍ تحميل نموذج الحي ثلاثي الأبعاد…
      </p>
    </div>
  );
}

/** PERF — الخرائط المضمّنة تقع تحت الطيّة في أغلب الشاشات. لا تُطلب حزمة three
 *  ولا نموذج المدينة إلا حين تقترب مساحة الخريطة من نافذة العرض. */
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  return { ref, near };
}

/**
 * TD-10 — الخريطة محاطة بحد خطأ.
 * فشل تحميل نموذج 3D كان يُسقط التطبيق كله إلى شاشة بيضاء؛
 * الآن يبقى الفشل محصورًا في مساحة الخريطة وحدها.
 */
export function Map3D(props: Map3DProps) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const className = props.className ?? 'aspect-[16/9]';

  return (
    <div ref={ref}>
      <ErrorBoundary labelAr="الخريطة ثلاثية الأبعاد" compact>
        {near ? (
          <Suspense fallback={<MapSkeleton className={className} />}>
            <Map3DInner {...props} />
          </Suspense>
        ) : (
          <MapSkeleton className={className} />
        )}
      </ErrorBoundary>
    </div>
  );
}

export function DQTwinCanvas(props: {
  layers: TwinLayers;
  autoRotate: boolean;
  onOpen: (link: string) => void;
}) {
  return (
    <ErrorBoundary labelAr="الخريطة ثلاثية الأبعاد" compact>
      <Suspense fallback={<MapSkeleton className="h-full w-full" />}>
        <TwinCanvasInner {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
