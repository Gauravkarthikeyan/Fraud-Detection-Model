import { useMemo } from "react";
import * as THREE from "three";
import { Instanced } from "./Instanced";
import { M } from "./materials";
import { W, D, isGrass, INNER } from "./layout";
import { BANKS } from "../sim/transactions";
import { mulberry32 } from "../sim/model";

function lumpy(detail, seed, amt) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 4.1 + seed) * Math.cos(v.y * 3.7 + seed * 2) * Math.sin(v.z * 4.3);
    v.multiplyScalar(1 + n * amt);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const CANOPY = lumpy(2, 1.3, 0.16);
const CARD = new THREE.PlaneGeometry(1, 1);
const SHRUB = lumpy(1, 2.1, 0.12);
const TRUNK = new THREE.CylinderGeometry(0.07, 0.13, 1, 7).translate(0, 0.5, 0);
const HEAD = new THREE.IcosahedronGeometry(1, 0);
const BLADE = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-0.035, 0, 0, 0.035, 0, 0, 0, 0.32, 0.02], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0.6, 0.8, 0, 0.6, 0.8, 0, 1, 0], 3));
  return g;
})();

const GREENS = ["#4c7a2c", "#5a8a33", "#6a9a3b", "#3f6a26", "#78a543"];
const PINKS = ["#f0a3c4", "#e98bb5", "#f6bfd6", "#dd7fae", "#f3b2cf"];

const quad = (sx, sz) => (list) => list.map(([x, z, t, s]) => [x * sx, z * sz, t, s]);
function treeSpots() {
  const spots = [];
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const q = quad(sx, sz);
    spots.push(...q([[3.4, 7.6, "oak", 1], [3.6, 14.8, sx * sz > 0 ? "blossom" : "oak", 1.05], [16.4, 16.2, "blossom", 1.15], [16.3, 7.2, "oak", 0.95], [3.2, 11.0, "orn", 1]]));
    if (sz < 0) spots.push(...q([[8.2, 16.2, "oak", 1.1], [13.8, 16.4, "orn", 1], [11, 16.5, "blossom", 0.9]]));
    else spots.push(...q([[15.4, 3.0, "orn", 0.9]]));
    if (sz < 0) spots.push(...q([[15.6, 3.2, "blossom", 0.95]]));
  }));
  const r = mulberry32(77);
  for (let i = 0; i < 85; i++) {
    const a = r() * Math.PI * 2, d = 25 + r() * 22;
    const x = Math.cos(a) * d, z = Math.sin(a) * d * 1.0;
    if (Math.abs(x) < 3.5 || Math.abs(z) < 3.5) continue;
    if (z > 23 && Math.abs(x) < 14) continue;
    spots.push([x, z, r() < 0.22 ? "blossom" : r() < 0.3 ? "orn" : "oak", 0.9 + r() * 0.5]);
  }
  return spots;
}

function useTrees() {
  return useMemo(() => {
    const r = mulberry32(9);
    const trunks = [], cores = [], leaves = [], blossoms = [];
    treeSpots().forEach(([x, z, type, sc]) => {
      const th = (type === "orn" ? 0.9 : type === "blossom" ? 1.3 : 1.6) * sc * (0.9 + r() * 0.25);
      const R = (type === "orn" ? 0.85 : type === "blossom" ? 1.45 : 1.65) * sc * (0.85 + r() * 0.3);
      trunks.push({ p: [x, 0, z], s: [sc * 1.2, th + R * 0.7, sc * 1.2], r: r() * 6 });
      // branches
      for (let b = 0; b < 3; b++) {
        const a = r() * Math.PI * 2;
        trunks.push({ p: [x, th * 0.85, z], s: [sc * 0.55, R * 0.9, sc * 0.55], r: a, rx: 0.7 * Math.cos(a), rz: 0.7 * Math.sin(a) });
      }
      const cy = th + R * 0.85;
      const tint = type === "blossom" ? ["#ffffff", "#ffe6f0", "#f6d0e0"] : ["#ffffff", "#e8f0d8", "#d4e2b8", "#f4f0d0"];
      cores.push({ p: [x, cy, z], s: [R * 0.72, R * 0.62, R * 0.72], r: r() * 6, c: type === "blossom" ? "#7a4a5e" : "#2d4a1c" });
      const cards = type === "orn" ? 22 : 44;
      const list = type === "blossom" ? blossoms : leaves;
      for (let k = 0; k < cards; k++) {
        const u = r() * 2 - 1, phi = r() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
        const d = 0.55 + r() * 0.5;
        const px = x + rr * Math.cos(phi) * R * d, py = cy + u * R * 0.8 * d + R * 0.1, pz = z + rr * Math.sin(phi) * R * d;
        list.push({ p: [px, py, pz], s: R * (0.75 + r() * 0.45), r: r() * 6.28, rx: r() * 6.28, rz: r() * 6.28, c: tint[Math.floor(r() * tint.length)] });
      }
      if (type === "blossom") for (let k = 0; k < 10; k++) {
        const phi = r() * Math.PI * 2;
        leaves.push({ p: [x + Math.cos(phi) * R * 0.5, cy - R * 0.2, z + Math.sin(phi) * R * 0.5], s: R * 0.6, r: r() * 6, rx: r() * 6, c: "#c8d6a8" });
      }
    });
    return { trunks, cores, leaves, blossoms };
  }, []);
}

