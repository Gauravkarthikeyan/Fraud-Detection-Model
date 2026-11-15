import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instanced } from "./Instanced";
import { M, textTexture } from "./materials";
import { W, D, H, BASE, TOP } from "./layout";
import { useSim } from "../sim/store";

const COLUMN = new THREE.CylinderGeometry(0.15, 0.17, 1, 18);
const ICO = new THREE.IcosahedronGeometry(1, 1);
const RING = new THREE.TorusGeometry(0.55, 0.045, 10, 48);
const DISC = new THREE.CircleGeometry(0.42, 40);
const FD = D / 2; // front wall z

function roofGeometry() {
  const g = new THREE.CylinderGeometry((D / 2) * 0.55 * Math.SQRT2, (D / 2 - 0.05) * Math.SQRT2, 0.5, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale((W - 0.1) / D, 1, 1);
  return g;
}
function pedimentGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-2.1, 0); s.lineTo(2.1, 0); s.lineTo(0, 0.82); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: false });
}
const ROOF_GEO = roofGeometry();
const PED_GEO = pedimentGeometry();

function windowSet(list, glass, dark, light, x, y, z, h, face) {
  const side = face !== "z";
  glass.push({ p: [x, y, z], s: side ? [0.06, h, 0.6] : [0.6, h, 0.06] });
  dark.push({ p: [x, y, z - (face === "z" ? 0.015 : 0) * 1], s: side ? [0.045, h + 0.2, 0.78] : [0.78, h + 0.2, 0.045] });
  light.push({ p: [x, y + h / 2 + 0.12, z], s: side ? [0.1, 0.09, 0.9] : [0.9, 0.09, 0.1] });
  light.push({ p: [x, y - h / 2 - 0.08, z], s: side ? [0.12, 0.06, 0.85] : [0.85, 0.06, 0.12] });
}

