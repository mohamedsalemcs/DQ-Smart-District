/** DQ bounding box — matches the georeferenced 3D model export exactly
 *  (maps3d metadata: SW 46.61455,24.66731 → NE 46.64087,24.69421),
 *  so the 2D SVG map and the 3D digital twin share one coordinate space. */
export const BOUNDS = {
  latMin: 24.66731,
  latMax: 24.69421,
  lngMin: 46.61455,
  lngMax: 46.64087,
};

export const VIEW = { w: 1000, h: 700 };

export function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * VIEW.w;
  const y = ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * VIEW.h;
  return { x, y };
}

/** the district footprint polygon from the 3D export (lng,lat) — the model is NOT the full bbox */
export const DISTRICT_POLYGON: [number, number][] = [
  [46.62928, 24.69421],
  [46.61455, 24.68769],
  [46.62201, 24.66731],
  [46.63387, 24.67118],
  [46.64087, 24.6767],
];

export const DISTRICT_CENTER = { lat: 24.6805, lng: 46.6265 };

export function inDistrict(lat: number, lng: number): boolean {
  let inside = false;
  const poly = DISTRICT_POLYGON;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** pull a point toward the district centre until it sits on the model */
export function clampToDistrict(lat: number, lng: number) {
  let cLat = lat;
  let cLng = lng;
  for (let i = 0; i < 40 && !inDistrict(cLat, cLng); i++) {
    cLat += (DISTRICT_CENTER.lat - cLat) * 0.12;
    cLng += (DISTRICT_CENTER.lng - cLng) * 0.12;
  }
  return { lat: cLat, lng: cLng };
}

/** random-ish point inside the district polygon for seeding */
export function districtPoint(rx: number, ry: number) {
  return clampToDistrict(
    BOUNDS.latMin + 0.003 + ry * (BOUNDS.latMax - BOUNDS.latMin - 0.006),
    BOUNDS.lngMin + 0.003 + rx * (BOUNDS.lngMax - BOUNDS.lngMin - 0.006),
  );
}

export function distance(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}
