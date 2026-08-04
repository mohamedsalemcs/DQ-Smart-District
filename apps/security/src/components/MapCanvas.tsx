import type { ReactNode } from 'react';
import { project, VIEW } from '@dq/core';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string; // css color
  labelAr: string;
  pulse?: boolean;
  onClick?: () => void;
  glyph?: string; // single char
}

/** Static SVG of DQ with absolutely positioned markers — no map SDK (§1). */
export function MapCanvas({
  markers,
  dark = false,
  className = '',
  children,
}: {
  markers: MapMarker[];
  dark?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const bg = dark ? '#0a443e' : '#e4eaea';
  const land = dark ? '#16283F' : '#f8fafa';
  const green = dark ? '#1E3A31' : '#e7f5ed';
  const road = dark ? 'var(--color-viz-1)' : '#FFFFFF';
  const label = dark ? 'var(--color-viz-5)' : '#9AA8B8';

  return (
    <div className={`relative overflow-hidden rounded-card ${className}`} style={{ background: bg }}>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="h-full w-full" role="img" aria-label="خريطة الحي الدبلوماسي">
        {/* wadi curve (Wadi Hanifa side) */}
        <path d={`M 0 ${VIEW.h * 0.88} C ${VIEW.w * 0.25} ${VIEW.h * 0.7}, ${VIEW.w * 0.2} ${VIEW.h * 0.45}, ${VIEW.w * 0.05} ${VIEW.h * 0.2} L 0 0 L 0 ${VIEW.h} Z`} fill={dark ? '#0A1420' : '#cbd5d5'} />
        {/* district body */}
        <path
          d={`M ${VIEW.w * 0.1} ${VIEW.h * 0.12} L ${VIEW.w * 0.92} ${VIEW.h * 0.06} L ${VIEW.w * 0.96} ${VIEW.h * 0.55} L ${VIEW.w * 0.78} ${VIEW.h * 0.95} L ${VIEW.w * 0.28} ${VIEW.h * 0.92} L ${VIEW.w * 0.12} ${VIEW.h * 0.6} Z`}
          fill={land}
          stroke={dark ? 'var(--color-viz-1)' : '#D2DBE4'}
          strokeWidth="2"
        />
        {/* garden blobs */}
        <ellipse cx={VIEW.w * 0.38} cy={VIEW.h * 0.32} rx="70" ry="44" fill={green} />
        <ellipse cx={VIEW.w * 0.66} cy={VIEW.h * 0.62} rx="88" ry="52" fill={green} />
        <ellipse cx={VIEW.w * 0.3} cy={VIEW.h * 0.72} rx="52" ry="36" fill={green} />
        <ellipse cx={VIEW.w * 0.82} cy={VIEW.h * 0.25} rx="46" ry="34" fill={green} />
        {/* ring road */}
        <path
          d={`M ${VIEW.w * 0.2} ${VIEW.h * 0.22} C ${VIEW.w * 0.5} ${VIEW.h * 0.08}, ${VIEW.w * 0.85} ${VIEW.h * 0.15}, ${VIEW.w * 0.88} ${VIEW.h * 0.5} C ${VIEW.w * 0.9} ${VIEW.h * 0.8}, ${VIEW.w * 0.55} ${VIEW.h * 0.9}, ${VIEW.w * 0.32} ${VIEW.h * 0.82} C ${VIEW.w * 0.16} ${VIEW.h * 0.72}, ${VIEW.w * 0.14} ${VIEW.h * 0.4}, ${VIEW.w * 0.2} ${VIEW.h * 0.22} Z`}
          fill="none"
          stroke={road}
          strokeWidth="10"
          opacity={dark ? 0.5 : 1}
        />
        <path d={`M ${VIEW.w * 0.2} ${VIEW.h * 0.52} L ${VIEW.w * 0.88} ${VIEW.h * 0.44}`} stroke={road} strokeWidth="7" opacity={dark ? 0.4 : 0.9} />
        <path d={`M ${VIEW.w * 0.52} ${VIEW.h * 0.1} L ${VIEW.w * 0.48} ${VIEW.h * 0.88}`} stroke={road} strokeWidth="7" opacity={dark ? 0.4 : 0.9} />
        <text x={VIEW.w * 0.07} y={VIEW.h * 0.5} fill={label} fontSize="18" transform={`rotate(-72 ${VIEW.w * 0.07} ${VIEW.h * 0.5})`}>وادي حنيفة</text>

        {markers.map((m) => {
          const { x, y } = project(m.lat, m.lng);
          return (
            <g key={m.id} transform={`translate(${x} ${y})`} onClick={m.onClick} style={{ cursor: m.onClick ? 'pointer' : 'default' }}>
              <title>{m.labelAr}</title>
              {m.pulse && <circle r="14" fill={m.color} opacity="0.25" className="pulse-dot" />}
              <circle r="8" fill={m.color} stroke={dark ? '#0a443e' : '#fff'} strokeWidth="2.5" />
              {m.glyph && (
                <text y="3.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
                  {m.glyph}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {children}
    </div>
  );
}
