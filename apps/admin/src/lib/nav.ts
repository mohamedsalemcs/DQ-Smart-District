import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveLink } from '@dq/core';

/**
 * التنقّل الموحّد لهذه المنصة.
 *
 * كل رابط يمرّ من هنا: الروابط التي تخصّ هذه المنصة تُمرَّر إلى المسيّر،
 * والتي تخصّ منصة أخرى تُفتح بتحميل صفحة كامل لأنها خلف قاعدة نشر مختلفة.
 * البادئة القديمة (`/` · `/s` · `/r`) تُفهم هنا ولا تصل إلى المسيّر أبدًا.
 */
export function useGo() {
  const navigate = useNavigate();
  return useCallback(
    (link: string) => {
      const r = resolveLink(link, 'a');
      if (r.kind === 'internal') navigate(r.to);
      else window.location.assign(r.href);
    },
    [navigate],
  );
}
