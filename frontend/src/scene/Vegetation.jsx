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
  for (let i = 0; i < 120; i++) {
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
    const trunks = [], green = [], pink = [];
    treeSpots().forEach(([x, z, type, sc]) => {
      const th = (type === "orn" ? 0.9 : type === "blossom" ? 1.3 : 1.6) * sc * (0.9 + r() * 0.25);
      const R = (type === "orn" ? 0.85 : type === "blossom" ? 1.45 : 1.65) * sc * (0.85 + r() * 0.3);
      trunks.push({ p: [x, 0, z], s: [sc * 1.2, th + R * 0.6, sc * 1.2], r: r() * 6 });
      const blobs = type === "orn" ? 3 : 6;
      const list = type === "blossom" ? pink : green;
      const pal = type === "blossom" ? PINKS : GREENS;
      for (let b = 0; b < blobs; b++) {
        const a = (b / blobs) * Math.PI * 2 + r();
        const off = b === 0 ? 0 : R * (0.45 + r() * 0.2);
        list.push({
          p: [x + Math.cos(a) * off, th + R * (0.75 + (b === 0 ? 0.35 : r() * 0.25)), z + Math.sin(a) * off],
          s: [R * (0.6 + r() * 0.2), R * (0.5 + r() * 0.18), R * (0.6 + r() * 0.2)], r: r() * 6,
          c: pal[Math.floor(r() * pal.length)],
        });
      }
      if (type === "blossom") for (let b = 0; b < 2; b++) green.push({ p: [x + (r() - 0.5), th + R * 0.45, z + (r() - 0.5)], s: R * 0.35, c: "#4d6e2e" });
    });
    return { trunks, green, pink };
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
      <Instanced items={t.green} material={M.leaf} geometry={CANOPY} castShadow receiveShadow />
      <Instanced items={t.pink} material={M.leaf} geometry={CANOPY} castShadow receiveShadow />
      <Instanced items={g} material={M.grass} geometry={BLADE} receiveShadow />
      <Instanced items={b.soil} material={M.soil} receiveShadow />
      <Instanced items={b.rim} material={M.stoneDark} castShadow receiveShadow />
      <Instanced items={b.leaves} material={M.flower} geometry={SHRUB} />
      <Instanced items={b.heads} material={M.flower} geometry={HEAD} />
      <Instanced items={b.shrubs} material={M.leaf} geometry={SHRUB} castShadow />
    </group>
  );
}
