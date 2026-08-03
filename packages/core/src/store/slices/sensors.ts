import { nanoid } from 'nanoid';
import type { Get, Set } from '../storeTypes';
import { nowISO } from '../../lib/time';
import { BOUNDS, clampToDistrict } from '../../lib/geo';
import { nearestNode, nodePos, roadNetworkReady, stepToward, wanderStep } from '../../lib/roadGraph';

const PATROL_STEP = 0.00035; // ≈ 38m per 3s tick — city patrol speed; 10× demo speed makes it visibly live

/** 3s ticker (spec §15): bins fill, batteries decay, an occasional lamp fault.
 *  Crossing 80% fill creates a work order + Admin notification. */
export const createSensorsSlice = (set: Set, get: Get) => ({
  tickSensors: () => {
    const s = get();
    // BR-121 · DEF-001 — انتهاء الإيقاف · BR-054 · DEF-011 — تجاوز SLA
    get().reconcileSuspensions();
    get().sweepSlaBreaches();
    const bins = s.assets.filter((a) => a.kind === 'bin');
    const target = bins[Math.floor(Math.random() * bins.length)];
    const values = { ...s.sensorValues };
    const prev = values[target.id]?.fill ?? 20;
    const next = Math.min(100, prev + 1 + Math.floor(Math.random() * 4));
    values[target.id] = { ...values[target.id], fill: next };

    // battery decay on a random powered asset
    const powered = s.assets.filter((a) => a.kind !== 'garden' && a.kind !== 'court' && a.kind !== 'restroom');
    const pTarget = powered[Math.floor(Math.random() * powered.length)];
    const pv = values[pTarget.id];
    if (pv?.battery != null) values[pTarget.id] = { ...pv, battery: Math.max(5, pv.battery - (Math.random() < 0.3 ? 1 : 0)) };

    // rare lamp fault
    if (Math.random() < 0.04) {
      const poles = s.assets.filter((a) => a.kind === 'light_pole');
      const pole = poles[Math.floor(Math.random() * poles.length)];
      if (values[pole.id]?.lampOk) {
        values[pole.id] = { ...values[pole.id], lampOk: false };
        get().notify('admin', 'عطل إنارة', `${pole.nameAr} — انطفاء غير مجدول`, '/a/operations', 'warn');
      }
    }

    // tree soil moisture drifts down — below 25% the tree turns red and irrigation is alerted
    const trees = s.assets.filter((a) => a.kind === 'tree');
    if (trees.length) {
      const tree = trees[Math.floor(Math.random() * trees.length)];
      const tv = values[tree.id];
      if (tv?.moisture != null) {
        const prev = tv.moisture;
        const next = Math.max(6, Math.round(prev - Math.random() * 2));
        values[tree.id] = { ...tv, moisture: next };
        if (prev >= 25 && next < 25) {
          get().notify('admin', 'شجرة بحاجة إلى ري', `${tree.nameAr} — رطوبة التربة ${next}%`, '/a/operations', 'warn');
        }
      }
    }

    set({ sensorValues: values });

    // live patrol tracking: units drive ALONG THE ROAD GRAPH (published by the 3D
    // layer) — wandering when available, routing toward the incident when dispatched.
    // Falls back to straight-line movement until the road network is loaded.
    set((st) => ({
      patrols: st.patrols.map((p) => {
        if (p.status === 'on_scene') return p;

        if (roadNetworkReady()) {
          const job =
            p.status === 'dispatched'
              ? st.incidents.find((i) => i.dispatch?.patrolId === p.id && i.status === 'dispatched')
              : undefined;

          // final approach: close to the incident → leave the road and pull up
          if (job && Math.hypot(job.lat - p.lat, job.lng - p.lng) < 0.0012) {
            const d = Math.hypot(job.lat - p.lat, job.lng - p.lng) || 1;
            const step = Math.min(PATROL_STEP, d);
            return { ...p, lat: p.lat + ((job.lat - p.lat) / d) * step, lng: p.lng + ((job.lng - p.lng) / d) * step };
          }

          let node = p.nodeIdx ?? nearestNode(p.lat, p.lng);
          let prev = p.prevIdx;
          const target = nodePos(node);
          const reached = Math.hypot(target.lat - p.lat, target.lng - p.lng) < 0.00035;
          if (reached) {
            const next = job
              ? stepToward(node, prev, job.lat, job.lng)
              : wanderStep(node, prev, Math.random());
            prev = node;
            node = next;
          }
          const t = nodePos(node);
          const d = Math.hypot(t.lat - p.lat, t.lng - p.lng) || 1;
          const step = Math.min(PATROL_STEP, d);
          return {
            ...p,
            lat: p.lat + ((t.lat - p.lat) / d) * step,
            lng: p.lng + ((t.lng - p.lng) / d) * step,
            nodeIdx: node,
            prevIdx: prev,
          };
        }

        /* fallback: straight-line movement until the road graph exists */
        let tLat: number;
        let tLng: number;
        if (p.status === 'dispatched') {
          const job = st.incidents.find((i) => i.dispatch?.patrolId === p.id && i.status === 'dispatched');
          if (!job) return p;
          tLat = job.lat;
          tLng = job.lng;
        } else {
          tLat = p.wpLat ?? p.lat;
          tLng = p.wpLng ?? p.lng;
          const reached = Math.abs(p.lat - tLat) < 0.0004 && Math.abs(p.lng - tLng) < 0.0004;
          if (p.wpLat == null || reached) {
            const wp = clampToDistrict(
              BOUNDS.latMin + 0.004 + Math.random() * (BOUNDS.latMax - BOUNDS.latMin - 0.008),
              BOUNDS.lngMin + 0.004 + Math.random() * (BOUNDS.lngMax - BOUNDS.lngMin - 0.008),
            );
            tLat = wp.lat;
            tLng = wp.lng;
          }
        }
        const dLat = tLat - p.lat;
        const dLng = tLng - p.lng;
        const dist = Math.hypot(dLat, dLng) || 1;
        const step = Math.min(PATROL_STEP, dist);
        return {
          ...p,
          lat: p.lat + (dLat / dist) * step,
          lng: p.lng + (dLng / dist) * step,
          wpLat: p.status === 'available' ? tLat : undefined,
          wpLng: p.status === 'available' ? tLng : undefined,
        };
      }),
    }));

    // threshold crossing → work order, once
    if (prev < 80 && next >= 80) {
      const already = get().requests.some(
        (r) => r.kind === 'waste' && r.descriptionAr.includes(target.nameAr) && r.status !== 'closed',
      );
      if (!already) {
        const admin = s.currentUsers.admin;
        set((st) => ({
          requests: [
            {
              id: nanoid(8),
              kind: 'waste' as const,
              status: 'new' as const,
              priority: 'high' as const,
              raisedBy: 'system-sensor',
              lat: target.lat,
              lng: target.lng,
              descriptionAr: `أمر عمل آلي: ${target.nameAr} تجاوزت ${next}% امتلاء — تفريغ عاجل`,
              mediaBefore: [],
              mediaAfter: [],
              slaBreached: false,
              events: [{ atISO: nowISO(), actorId: 'system-sensor', actorRole: 'sensor', action: 'إنشاء أمر عمل آلي', detailAr: `امتلاء ${next}%` }],
            },
            ...st.requests,
          ],
        }));
        get().appendAudit('request', target.id, 'create', undefined, { auto: true, fill: next, asset: target.nameAr });
        get().notify('admin', 'حاوية تجاوزت حد الامتلاء', `${target.nameAr} — ${next}% · صدر أمر عمل تلقائي`, '/a/operations', 'warn');
        void admin;
      }
    }
  },

  setDemoSpeed: (speed: 1 | 10) => set({ demoSpeed: speed }),
});
