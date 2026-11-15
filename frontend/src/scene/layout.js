import * as THREE from "three";

export const BANK_C = 11;
export const W = 7.6, D = 5, H = 2.7, BASE = 0.35;
export const TOP = BASE + H;
export const ROOF_Y = TOP + 0.78;
export const R = 4.6, PIPE_Y = 5.4, SPOKE_END = 1.12, PLAZA = 5.2, INNER = 17.5;
export const AIR = PIPE_Y, WALL_Y = 2.3;
export const DEFAULT_CAM = { pos: [0, 27, 43], target: [0, 2.2, 0.5] };

const MIDS = { alpha: [-R, 0], metro: [0, -R], national: [R, 0], unity: [0, R] };

// 3D route: leaves the bank wall, rises into the air, follows the elevated ring, then converges on the hub.
export function routePoints(id, pos) {
  const sx = Math.sign(pos[0]), sz = Math.sign(pos[1]);
  const m = MIDS[id];
  return [
    [sx * (BANK_C - W / 2), WALL_Y, sz * 9.5], [sx * 6.1, WALL_Y, sz * 9.5], [sx * R, AIR, sz * 9.5],
    [sx * R, AIR, sz * R], [m[0], AIR, m[1]], [Math.sign(m[0]) * SPOKE_END, AIR, Math.sign(m[1]) * SPOKE_END],
  ];
}

function cornerPts(P, i, prev, next, r) {
  const d1 = P[i].clone().sub(prev).normalize(), d2 = next.clone().sub(P[i]).normalize();
  const r1 = Math.min(r, P[i].distanceTo(prev) / 2), r2 = Math.min(r, P[i].distanceTo(next) / 2);
  return [P[i].clone().addScaledVector(d1, -r1), P[i].clone().addScaledVector(d2, r2)];
}

export function roundedCurve(pts, radius = 0.8, y = PIPE_Y, closed = false) {
  const P = pts.map((p) => (p.length === 3 ? new THREE.Vector3(...p) : new THREE.Vector3(p[0], y, p[1])));
  const path = new THREE.CurvePath();
  const n = P.length;
  if (closed) {
    const c = P.map((_, i) => cornerPts(P, i, P[(i - 1 + n) % n], P[(i + 1) % n], radius));
    c.forEach(([a, b], i) => {
      path.add(new THREE.QuadraticBezierCurve3(a, P[i], b));
      path.add(new THREE.LineCurve3(b, c[(i + 1) % n][0]));
    });
    return path;
  }
  let cur = P[0];
  for (let i = 1; i < n - 1; i++) {
    const [a, b] = cornerPts(P, i, P[i - 1], P[i + 1], radius);
    path.add(new THREE.LineCurve3(cur, a));
    path.add(new THREE.QuadraticBezierCurve3(a, P[i], b));
    cur = b;
  }
  path.add(new THREE.LineCurve3(cur, P[n - 1]));
  return path;
}

export function isGrass(x, z, banks) {
  const ax = Math.abs(x), az = Math.abs(z), m = Math.max(ax, az);
  if (m > 17.3 && m < 22.8) return false;
  if (m >= 22.8) return !(ax < 1.8 || az < 1.8);
  if (ax < 1.4 || az < 1.4) return false;
  if (ax < 5.4 && az < 5.4) return false;
  for (const b of banks) {
    const [cx, cz] = b.pos;
    if (Math.abs(x - cx) < W / 2 + 1.25 && Math.abs(z - cz) < D / 2 + 1.25) return false;
    const fz0 = cz + D / 2 + 1;
    const fz1 = cz < 0 ? -5.2 : INNER;
    if (Math.abs(x - cx) < 2.45 && z > fz0 && z < fz1) return false;
    if (Math.abs(z - cz) < 0.7 && ax < 6.5) return false;
  }
  return true;
}
