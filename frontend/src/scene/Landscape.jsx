import { useMemo } from "react";
import * as THREE from "three";
import { Instanced } from "./Instanced";
import { M, textTexture } from "./materials";
import { W, D, PLAZA, INNER } from "./layout";
import { BANKS } from "../sim/transactions";

const RD0 = INNER + 1, RD1 = RD0 + 3, MID = (RD0 + RD1) / 2;

function useStreets() {
  return useMemo(() => {
    const asphalt = [], walk = [], curb = [], mark = [];
    const L = RD1 * 2;
    [-1, 1].forEach((s) => {
      asphalt.push({ p: [0, 0.015, s * MID], s: [L, 0.03, 3] });
      asphalt.push({ p: [s * MID, 0.016, 0], s: [3, 0.03, RD0 * 2] });
      asphalt.push({ p: [0, 0.014, s * (RD1 + 40)], s: [3, 0.03, 80] });
      asphalt.push({ p: [s * (RD1 + 40), 0.013, 0], s: [80, 0.03, 3] });
      // sidewalks inner/outer
      walk.push({ p: [0, 0.06, s * (INNER + 0.5)], s: [INNER * 2 + 2, 0.12, 1] });
      walk.push({ p: [s * (INNER + 0.5), 0.061, 0], s: [1, 0.12, INNER * 2] });
      [-1, 1].forEach((q) => {
        walk.push({ p: [q * (RD1 + 3.5) / 2, 0.06, s * (RD1 + 0.5)], s: [RD1 - 0.5, 0.12, 1] });
        walk.push({ p: [s * (RD1 + 0.5), 0.061, q * (RD1 + 3.5) / 2], s: [1, 0.12, RD1 - 0.5] });
      });
      for (let x = -RD1 + 1; x < RD1 - 1; x += 1.6) {
        if (Math.abs(x) < 2.6 || Math.abs(Math.abs(x) - MID) < 2) continue;
        mark.push({ p: [x, 0.035, s * MID], s: [0.8, 0.01, 0.1] });
        mark.push({ p: [s * MID, 0.036, x], s: [0.1, 0.01, 0.8] });
      }
      for (let k = -1; k <= 1.01; k += 0.42) {
        mark.push({ p: [k, 0.035, s * MID], s: [0.24, 0.01, 2.4] });
        mark.push({ p: [s * MID, 0.036, k], s: [2.4, 0.01, 0.24] });
      }
    });
    return { asphalt, walk, curb, mark };
  }, []);
}

function usePaving() {
  return useMemo(() => {
    const pave = [], plaza = [], stones = [];
    [-1, 1].forEach((s) => {
      const len = INNER - PLAZA;
      pave.push({ p: [0, 0.03, s * (PLAZA + len / 2)], s: [2.4, 0.06, len] });
      pave.push({ p: [s * (PLAZA + len / 2), 0.031, 0], s: [len, 0.06, 2.4] });
    });
    plaza.push({ p: [0, 0.035, 0], s: [PLAZA * 2, 0.07, PLAZA * 2] });
    BANKS.forEach(({ pos: [cx, cz] }) => {
      pave.push({ p: [cx, 0.045, cz], s: [W + 2.2, 0.09, D + 2.2] });
      const z0 = cz + D / 2 + 1.1, z1 = cz < 0 ? -PLAZA : INNER;
      pave.push({ p: [cx, 0.044, (z0 + z1) / 2], s: [4.6, 0.088, z1 - z0] });
      const sx = Math.sign(cx);
      pave.push({ p: [sx * 3.6, 0.032, cz], s: [4.4, 0.064, 1.1] });
      for (let i = 0; i < 4; i++) stones.push({ p: [cx + sx * (-W / 2 - 1.6 - i * 0.0), 0.05, cz - D / 2 - 1.6 - i * 0.75], s: [0.7, 0.05, 0.45] });
    });
    return { pave, plaza, stones };
  }, []);
}

function useHedges() {
  return useMemo(() => {
    const h = [];
    const r = mul(5);
    const seg = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const c = ["#355f26", "#3c6a2a", "#2f5823"][Math.floor(r() * 3)];
      h.push({ p: [(x0 + x1) / 2, 0.28, (z0 + z1) / 2], s: [Math.abs(x1 - x0) || 0.42, 0.5, Math.abs(z1 - z0) || 0.42], c, len });
    };
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
      // along avenues (both axes), leaving gaps
      seg(sx * 1.65, sz * 6.2, sx * 1.65, sz * 9.6);
      seg(sx * 1.65, sz * 12.4, sx * 1.65, sz * 16.8);
      seg(sx * 6.2, sz * 1.65, sx * 9.0, sz * 1.65);
      seg(sx * 13.0, sz * 1.65, sx * 16.8, sz * 1.65);
      // along outer sidewalk
      const fr = sz > 0;
      seg(sx * 2.0, sz * 17.1, sx * (fr ? 8.4 : 16.9), sz * 17.1);
      if (fr) seg(sx * 13.6, sz * 17.1, sx * 16.9, sz * 17.1);
      seg(sx * 17.1, sz * 2.0, sx * 17.1, sz * 16.9);
    }));
    return h;
  }, []);
}

const mul = (seed) => { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const ROUND = new THREE.CylinderGeometry(1, 1, 1, 64);
const RINGG = new THREE.RingGeometry(0.96, 1, 64);

function BankSign({ bank }) {
  const tex = useMemo(() => textTexture(bank.name, { color: "#f4ead6", bg: "#2b3446", size: 60, spacing: 6, w: 512, h: 128 }), [bank.name]);
  const [cx, cz] = bank.pos;
  return (
    <group position={[cx + 3.1, 0, cz + D / 2 + 2.6]} rotation-y={-0.25}>
      <mesh position={[0, 0.3, 0]} material={M.stoneDark} castShadow><boxGeometry args={[1.5, 0.6, 0.22]} /></mesh>
      <mesh position={[0, 0.34, 0.115]}><planeGeometry args={[1.3, 0.34]} /><meshStandardMaterial map={tex} roughness={0.5} metalness={0.2} /></mesh>
    </group>
  );
}

export function Landscape() {
  const st = useStreets(), pv = usePaving(), hedges = useHedges();
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={M.grassGround} receiveShadow><planeGeometry args={[260, 260]} /></mesh>
      <Instanced items={st.asphalt} material={M.asphalt} receiveShadow />
      <Instanced items={st.walk} material={M.paver} receiveShadow />
      <Instanced items={st.mark} material={M.marking} />
      <Instanced items={pv.pave} material={M.paver} receiveShadow />
      <Instanced items={pv.plaza} material={M.plaza} receiveShadow />
      <Instanced items={pv.stones} material={M.plaza} receiveShadow />
      <mesh geometry={ROUND} material={M.plaza} position={[0, 0.075, 0]} scale={[3.3, 0.02, 3.3]} receiveShadow />
      {[3.3, 2.9].map((r) => (
        <mesh key={r} geometry={RINGG} rotation-x={-Math.PI / 2} position-y={0.087} scale={r}><meshStandardMaterial color="#a8987c" roughness={0.9} /></mesh>
      ))}
      <Instanced items={hedges} material={M.hedge} castShadow receiveShadow />
      {BANKS.map((b) => <BankSign key={b.id} bank={b} />)}
    </group>
  );
}