function useGrass() {
  return useMemo(() => {
    const r = mulberry32(31), out = [];
    const add = (n, ext, scale) => {
      for (let i = 0; i < n; i++) {
        const x = (r() * 2 - 1) * ext, z = (r() * 2 - 1) * ext;
        if (ext > INNER && Math.max(Math.abs(x), Math.abs(z)) < 22.8) continue;
        if (!isGrass(x, z, BANKS)) continue;
        const h = (0.55 + r() * 0.6) * scale;
        out.push({ p: [x, 0, z], s: [scale * (0.9 + r() * 0.4), h, 1], r: r() * Math.PI, c: GREENS[Math.floor(r() * 5)] });
      }
    };
    add(16000, INNER, 1);
    add(7000, 34, 1.4);
    return out;
  }, []);
}

function useBeds() {
  return useMemo(() => {
    const r = mulberry32(55), beds = [];
    BANKS.forEach(({ pos: [cx, cz] }) => {
      const fz = cz + D / 2 + 0.42;
      beds.push([cx - 2.95, fz, 1.7, 0.45], [cx + 2.95, fz, 1.7, 0.45]);
      beds.push([cx - W / 2 - 0.42, cz, 0.45, 3.6], [cx + W / 2 + 0.42, cz, 0.45, 3.6]);
      const z0 = cz + D / 2 + 1.25;
      beds.push([cx - 2.6, z0 + 0.6, 0.5, 1.0], [cx + 2.6, z0 + 0.6, 0.5, 1.0]);
    });
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => beds.push([sx * 3.55, sz * 3.55, 1.5, 1.5])));
    const soil = [], heads = [], leaves = [], rim = [];
    const PAL = [["#e4579c", "#f07ab6", "#ffffff"], ["#9b6bd6", "#b98ae8", "#e9e2f5"], ["#f3efe6", "#e4579c", "#ffd36b"]];
    beds.forEach(([x, z, w, d], k) => {
      soil.push({ p: [x, 0.07, z], s: [w, 0.1, d] });
      const pal = PAL[k % 3];
      const n = Math.round(w * d * 55);
      for (let i = 0; i < n; i++) {
        const px = x + (r() - 0.5) * (w - 0.08), pz = z + (r() - 0.5) * (d - 0.08);
        if (r() < 0.5) leaves.push({ p: [px, 0.16, pz], s: 0.08 + r() * 0.07, c: ["#3f6b2a", "#4f8034"][i % 2] });
        heads.push({ p: [px, 0.22 + r() * 0.14, pz], s: 0.045 + r() * 0.035, c: pal[Math.floor(r() * 3)] });
      }
      if (k >= beds.length - 4) {
        rim.push({ p: [x, 0.12, z - d / 2], s: [w + 0.12, 0.2, 0.08] }, { p: [x, 0.12, z + d / 2], s: [w + 0.12, 0.2, 0.08] });
        rim.push({ p: [x - w / 2, 0.12, z], s: [0.08, 0.2, d] }, { p: [x + w / 2, 0.12, z], s: [0.08, 0.2, d] });
      }
    });
    const shrubs = [];
    BANKS.forEach(({ pos: [cx, cz] }) => {
      [[-W / 2 - 0.6, -D / 2 - 0.5], [W / 2 + 0.6, -D / 2 - 0.5], [-W / 2 - 0.55, D / 2 + 0.6], [W / 2 + 0.55, D / 2 + 0.6]].forEach(([dx, dz]) => {
        shrubs.push({ p: [cx + dx, 0.32, cz + dz], s: [0.42, 0.36, 0.42], c: "#3b6528" });
      });
    });
    return { soil, heads, leaves, rim, shrubs };
  }, []);
}

export function Vegetation() {
  const t = useTrees(), g = useGrass(), b = useBeds();
  return (
    <group>
      <Instanced items={t.trunks} material={M.trunk} geometry={TRUNK} castShadow />
      <Instanced items={t.cores} material={M.leaf} geometry={CANOPY} receiveShadow />
      <Instanced items={t.leaves} material={M.leafCard} geometry={CARD} castShadow receiveShadow />
      <Instanced items={t.blossoms} material={M.blossomCard} geometry={CARD} castShadow receiveShadow />
      <Instanced items={g} material={M.grass} geometry={BLADE} receiveShadow />
      <Instanced items={b.soil} material={M.soil} receiveShadow />
      <Instanced items={b.rim} material={M.stoneDark} castShadow receiveShadow />
      <Instanced items={b.leaves} material={M.flower} geometry={SHRUB} />
      <Instanced items={b.heads} material={M.flower} geometry={HEAD} />
      <Instanced items={b.shrubs} material={M.leaf} geometry={SHRUB} castShadow />
    </group>
  );
}
