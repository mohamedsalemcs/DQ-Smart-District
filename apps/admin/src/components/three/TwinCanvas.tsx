import { Suspense, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { useStore } from '@dq/core';
import { BOUNDS } from '@dq/core';
import { setRoadNetwork } from '../../lib/roadGraph';
import { incidentKindAr, propertyTypeAr, requestKindAr } from '@dq/core';
import { ago } from '@dq/core';

/* BVH-accelerated raycasting — terrain snapping stays cheap on a ~10MB city mesh */
/* eslint-disable @typescript-eslint/no-explicit-any */
(THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
(THREE.Mesh.prototype as any).raycast = acceleratedRaycast;

// المسار القاعدي يختلف بين المنصات (/dashboard/ · /ops/) — الأصول تُطلب نسبةً إليه
// لا من جذر النطاق، وإلا فشل التحميل بـ404 خارج بيئة التطوير الجذرية.
const ASSET_BASE = import.meta.env.BASE_URL;
const MODEL_URL = `${ASSET_BASE}3d/dq.glb`;
const ROAD_URL = `${ASSET_BASE}3d/road.glb`; // تصدير الطرق وحدها — يقود خريطة حرارة المرور
useGLTF.preload(MODEL_URL);
useGLTF.preload(ROAD_URL);

/* ————— geo → model-space projection (model bbox ⇄ metadata geo bounds) ————— */

interface Projector {
  toXZ: (lat: number, lng: number) => [number, number];
  groundY: (x: number, z: number) => number;
  size: number;

  min: { x: number; z: number };
  span: { x: number; z: number };
}

const ProjectorCtx = createContext<Projector | null>(null);
const useProjector = () => useContext(ProjectorCtx)!;

export interface TwinLayers {
  traffic: boolean;
  patrols: boolean;
  bins: boolean;
  lamps: boolean;
  tanks: boolean;
  trees: boolean;
  incidents: boolean;
  gates: boolean;
  requests: boolean;
  violations: boolean;
  checkpoints: boolean;
  properties: boolean;
  landmarks: boolean;
}

export const noLayers: TwinLayers = {
  traffic: false,
  patrols: false,
  bins: false,
  lamps: false,
  tanks: false,
  trees: false,
  incidents: false,
  gates: false,
  requests: false,
  violations: false,
  checkpoints: false,
  properties: false,
  landmarks: false,
};

interface HoverInfo {
  pos: [number, number, number];
  title: string;
  sub?: string;
}

/* ————— the model ————— */

/* Terrain height grid: built once per browser session (BVH raycast sweep), then cached
 * in sessionStorage — every later mount/page-load answers groundY with a bilinear lookup
 * instead of raycasting a ~10MB mesh. Keeps dashboards with embedded 3D maps snappy. */
const GRID_W = 96;
const GRID_H = 108;
const GRID_KEY = 'dq-heightgrid-v4'; // bump when the GLB is replaced — busts the cached terrain
let heightGridCache: Float32Array | null = null;
let heightGridPending: Promise<Float32Array> | null = null;

/* PERF — يسلّم الخيط الرئيسي للمتصفح بين الدفعات.
 * MessageChannel تتجاوز حد الـ4ms المفروض على setTimeout(0) المتداخل،
 * فالتنازل يكلّف أقل من مللي ثانية بدل أربعة. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => {
      ch.port1.close();
      resolve();
    };
    ch.port2.postMessage(null);
  });
}

/* PERF · «الصفحة لا تستجيب» — بناء شجرة BVH لمِشّ بمليون مثلث ثم 10,368 إسقاط
 * شعاعي كان يجري دفعة واحدة على الخيط الرئيسي، فيجمّد اللسان ثوانيَ ويستدعي
 * تحذير المتصفح. الآن العمل مقطّع ويتنازل بين الدفعات: الإطار يظل يُرسم. */
function buildHeightGrid(scene: THREE.Object3D, box: THREE.Box3): Promise<Float32Array> {
  if (heightGridCache) return Promise.resolve(heightGridCache);
  try {
    const stored = sessionStorage.getItem(GRID_KEY);
    if (stored) {
      heightGridCache = new Float32Array(JSON.parse(stored));
      return Promise.resolve(heightGridCache);
    }
  } catch { /* ignore */ }

  // خرائط متعددة على نفس الصفحة تتشارك عمليةَ بناء واحدة
  if (heightGridPending) return heightGridPending;

  heightGridPending = (async () => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !(mesh.geometry as any).boundsTree) meshes.push(mesh);
    });
    for (const mesh of meshes) {
      mesh.geometry.computeBoundsTree?.();
      await yieldToBrowser();
    }

    const grid = new Float32Array(GRID_W * GRID_H);
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const origin = new THREE.Vector3();
    for (let iy = 0; iy < GRID_H; iy++) {
      for (let ix = 0; ix < GRID_W; ix++) {
        const x = box.min.x + (ix / (GRID_W - 1)) * (box.max.x - box.min.x);
        const z = box.min.z + (iy / (GRID_H - 1)) * (box.max.z - box.min.z);
        origin.set(x, box.max.y + 100, z);
        ray.set(origin, down);
        const hits = ray.intersectObject(scene, true);
        // top surface (terrain / road / roof) — the model's solid base hides fake
        // "ground" faces beneath the terrain, so first-hit is the reliable choice
        grid[iy * GRID_W + ix] = hits.length ? hits[0].point.y : 5;
      }
      if (iy % 4 === 3) await yieldToBrowser();
    }
    heightGridCache = grid;
    heightGridPending = null;
    try {
      sessionStorage.setItem(GRID_KEY, JSON.stringify(Array.from(grid).map((v) => Math.round(v * 10) / 10)));
    } catch { /* quota — in-memory cache still works */ }
    return grid;
  })();

  return heightGridPending;
}

