/** Road network graph for patrol movement — built once from the roads-only GLB
 *  samples (published by the 3D layer), consumed by the store ticker so patrols
 *  drive along streets instead of cutting through buildings. */

export interface RoadSample {
  lat: number;
  lng: number;
  x: number; // model-space metres — used for real distances
  z: number;
}

interface Graph {
  nodes: RoadSample[];
  nbrs: number[][];
}

let graph: Graph | null = null;

const NODE_SPACING = 55; // m — subsample density of graph nodes
const LINK_RADIUS = 150; // m — connect nodes within this range
const MAX_LINKS = 5;

export function setRoadNetwork(samples: RoadSample[]) {
  if (graph || samples.length < 50) return;
  // subsample with min spacing (greedy)
  const nodes: RoadSample[] = [];
  for (const s of samples) {
    let ok = true;
    for (const n of nodes) {
      const dx = n.x - s.x;
      const dz = n.z - s.z;
      if (dx * dx + dz * dz < NODE_SPACING * NODE_SPACING) {
        ok = false;
        break;
      }
    }
    if (ok) nodes.push(s);
  }
  // neighbor links
  const nbrs: number[][] = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) {
    const cand: { j: number; d: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dz = nodes[i].z - nodes[j].z;
      const d = Math.hypot(dx, dz);
      if (d <= LINK_RADIUS) cand.push({ j, d });
    }
    cand.sort((a, b) => a.d - b.d);
    nbrs[i] = cand.slice(0, MAX_LINKS).map((c) => c.j);
  }
  graph = { nodes, nbrs };
}

export const roadNetworkReady = () => graph !== null;

export function nearestNode(lat: number, lng: number): number {
  if (!graph) return -1;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < graph.nodes.length; i++) {
    const d = Math.hypot(graph.nodes[i].lat - lat, graph.nodes[i].lng - lng);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export const nodePos = (i: number): RoadSample => graph!.nodes[i];

export const nodeNeighbors = (i: number): number[] => graph?.nbrs[i] ?? [];

/** next node from `cur` that gets closest to (lat,lng); avoids `prev` unless dead end */
export function stepToward(cur: number, prev: number | undefined, lat: number, lng: number): number {
  if (!graph) return cur;
  const options = graph.nbrs[cur].filter((n) => n !== prev);
  const pool = options.length ? options : graph.nbrs[cur];
  let best = cur;
  let bestD = Infinity;
  for (const n of pool) {
    const d = Math.hypot(graph.nodes[n].lat - lat, graph.nodes[n].lng - lng);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

/** random next node for an on-duty wander; avoids immediate backtracking */
export function wanderStep(cur: number, prev: number | undefined, rand: number): number {
  if (!graph) return cur;
  const options = graph.nbrs[cur].filter((n) => n !== prev);
  const pool = options.length ? options : graph.nbrs[cur];
  if (!pool.length) return cur;
  return pool[Math.floor(rand * pool.length) % pool.length];
}
