import { useEffect, useRef, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BOUNDS, DISTRICT_POLYGON } from '@dq/core';

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

const DQ_BOUNDS = L.latLngBounds([BOUNDS.latMin, BOUNDS.lngMin], [BOUNDS.latMax, BOUNDS.lngMax]);

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const PIN_CSS = `
.dq-pin-icon { background: transparent; border: none; }
.dq-pin { position: relative; width: 18px; height: 18px; }
.dq-pin-dot {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  border-radius: 9999px; background: var(--pin); border: 2.5px solid #fff;
  color: #fff; font-size: 9px; font-weight: 700; line-height: 1;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
}
.dq-pin-pulse {
  position: absolute; inset: -7px; border-radius: 9999px; background: var(--pin); opacity: 0.25;
}
`;

/** Real Leaflet map of the Riyadh Diplomatic Quarter (CARTO/OSM tiles) — same lat/lng space as the 3D twin. */
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
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const pinsRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, {
      minZoom: 13,
      maxZoom: 18,
      maxBounds: DQ_BOUNDS.pad(0.5),
      maxBoundsViscosity: 0.8,
      zoomControl: true,
    });
    map.attributionControl.setPrefix(false);
    map.fitBounds(DQ_BOUNDS, { padding: [4, 4] });
    tilesRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map);
    L.polygon(
      DISTRICT_POLYGON.map(([lng, lat]) => [lat, lng] as [number, number]),
      { color: 'var(--color-brand-500, #0e7490)', weight: 2, dashArray: '6 4', fill: false, interactive: false },
    ).addTo(map);
    pinsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      tilesRef.current = null;
      pinsRef.current = null;
    };
  }, []);

  useEffect(() => {
    tilesRef.current?.setUrl(dark ? TILES.dark : TILES.light);
  }, [dark]);

  useEffect(() => {
    const pins = pinsRef.current;
    if (!pins) return;
    pins.clearLayers();
    for (const m of markers) {
      const icon = L.divIcon({
        className: 'dq-pin-icon',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        html: `<div class="dq-pin" style="--pin:${m.color}">${m.pulse ? '<span class="dq-pin-pulse pulse-dot"></span>' : ''}<span class="dq-pin-dot">${m.glyph ?? ''}</span></div>`,
      });
      const marker = L.marker([m.lat, m.lng], { icon, title: m.labelAr, keyboard: false });
      if (m.onClick) marker.on('click', m.onClick);
      pins.addLayer(marker);
    }
  }, [markers]);

  return (
    <div className={`relative isolate overflow-hidden rounded-card ${className}`}>
      <style>{PIN_CSS}</style>
      <div ref={elRef} className="absolute inset-0" role="application" aria-label="خريطة الحي الدبلوماسي" />
      {children}
    </div>
  );
}