let cachedBox: THREE.Box3 | null = null;

function DQModel({ onReady }: { onReady: (p: Projector) => void }) {
  const { scene: source } = useGLTF(MODEL_URL);
  // clone per mount (geometry/materials shared) so several canvases can show the model
  const scene = useMemo(() => source.clone(), [source]);

  useEffect(() => {
    let cancelled = false;
    const box = cachedBox ?? (cachedBox = new THREE.Box3().setFromObject(scene));
    const spanX = box.max.x - box.min.x;
    const spanZ = box.max.z - box.min.z;
    void buildHeightGrid(scene, box).then((grid) => {
      if (cancelled) return;
      // heights now come from the grid — stop the city mesh from answering pointer
      // raycasts (r3f raycasts on every mousemove; 1M-triangle tests would jank)
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.raycast = () => {};
      });
      onReady({
        size: Math.max(spanX, spanZ),
        min: { x: box.min.x, z: box.min.z },
        span: { x: spanX, z: spanZ },
        toXZ: (lat, lng) => [
          box.min.x + ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * spanX,
          // north points to -Z in model space
          box.max.z - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * spanZ,
        ],
        groundY: (x, z) => {
          const fx = THREE.MathUtils.clamp(((x - box.min.x) / spanX) * (GRID_W - 1), 0, GRID_W - 1.001);
          const fz = THREE.MathUtils.clamp(((z - box.min.z) / spanZ) * (GRID_H - 1), 0, GRID_H - 1.001);
          const ix = Math.floor(fx);
          const iz = Math.floor(fz);
          const tx = fx - ix;
          const tz = fz - iz;
          const g = (col: number, row: number) => grid[row * GRID_W + col];
          const top = g(ix, iz) * (1 - tx) + g(ix + 1, iz) * tx;
          const bot = g(ix, iz + 1) * (1 - tx) + g(ix + 1, iz + 1) * tx;
          return top * (1 - tz) + bot * tz;
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [scene, onReady]);

  return <primitive object={scene} />;
}

/* ————— traffic heatmap: instanced heat columns along the gate→centre arteries ————— */

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTER = { lat: 24.6808, lng: 46.6272 };

/* A real heatmap: an intensity field painted to a canvas (gaussian splats along the
 * arteries), colourised through a green→gold→red LUT, and draped over the terrain
 * as a height-fitted mesh — buildings rise through it, streets glow under it. */

const HEAT_W = 256;
const HEAT_H = 288;
const HEAT_SEG_X = 95;
const HEAT_SEG_Z = 107;

/* transparent → green → gold → red, alpha ramping with congestion */
const HEAT_LUT = (() => {
  const stops: [number, number, number, number, number][] = [
    [0.0, 34, 120, 85, 0],
    [0.1, 34, 120, 85, 140],
    [0.4, 110, 150, 50, 185],
    [0.65, 214, 158, 20, 220],
    [1.0, 190, 42, 30, 245],
  ];
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    lut[i * 4] = a[1] + (b[1] - a[1]) * f;
    lut[i * 4 + 1] = a[2] + (b[2] - a[2]) * f;
    lut[i * 4 + 2] = a[3] + (b[3] - a[3]) * f;
    lut[i * 4 + 3] = a[4] + (b[4] - a[4]) * f;
  }
  return lut;
})();

/* Road network sample points — computed once from the roads-only GLB, shared by the
 * traffic heatmap and the IoT placement. Model-space x/z plus inverse-projected lat/lng. */
interface RoadPoint { x: number; z: number; lat: number; lng: number }
let roadPointsCache: RoadPoint[] | null = null;

function computeRoadPoints(roadScene: THREE.Object3D, proj: Projector): RoadPoint[] {
  if (roadPointsCache) return roadPointsCache;
  const pts: RoadPoint[] = [];
  const v = new THREE.Vector3();
  const add = (x: number, z: number) => {
    const u = (x - proj.min.x) / proj.span.x;
    const w = (z - proj.min.z) / proj.span.z;
    if (u < -0.02 || u > 1.02 || w < -0.02 || w > 1.02) return;
    pts.push({
      x,
      z,
      lng: BOUNDS.lngMin + u * (BOUNDS.lngMax - BOUNDS.lngMin),
      lat: BOUNDS.latMax - w * (BOUNDS.latMax - BOUNDS.latMin),
    });
  };
  roadScene.updateMatrixWorld(true);
  // budget distributed by triangle share — small road segments must NOT be
  // oversampled (stacked splats saturate the heat into false red blobs)
  const meshes: { mesh: THREE.Mesh; tris: number }[] = [];
  roadScene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
    meshes.push({
      mesh,
      tris: (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3,
    });
  });
  const totalTris = meshes.reduce((a, m) => a + m.tris, 0) || 1;
  const BUDGET = 2400;
  for (const { mesh, tris } of meshes) {
    const n = Math.max(2, Math.round((BUDGET * tris) / totalTris));
    try {
      const sampler = new MeshSurfaceSampler(mesh).build();
      for (let i = 0; i < n; i++) {
        sampler.sample(v);
        v.applyMatrix4(mesh.matrixWorld);
        add(v.x, v.z);
      }
    } catch {
      // degenerate geometry — fall back to raw vertices
      const pos = mesh.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / n));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        add(v.x, v.z);
      }
    }
  }
  roadPointsCache = pts;
  setRoadNetwork(pts); // publish to the store ticker — patrols drive on these streets
  return roadPointsCache;
}