function buildLists(variant) {
  const dark = [], light = [], glass = [], bronze = [], cols = [], ivy = [], metal = [];
  dark.push({ p: [0, BASE / 2, 0], s: [W + 0.5, BASE, D + 0.5] });
  dark.push({ p: [0, BASE + 1.28, 0], s: [W + 0.14, 0.12, D + 0.14] });
  dark.push({ p: [0, TOP + 0.1, 0], s: [W + 0.46, 0.2, D + 0.46] });
  light.push({ p: [0, TOP - 0.05, 0], s: [W + 0.26, 0.12, D + 0.26] });
  // parapet
  [[0, FD + 0.08, W + 0.3, 0.16], [0, -FD - 0.08, W + 0.3, 0.16]].forEach(([x, z, sx, sz]) => light.push({ p: [x, TOP + 0.36, z], s: [sx, 0.32, sz] }));
  [[W / 2 + 0.08], [-W / 2 - 0.08]].forEach(([x]) => light.push({ p: [x, TOP + 0.36, 0], s: [0.16, 0.32, D + 0.3] }));
  // portico floor + steps
  dark.push({ p: [0, BASE / 2, FD + 0.6], s: [4.3, BASE, 1.25] });
  for (let i = 0; i < 3; i++) dark.push({ p: [0, (BASE * (3 - i)) / 6, FD + 1.35 + i * 0.3], s: [3.6 - i * 0.0, (BASE * (3 - i)) / 3, 0.3] });
  // windows front wings
  const yF = [BASE + 0.62, BASE + 1.9], hF = [0.95, 0.8];
  [-3.25, -2.4, 2.4, 3.25].forEach((x) => yF.forEach((y, k) => windowSet(null, glass, dark, light, x, y, FD + 0.03, hF[k], "z")));
  [-3.25, -2.4, 2.4, 3.25].forEach((x) => yF.forEach((y, k) => windowSet(null, glass, dark, light, x, y, -FD - 0.03, hF[k], "z")));
  [-1.7, -0.6, 0.5, 1.6].forEach((z) => yF.forEach((y, k) => {
    windowSet(null, glass, dark, light, W / 2 + 0.03, y, z, hF[k], "x");
    windowSet(null, glass, dark, light, -W / 2 - 0.03, y, z, hF[k], "x");
  }));
  [-1.0, 1.0].forEach((x) => windowSet(null, glass, dark, light, x, BASE + 0.62, FD + 0.03, 0.95, "z"));
  // pilasters
  [-3.72, -2.83, -1.97, 1.97, 2.83, 3.72].forEach((x) => light.push({ p: [x, BASE + H / 2, FD + 0.05], s: [0.2, H, 0.1] }));
  [-2.42, 0, 2.42].forEach((z) => [W / 2 + 0.05, -W / 2 - 0.05].forEach((x) => light.push({ p: [x, BASE + H / 2, z], s: [0.1, H, 0.2] })));
  // door
  bronze.push({ p: [0, BASE + 0.78, FD + 0.03], s: [0.95, 1.55, 0.06] });
  glass.push({ p: [0, BASE + 1.82, FD + 0.03], s: [0.95, 0.38, 0.05] });
  light.push({ p: [0, BASE + 1.6, FD + 0.06], s: [1.15, 0.1, 0.08] });
  // columns
  const n = variant.columns;
  for (let i = 0; i < n; i++) {
    const x = -1.65 + (3.3 * i) / (n - 1);
    cols.push({ p: [x, BASE + 0.12 + (H - 0.5) / 2, FD + 1.0], s: [1, H - 0.5, 1] });
    dark.push({ p: [x, BASE + 0.06, FD + 1.0], s: [0.44, 0.12, 0.44] });
    light.push({ p: [x, TOP - 0.42, FD + 1.0], s: [0.44, 0.12, 0.44] });
  }
  light.push({ p: [0, TOP - 0.17, FD + 0.62], s: [4.2, 0.42, 1.32] });
  dark.push({ p: [0, TOP + 0.08, FD + 0.62], s: [4.4, 0.12, 1.42] });
  // rooftop features
  if (variant.roof === "skylight") { glass.push({ p: [-2.2, TOP + 0.85, -0.6], s: [1.2, 0.2, 0.9] }); metal.push({ p: [-2.2, TOP + 0.72, -0.6], s: [1.35, 0.1, 1.05] }); }
  if (variant.roof === "hvac") { metal.push({ p: [2.3, TOP + 0.82, -0.7], s: [0.8, 0.35, 0.6] }); metal.push({ p: [-2.3, TOP + 0.8, -0.8], s: [0.6, 0.3, 0.5] }); }
  if (variant.roof === "cupola") { light.push({ p: [-2.4, TOP + 0.9, -0.5], s: [0.8, 0.5, 0.8] }); dark.push({ p: [-2.4, TOP + 1.2, -0.5], s: [0.95, 0.1, 0.95] }); }
  if (variant.roof === "flag") { metal.push({ p: [2.6, TOP + 1.6, -1.2], s: [0.05, 2.0, 0.05] }); }
  // ivy clusters
  const r = mulberry(variant.seed);
  [[-3.72, FD + 0.12], [3.72, FD + 0.12], [-1.97, FD + 0.12], [1.97, FD + 0.12], [W / 2 + 0.12, 2.42], [-W / 2 - 0.12, 2.42]].forEach(([x, z], k) => {
    if (k > 1 && r() < 0.35) return;
    const top = BASE + 0.6 + r() * (H - 0.5);
    for (let y = BASE + 0.1; y < top; y += 0.2) {
      ivy.push({ p: [x + (r() - 0.5) * 0.25, y, z + (r() - 0.5) * 0.08], s: 0.1 + r() * 0.1, c: ["#3f6b2a", "#4d7c31", "#35602a", "#5a8a38"][Math.floor(r() * 4)] });
    }
  });
  return { dark, light, glass, bronze, cols, ivy, metal };
}