/* One-time relocation: distribute bins / light poles / tanks along the real road
 * network (deterministic, min 85m spacing) — IoT lives on the streets, not in voids. */
let iotSnapped = false;

function IotRoadSnap() {
  const proj = useProjector();
  const { scene: roadScene } = useGLTF(ROAD_URL);

  useEffect(() => {
    if (iotSnapped) return;
    const points = computeRoadPoints(roadScene, proj);
    if (points.length < 60) return;
    iotSnapped = true;
    const rng = mulberry(7);
    const shuffled = points
      .map((p) => ({ p, k: rng() }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.p);
    const chosen: RoadPoint[] = [];
    for (const p of shuffled) {
      if (chosen.every((c) => Math.hypot(c.x - p.x, c.z - p.z) > 85)) chosen.push(p);
      if (chosen.length >= 60) break;
    }
    const state = useStore.getState();
    const roadKinds = new Set(['bin', 'light_pole', 'irrigation_tank']);
    const ids = state.assets.filter((a) => roadKinds.has(a.kind)).map((a) => a.id);
    const at = new Map(ids.map((id, i) => [id, chosen[i % chosen.length]]));
    useStore.setState((st) => ({
      assets: st.assets.map((a) => {
        const p = at.get(a.id);
        return p ? { ...a, lat: p.lat, lng: p.lng } : a;
      }),
    }));
  }, [proj, roadScene]);

  return null;
}

function TrafficLayer() {
  const proj = useProjector();
  const gates = useStore((s) => s.gates);
  const { scene: roadScene } = useGLTF(ROAD_URL);
  const lastDraw = useRef(-1);

  /* splats on the REAL road network, congestion-weighted by gate/centre proximity */
  const splats = useMemo(() => {
    const rng = mulberry(20260802);
    const toPx = (lat: number, lng: number): [number, number] => {
      const [x, z] = proj.toXZ(lat, lng);
      return [((x - proj.min.x) / proj.span.x) * HEAT_W, ((z - proj.min.z) / proj.span.z) * HEAT_H];
    };
    const hotspots = gates.map((g, i) => {
      const [px, py] = toPx(g.lat, g.lng);
      return { px, py, w: i === 0 ? 1 : 0.72 };
    });
    {
      const [px, py] = toPx(CENTER.lat, CENTER.lng);
      hotspots.push({ px, py, w: 0.9 });
    }
    return computeRoadPoints(roadScene, proj).map((p) => {
      const px = ((p.x - proj.min.x) / proj.span.x) * HEAT_W;
      const py = ((p.z - proj.min.z) / proj.span.z) * HEAT_H;
      let w = 0.26; // free-flowing baseline everywhere on the network
      for (const h of hotspots) {
        const d = Math.hypot(px - h.px, py - h.py);
        w = Math.max(w, h.w * Math.exp(-(d * d) / (2 * 34 * 34)));
      }
      return {
        px,
        py,
        r: 4 * (0.85 + rng() * 0.4),
        base: Math.min(1, w * (0.8 + rng() * 0.35)),
        phase: rng() * Math.PI * 2,
        speed: 0.35 + rng() * 0.5,
      };
    });
  }, [proj, gates, roadScene]);

  /* street-level overlay geometry: sample the height grid, then min-erode it twice —
   * buildings are local maxima in the grid, so erosion flattens the drape back to
   * street level instead of tenting over rooftops with hard edges */
  const geometry = useMemo(() => {
    const rowLen = HEAT_SEG_X + 1;
    const colLen = HEAT_SEG_Z + 1;
    let heights = new Float32Array(rowLen * colLen);
    for (let j = 0; j <= HEAT_SEG_Z; j++) {
      for (let i = 0; i <= HEAT_SEG_X; i++) {
        const x = proj.min.x + (i / HEAT_SEG_X) * proj.span.x;
        const z = proj.min.z + (j / HEAT_SEG_Z) * proj.span.z;
        heights[j * rowLen + i] = proj.groundY(x, z);
      }
    }
    for (let pass = 0; pass < 1; pass++) {
      const eroded = new Float32Array(heights);
      for (let j = 0; j <= HEAT_SEG_Z; j++) {
        for (let i = 0; i <= HEAT_SEG_X; i++) {
          let m = Infinity;
          for (let dj = -1; dj <= 1; dj++) {
            for (let di = -1; di <= 1; di++) {
              const jj = Math.min(HEAT_SEG_Z, Math.max(0, j + dj));
              const ii = Math.min(HEAT_SEG_X, Math.max(0, i + di));
              m = Math.min(m, heights[jj * rowLen + ii]);
            }
          }
          eroded[j * rowLen + i] = m;
        }
      }
      heights = eroded;
    }

    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const uvs: number[] = [];
    const idx: number[] = [];
    for (let j = 0; j <= HEAT_SEG_Z; j++) {
      for (let i = 0; i <= HEAT_SEG_X; i++) {
        const x = proj.min.x + (i / HEAT_SEG_X) * proj.span.x;
        const z = proj.min.z + (j / HEAT_SEG_Z) * proj.span.z;
        // erosion can dip below street level on slopes — lift well clear of the ground
        verts.push(x, heights[j * rowLen + i] + 6, z);
        uvs.push(i / HEAT_SEG_X, 1 - j / HEAT_SEG_Z);
      }
    }
    const row = HEAT_SEG_X + 1;
    for (let j = 0; j < HEAT_SEG_Z; j++) {
      for (let i = 0; i < HEAT_SEG_X; i++) {
        const a = j * row + i;
        idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    return geo;
  }, [proj]);

  const { texture, intensityCanvas, outCanvas } = useMemo(() => {
    const intensityCanvas = document.createElement('canvas');
    intensityCanvas.width = HEAT_W;
    intensityCanvas.height = HEAT_H;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = HEAT_W;
    outCanvas.height = HEAT_H;
    const texture = new THREE.CanvasTexture(outCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, intensityCanvas, outCanvas };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - lastDraw.current < 0.4) return;
    lastDraw.current = t;
    const ictx = intensityCanvas.getContext('2d')!;
    ictx.globalCompositeOperation = 'source-over';
    ictx.fillStyle = '#000';
    ictx.fillRect(0, 0, HEAT_W, HEAT_H);
    ictx.globalCompositeOperation = 'lighter';
    for (const s of splats) {
      const a = Math.max(0, Math.min(1, s.base * (0.62 + 0.38 * Math.sin(t * s.speed + s.phase))));
      if (a < 0.04) continue;
      const g = ictx.createRadialGradient(s.px, s.py, 0, s.px, s.py, s.r);
      g.addColorStop(0, `rgba(255,255,255,${(0.3 * a).toFixed(3)})`);
      g.addColorStop(0.55, `rgba(255,255,255,${(0.13 * a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ictx.fillStyle = g;
      ictx.beginPath();
      ictx.arc(s.px, s.py, s.r, 0, Math.PI * 2);
      ictx.fill();
    }
    const src = ictx.getImageData(0, 0, HEAT_W, HEAT_H);
    const octx = outCanvas.getContext('2d')!;
    const out = octx.createImageData(HEAT_W, HEAT_H);
    for (let i = 0; i < src.data.length; i += 4) {
      const v = src.data[i]; // grayscale intensity in red channel
      out.data[i] = HEAT_LUT[v * 4];
      out.data[i + 1] = HEAT_LUT[v * 4 + 1];
      out.data[i + 2] = HEAT_LUT[v * 4 + 2];
      out.data[i + 3] = HEAT_LUT[v * 4 + 3];
    }
    octx.putImageData(out, 0, 0);
    texture.needsUpdate = true;
  });

  return (
    <mesh geometry={geometry} renderOrder={2} frustumCulled={false}>
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/* ————— live patrols ————— */

function PatrolMarker({ id, onHover, onOpen }: { id: string; onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const patrol = useStore((s) => s.patrols.find((p) => p.id === id))!;
  const guard = useStore((s) => s.people.find((p) => p.id === patrol.guardId));
  const group = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3());
  const ring = useRef<THREE.Mesh>(null);

  const color = patrol.status === 'available' ? 'var(--color-viz-3)' : patrol.status === 'dispatched' ? 'var(--color-viz-2)' : 'var(--color-viz-6)';
  const statusAr = patrol.status === 'available' ? 'متاحة — في جولة' : patrol.status === 'dispatched' ? 'متجهة لبلاغ' : 'في الموقع';

  useFrame((_, delta) => {
    if (!group.current) return;
    const [x, z] = proj.toXZ(patrol.lat, patrol.lng);
    target.current.set(x, proj.groundY(x, z), z);
    group.current.position.lerp(target.current, Math.min(1, delta * 2.2));
    if (ring.current) {
      const s = 1 + 0.25 * Math.sin(performance.now() / 400);
      ring.current.scale.set(s, s, s);
    }
  });

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        const p = group.current!.position;
        onHover({ pos: [p.x, p.y + 60, p.z], title: patrol.nameAr, sub: `${statusAr} · ${guard?.nameAr ?? ''}` });
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen('patrol');
      }}
    >
      <mesh position={[0, 14, 0]}>
        <coneGeometry args={[10, 26, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
      <mesh ref={ring} position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 18, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* PERF — الاشتراك في `patrols` معزول هنا. نبضة الثلاث ثوانٍ تحرّك الدوريات فتتغيّر
 * هوية المصفوفة؛ لو كان الاشتراك في جذر المشهد لأعاد رسم كل الطبقات كل نبضة —
 * حتى في اللوحات التي لا تعرض طبقة الدوريات أصلًا. */
function PatrolsLayer({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  // مفتاح نصّي: المقارنة بـObject.is تنجح ما دامت قائمة الدوريات نفسها لم تتغيّر
  const idKey = useStore((s) => s.patrols.map((p) => p.id).join(','));
  const ids = useMemo(() => (idKey ? idKey.split(',') : []), [idKey]);
  return (
    <>
      {ids.map((id) => (
        <PatrolMarker key={id} id={id} onHover={onHover} onOpen={onOpen} />
      ))}
    </>
  );
}

/* ————— IoT: bins, light poles, irrigation tanks ————— */

function IotLayer({
  bins,
  lamps,
  tanks,
  onHover,
  onOpen,
}: {
  bins: boolean;
  lamps: boolean;
  tanks: boolean;
  onHover: (h: HoverInfo | null) => void;
  onOpen: (link: string) => void;
}) {
  const proj = useProjector();
  const assets = useStore((s) => s.assets);
  const sensorValues = useStore((s) => s.sensorValues);

  const placed = useMemo(
    () =>
      assets
        .filter(
          (a) =>
            (bins && a.kind === 'bin') ||
            (lamps && a.kind === 'light_pole') ||
            (tanks && a.kind === 'irrigation_tank'),
        )
        .map((a) => {
          const [x, z] = proj.toXZ(a.lat, a.lng);
          return { asset: a, x, z, y: proj.groundY(x, z) };
        }),
    [assets, proj, bins, lamps, tanks],
  );

  return (
    <group>
      {placed.map(({ asset, x, y, z }) => {
        const v = sensorValues[asset.id] ?? {};
        if (asset.kind === 'bin') {
          const fill = v.fill ?? 0;
          const color = fill >= 80 ? 'var(--color-viz-4)' : fill >= 60 ? 'var(--color-viz-6)' : 'var(--color-viz-3)';
          return (
            <group
              key={asset.id}
              position={[x, y, z]}
              onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 45, z], title: asset.nameAr, sub: `امتلاء ${fill}% · بطارية ${v.battery ?? '—'}%` }); }}
              onPointerOut={() => onHover(null)}
              onClick={(e) => { e.stopPropagation(); onOpen('operations'); }}
            >
              <mesh position={[0, 7, 0]}>
                <cylinderGeometry args={[6, 5, 14, 10]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={fill >= 80 ? 0.8 : 0.25} />
              </mesh>
            </group>
          );
        }
        if (asset.kind === 'light_pole') {
          const ok = v.lampOk !== false;
          const lamp = ok ? '#fdf2e3' : 'var(--color-viz-4)';
          return (
            <group
              key={asset.id}
              position={[x, y, z]}
              onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 60, z], title: asset.nameAr, sub: ok ? 'تعمل' : 'عطل — بحاجة صيانة' }); }}
              onPointerOut={() => onHover(null)}
              onClick={(e) => { e.stopPropagation(); onOpen('operations'); }}
            >
              <mesh position={[0, 16, 0]}>
                <cylinderGeometry args={[1.6, 1.6, 32, 6]} />
                <meshStandardMaterial color="#6bc2b7" />
              </mesh>
              <mesh position={[0, 33, 0]}>
                <sphereGeometry args={[4.5, 12, 12]} />
                <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={ok ? 0.9 : 1.2} />
              </mesh>
            </group>
          );
        }
        const level = v.tankLevel ?? 0;
        const tankColor = level < 40 ? 'var(--color-viz-6)' : 'var(--color-viz-5)';
        return (
          <group
            key={asset.id}
            position={[x, y, z]}
            onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 55, z], title: asset.nameAr, sub: `مستوى ${level}%` }); }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onOpen('operations'); }}
          >
            <mesh position={[0, 10, 0]}>
              <cylinderGeometry args={[11, 11, 20, 14]} />
              <meshStandardMaterial color={tankColor} metalness={0.3} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ————— incident beacons ————— */

function IncidentBeacons({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const allIncidents = useStore((s) => s.incidents);
  const incidents = useMemo(() => allIncidents.filter((i) => i.status !== 'closed'), [allIncidents]);
  const rings = useRef<Map<string, THREE.Mesh>>(new Map());

  useFrame(({ clock }) => {
    rings.current.forEach((mesh) => {
      const t = (clock.elapsedTime % 1.8) / 1.8;
      mesh.scale.setScalar(1 + t * 4);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - t);
    });
  });

  return (
    <group>
      {incidents.map((inc) => {
        const [x, z] = proj.toXZ(inc.lat, inc.lng);
        const y = proj.groundY(x, z);
        return (
          <group
            key={inc.id}
            position={[x, y, z]}
            onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 95, z], title: `${incidentKindAr[inc.kind]} — ${inc.txnNo}`, sub: 'اضغط لفتح البلاغ' }); }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onOpen(`incident:${inc.id}`); }}
          >
            <mesh position={[0, 30, 0]}>
              <cylinderGeometry args={[1.2, 1.2, 60, 6]} />
              <meshBasicMaterial color="#a82a22" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 66, 0]}>
              <sphereGeometry args={[8, 16, 16]} />
              <meshStandardMaterial color="#a82a22" emissive="#a82a22" emissiveIntensity={1.4} />
            </mesh>
            <mesh
              ref={(m) => { if (m) rings.current.set(inc.id, m); else rings.current.delete(inc.id); }}
              position={[0, 3, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[16, 20, 40]} />
              <meshBasicMaterial color="#a82a22" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ————— the property registry, pinned onto the buildings ————— */

const PROPERTY_PIN_COLORS: Record<string, string> = {
  villa: 'var(--color-viz-5)',
  apartment: '#a3dbd3',
  commercial: 'var(--color-viz-6)',
  embassy: 'var(--color-viz-2)',
  facility: 'var(--color-viz-3)',
};

function PropertiesLayer({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const properties = useStore((s) => s.properties);
  const people = useStore((s) => s.people);
  const vehicles = useStore((s) => s.vehicles);

  const pins = useMemo(
    () =>
      properties.map((p) => {
        const [x, z] = proj.toXZ(p.lat, p.lng);
        const owner = people.find((x2) => x2.id === p.ownerId);
        const flagged = vehicles.some(
          (v) => p.vehicleIds.includes(v.id) && v.accessState !== 'allowed' && !v.suspension?.liftedAtISO,
        );
        return { p, x, z, y: proj.groundY(x, z), owner, flagged };
      }),
    [properties, people, vehicles, proj],
  );

  return (
    <group>
      {pins.map(({ p, x, y, z, owner, flagged }) => {
        const color = flagged ? 'var(--color-viz-4)' : PROPERTY_PIN_COLORS[p.type] ?? 'var(--color-viz-5)';
        return (
          <group
            key={p.id}
            position={[x, y, z]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover({
                pos: [x, y + 55, z],
                title: `${p.code} — ${p.unitNo}`,
                sub: `${propertyTypeAr[p.type]} · ${owner?.nameAr ?? ''} · ${p.residentIds.length} مقيم · ${p.vehicleIds.length} مركبة${flagged ? ' · ⚠ مركبة موقوفة على الملف' : ''} — اضغط لفتح ملف العقار`,
              });
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(`property:${p.id}`);
            }}
          >
            {/* generous invisible hit target — the visible pin is tiny at district zoom */}
            <mesh position={[0, 20, 0]}>
              <sphereGeometry args={[18, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh position={[0, 11, 0]}>
              <cylinderGeometry args={[1, 1, 22, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} />
            </mesh>
            <mesh position={[0, 26, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[5.5, 10, 4]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={flagged ? 1 : 0.35} />
            </mesh>
            {flagged && (
              <mesh position={[0, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[9, 12, 28]} />
                <meshBasicMaterial color="#a82a22" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* ————— landmarks: highlighted signature buildings ————— */

const LANDMARKS = [
  { id: 'oud-square', labelAr: 'Oud Square', lat: 24.6747836, lng: 46.6248454, w: 70, d: 50, h: 26 },
];

function LandmarksLayer({ onHover }: { onHover: (h: HoverInfo | null) => void }) {
  const proj = useProjector();
  const glow = useRef<Map<string, THREE.Mesh>>(new Map());

  useFrame(({ clock }) => {
    glow.current.forEach((mesh) => {
      const t = (clock.elapsedTime % 2.4) / 2.4;
      mesh.scale.setScalar(1 + t * 0.9);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
    });
  });

  return (
    <group>
      {LANDMARKS.map((lm) => {
        const [x, z] = proj.toXZ(lm.lat, lm.lng);
        const y = proj.groundY(x, z);
        return (
          <group
            key={lm.id}
            position={[x, y, z]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover({ pos: [x, y + lm.h + 40, z], title: lm.labelAr, sub: 'معلم رئيسي في الحي' });
            }}
            onPointerOut={() => onHover(null)}
          >
            {/* highlighted building volume */}
            <mesh position={[0, lm.h / 2, 0]}>
              <boxGeometry args={[lm.w, lm.h, lm.d]} />
              <meshStandardMaterial color="#0e6a60" emissive="#0e6a60" emissiveIntensity={0.45} transparent opacity={0.8} metalness={0.3} roughness={0.4} />
            </mesh>
            <mesh position={[0, lm.h + 3, 0]}>
              <boxGeometry args={[lm.w * 0.55, 6, lm.d * 0.55]} />
              <meshStandardMaterial color="#0e6a60" emissive="#0e6a60" emissiveIntensity={0.7} />
            </mesh>
            {/* pulsing highlight ring */}
            <mesh
              ref={(m) => {
                if (m) glow.current.set(lm.id, m);
                else glow.current.delete(lm.id);
              }}
              position={[0, 2, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[Math.max(lm.w, lm.d) * 0.62, Math.max(lm.w, lm.d) * 0.72, 48]} />
              <meshBasicMaterial color="#0e6a60" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <Html position={[0, lm.h + 26, 0]} center distanceFactor={1600} occlude={false} zIndexRange={[10, 0]}>
              <div dir="rtl" className="pointer-events-none whitespace-nowrap rounded-full bg-brand-600 px-3 py-1 text-[12px] font-bold text-ink-900 shadow-e3">
                {lm.labelAr}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/* ————— tree irrigation sensors: foliage coloured by soil moisture, red = alert ————— */

function TreesLayer({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const assets = useStore((s) => s.assets);
  const sensorValues = useStore((s) => s.sensorValues);
  const rings = useRef<Map<string, THREE.Mesh>>(new Map());

  const trees = useMemo(
    () =>
      assets
        .filter((a) => a.kind === 'tree')
        .map((a) => {
          const [x, z] = proj.toXZ(a.lat, a.lng);
          return { asset: a, x, z, y: proj.groundY(x, z) };
        }),
    [assets, proj],
  );

  useFrame(({ clock }) => {
    rings.current.forEach((mesh) => {
      const t = (clock.elapsedTime % 1.6) / 1.6;
      mesh.scale.setScalar(1 + t * 2.5);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
    });
  });

  return (
    <group>
      {trees.map(({ asset, x, y, z }) => {
        const moisture = sensorValues[asset.id]?.moisture ?? 50;
        const dry = moisture < 25;
        const thirsty = moisture < 40;
        const foliage = dry ? 'var(--color-viz-4)' : thirsty ? 'var(--color-viz-6)' : 'var(--color-viz-3)';
        return (
          <group
            key={asset.id}
            position={[x, y, z]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover({
                pos: [x, y + 45, z],
                title: asset.nameAr,
                sub: dry
                  ? `⚠ رطوبة التربة ${moisture}% — بحاجة ري عاجل`
                  : `رطوبة التربة ${moisture}% · بطارية ${sensorValues[asset.id]?.battery ?? '—'}%`,
              });
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onOpen('operations');
            }}
          >
            {/* generous invisible hit target */}
            <mesh position={[0, 14, 0]}>
              <sphereGeometry args={[14, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh position={[0, 5, 0]}>
              <cylinderGeometry args={[1.4, 1.9, 10, 6]} />
              <meshStandardMaterial color="#6B4F2E" />
            </mesh>
            <mesh position={[0, 15, 0]}>
              <icosahedronGeometry args={[7.5, 1]} />
              <meshStandardMaterial color={foliage} emissive={foliage} emissiveIntensity={dry ? 0.9 : 0.25} roughness={0.7} />
            </mesh>
            {dry && (
              <mesh
                ref={(m) => {
                  if (m) rings.current.set(asset.id, m);
                  else rings.current.delete(asset.id);
                }}
                position={[0, 1.5, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[10, 13, 32]} />
                <meshBasicMaterial color="#a82a22" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/* ————— community requests ————— */

function RequestsLayer({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const allRequests = useStore((s) => s.requests);
  const open = useMemo(() => allRequests.filter((r) => r.status !== 'closed'), [allRequests]);

  return (
    <group>
      {open.map((r) => {
        const [x, z] = proj.toXZ(r.lat, r.lng);
        const y = proj.groundY(x, z);
        const urgent = r.priority === 'urgent' || r.slaBreached;
        const color = urgent ? 'var(--color-viz-4)' : 'var(--color-viz-6)';
        return (
          <group
            key={r.id}
            position={[x, y, z]}
            onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 60, z], title: requestKindAr[r.kind], sub: r.descriptionAr.slice(0, 60) }); }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onOpen('requests'); }}
          >
            <mesh position={[0, 16, 0]}>
              <cylinderGeometry args={[1.4, 1.4, 32, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} />
            </mesh>
            <mesh position={[0, 36, 0]}>
              <sphereGeometry args={[6.5, 14, 14]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={urgent ? 1 : 0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ————— open violations ————— */

function ViolationsLayer({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const allViolations = useStore((s) => s.violations);
  const open = useMemo(() => allViolations.filter((v) => v.status !== 'closed'), [allViolations]);
  const spin = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    spin.current?.children.forEach((c) => (c.rotation.y += delta * 1.2));
  });

  return (
    <group ref={spin}>
      {open.map((v) => {
        const [x, z] = proj.toXZ(v.lat, v.lng);
        const y = proj.groundY(x, z);
        return (
          <group
            key={v.id}
            position={[x, y + 30, z]}
            onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 65, z], title: `${v.code} — ${v.labelAr}`, sub: v.repeatCount > 1 ? `تكرار ${v.repeatCount} · درجة التصعيد ${v.escalationStep}` : `درجة التصعيد ${v.escalationStep}` }); }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onOpen('violations'); }}
          >
            <mesh>
              <octahedronGeometry args={[10]} />
              <meshStandardMaterial color="#a82a22" emissive="#a82a22" emissiveIntensity={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ————— patrol-tour checkpoints ————— */

function CheckpointsLayer({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const checkpoints = useStore((s) => s.checkpoints);
  const scans = useStore((s) => s.checkpointScans);

  return (
    <group>
      {checkpoints.map((c) => {
        const [x, z] = proj.toXZ(c.lat, c.lng);
        const y = proj.groundY(x, z);
        const last = scans.find((s) => s.checkpointId === c.id);
        const color = last ? 'var(--color-viz-3)' : 'var(--color-viz-4)';
        return (
          <group
            key={c.id}
            position={[x, y, z]}
            onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 55, z], title: c.nameAr, sub: last ? `آخر مرور ${ago(last.atISO)}` : 'لم تُغطَّ بعد' }); }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onOpen('tour'); }}
          >
            <mesh position={[0, 12, 0]}>
              <cylinderGeometry args={[1.4, 1.4, 24, 6]} />
              <meshBasicMaterial color="#6bc2b7" />
            </mesh>
            <mesh position={[3.5, 21, 0]}>
              <boxGeometry args={[9, 6, 0.8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ————— gates ————— */

function GateMarkers({ onHover, onOpen }: { onHover: (h: HoverInfo | null) => void; onOpen: (link: string) => void }) {
  const proj = useProjector();
  const gates = useStore((s) => s.gates);
  const gateEvents = useStore((s) => s.gateEvents);

  return (
    <group>
      {gates.map((g) => {
        const [x, z] = proj.toXZ(g.lat, g.lng);
        const y = proj.groundY(x, z);
        const recent = gateEvents.filter((e) => e.gateId === g.id).length;
        const stateAr = g.state === 'open' ? 'مفتوحة' : g.state === 'manual' ? 'تشغيل يدوي' : 'مغلقة';
        return (
          <group
            key={g.id}
            position={[x, y, z]}
            onPointerOver={(e) => { e.stopPropagation(); onHover({ pos: [x, y + 75, z], title: g.nameAr, sub: `${stateAr} · ${recent} عملية في السجل — اضغط لشاشة البوابة` }); }}
            onPointerOut={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onOpen(`gate:${g.id}`); }}
          >
            {[-14, 14].map((off) => (
              <mesh key={off} position={[off, 20, 0]}>
                <boxGeometry args={[7, 40, 7]} />
                <meshStandardMaterial color="#0e6a60" emissive="#0e6a60" emissiveIntensity={0.35} metalness={0.4} roughness={0.4} />
              </mesh>
            ))}
            <mesh position={[0, 42, 0]}>
              <boxGeometry args={[38, 5, 5]} />
              <meshStandardMaterial color="#0e6a60" emissive="#0e6a60" emissiveIntensity={0.35} />
            </mesh>
            <Html position={[0, 58, 0]} center distanceFactor={1600} occlude={false} zIndexRange={[10, 0]}>
              <div dir="rtl" className="pointer-events-none whitespace-nowrap rounded-full bg-ink-0/85 px-2.5 py-1 text-caption font-bold text-brand-600 ring-1 ring-brand-500/40">
                {g.nameAr}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/* ————— scene root ————— */

function TwinScene({ layers, onOpen }: { layers: TwinLayers; onOpen: (link: string) => void }) {
  const [projector, setProjector] = useState<Projector | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  return (
    <>
      <color attach="background" args={['#07302b']} />
      <fog attach="fog" args={['#07302b', 4200, 9500]} />
      <hemisphereLight args={['#a3dbd3', '#1a2536', 0.85]} />
      <directionalLight position={[2400, 3200, -1800]} intensity={1.5} color="#fdf2e3" />
      <directionalLight position={[-1800, 1200, 2400]} intensity={0.35} color="#a3dbd3" />

      <Suspense
        fallback={
          <Html center>
            <div dir="rtl" className="rounded-card bg-ink-0/90 px-5 py-3 text-sm font-semibold text-ink-800 ring-1 ring-brand-500/30">
              جارٍ تحميل نموذج الحي ثلاثي الأبعاد…
            </div>
          </Html>
        }
      >
        <DQModel onReady={setProjector} />
        {projector && (
          <ProjectorCtx.Provider value={projector}>
            <IotRoadSnap />
            {layers.traffic && <TrafficLayer />}
            {(layers.bins || layers.lamps || layers.tanks) && (
              <IotLayer bins={layers.bins} lamps={layers.lamps} tanks={layers.tanks} onHover={setHover} onOpen={onOpen} />
            )}
            {layers.trees && <TreesLayer onHover={setHover} onOpen={onOpen} />}
            {layers.landmarks && <LandmarksLayer onHover={setHover} />}
            {layers.properties && <PropertiesLayer onHover={setHover} onOpen={onOpen} />}
            {layers.requests && <RequestsLayer onHover={setHover} onOpen={onOpen} />}
            {layers.violations && <ViolationsLayer onHover={setHover} onOpen={onOpen} />}
            {layers.checkpoints && <CheckpointsLayer onHover={setHover} onOpen={onOpen} />}
            {layers.incidents && <IncidentBeacons onHover={setHover} onOpen={onOpen} />}
            {layers.gates && <GateMarkers onHover={setHover} onOpen={onOpen} />}
            {layers.patrols && <PatrolsLayer onHover={setHover} onOpen={onOpen} />}
            {hover && (
              <Html position={hover.pos} center distanceFactor={1400} zIndexRange={[20, 11]}>
                <div dir="rtl" className="pointer-events-none w-max max-w-56 rounded-card bg-ink-0/95 px-3 py-2 text-ink-800 shadow-e3 ring-1 ring-brand-500/40">
                  <p className="text-caption font-bold">{hover.title}</p>
                  {hover.sub && <p className="mt-0.5 text-micro text-ink-500">{hover.sub}</p>}
                </div>
              </Html>
            )}
          </ProjectorCtx.Provider>
        )}
      </Suspense>
    </>
  );
}

export function DQTwinCanvas({
  layers,
  autoRotate,
  onOpen,
}: {
  layers: TwinLayers;
  autoRotate: boolean;
  onOpen: (link: string) => void;
}) {
  return (
    <Canvas
      camera={{ position: [1500, 1900, 2400], fov: 45, near: 10, far: 20000 }}
      dpr={[1, 1.75]}
      shadows={false}
    >
      <TwinScene layers={layers} onOpen={onOpen} />
      <OrbitControls
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={280}
        maxDistance={6500}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}

/** Compact live 3D map for dashboards and screens — replaces the old static SVG map.
 *  Same model, same shared store; pick the layers each screen needs.
 *  يُحمَّل كسولًا عبر `DQTwin.tsx` — لا يدخل الحزمة الأساسية لأي شاشة. */
export function Map3DInner({
  layers,
  onOpen = () => {},
  className = 'aspect-[16/9]',
}: {
  layers: Partial<TwinLayers>;
  onOpen?: (link: string) => void;
  className?: string;
}) {
  const merged: TwinLayers = { ...noLayers, ...layers };
  return (
    <div className={`relative overflow-hidden rounded-card ${className}`}>
      <Canvas camera={{ position: [500, 2500, 2700], fov: 42, near: 10, far: 20000 }} dpr={[1, 1.5]} shadows={false}>
        <TwinScene layers={merged} onOpen={onOpen} />
        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2.2}
          minDistance={300}
          maxDistance={6500}
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      <p dir="ltr" className="pointer-events-none absolute bottom-0.5 end-1.5 text-[8px] text-white/35">
        Satlas — Allen AI · © OpenStreetMap
      </p>
    </div>
  );
}

export type Map3DProps = Parameters<typeof Map3DInner>[0];