function mulberry(seed) {
  let a = seed;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const VARIANTS = {
  alpha: { columns: 4, roof: "skylight", seed: 11 },
  metro: { columns: 6, roof: "hvac", seed: 23 },
  unity: { columns: 4, roof: "cupola", seed: 37 },
  national: { columns: 6, roof: "flag", seed: 53 },
};

function AnchorRing({ alert }) {
  const mat = useRef();
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const c = alert === "fraud" ? "#ff4040" : alert === "suspicious" ? "#ffb020" : "#58b6ff";
    mat.current.color.set(c);
    mat.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 2) * 0.15;
  });
  return (
    <group position={[0, TOP + 0.72, 0]}>
      <mesh geometry={RING} rotation-x={-Math.PI / 2}><meshBasicMaterial ref={mat} color="#58b6ff" transparent toneMapped={false} /></mesh>
      <mesh geometry={DISC} rotation-x={-Math.PI / 2} position-y={-0.01}><meshBasicMaterial color="#8fd4ff" transparent opacity={0.35} toneMapped={false} /></mesh>
    </group>
  );
}

function SelectionFrame({ on }) {
  const ref = useRef();
  useFrame(() => { if (ref.current) ref.current.opacity += ((on ? 0.9 : 0) - ref.current.opacity) * 0.12; });
  const sx = W + 2.3, sz = D + 2.3, t = 0.08;
  const items = useMemo(() => [
    { p: [0, 0.1, sz / 2], s: [sx, 0.04, t] }, { p: [0, 0.1, -sz / 2], s: [sx, 0.04, t] },
    { p: [sx / 2, 0.1, 0], s: [t, 0.04, sz] }, { p: [-sx / 2, 0.1, 0], s: [t, 0.04, sz] },
  ], [sx, sz]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#6cc4ff", transparent: true, opacity: 0, toneMapped: false }), []);
  ref.current = mat;
  return <Instanced items={items} material={mat} />;
}

export function BankBuilding({ bank }) {
  const L = useMemo(() => buildLists(VARIANTS[bank.id]), [bank.id]);
  const frieze = useMemo(() => textTexture(bank.name.toUpperCase(), { color: "#5a4630", size: 74 }), [bank.name]);
  const select = useSim((s) => s.select);
  const selected = useSim((s) => s.selected === bank.id);
  const alert = useSim((s) => s.bankAlert[bank.id]);
  return (
    <group position={[bank.pos[0], 0, bank.pos[1]]}
      onClick={(e) => { e.stopPropagation(); select(bank.id); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}>
      <mesh position={[0, BASE + H / 2, 0]} material={M.stoneWall} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <Instanced items={L.dark} material={M.stoneDark} castShadow receiveShadow />
      <Instanced items={L.light} material={M.stone} castShadow receiveShadow />
      <Instanced items={L.glass} material={M.windowGlass} />
      <Instanced items={L.bronze} material={M.bronze} />
      <Instanced items={L.metal} material={M.metal} castShadow />
      <Instanced items={L.cols} material={M.stone} geometry={COLUMN} castShadow receiveShadow />
      <Instanced items={L.ivy} material={M.leaf} geometry={ICO} />
      <mesh geometry={ROOF_GEO} material={M.roof} position={[0, TOP + 0.45, 0]} castShadow receiveShadow />
      <mesh material={M.roofDark} position={[0, TOP + 0.22, 0]} receiveShadow><boxGeometry args={[W, 0.06, D]} /></mesh>
      <mesh geometry={PED_GEO} material={M.stone} position={[0, TOP + 0.14, FD - 0.03]} castShadow />
      <mesh position={[0, TOP - 0.17, FD + 1.29]}>
        <planeGeometry args={[3.6, 0.36]} />
        <meshStandardMaterial map={frieze} transparent roughness={0.8} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <AnchorRing alert={alert} />
      <SelectionFrame on={selected} />
    </group>
  );
}
