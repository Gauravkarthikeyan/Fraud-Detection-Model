import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instanced } from "./Instanced";
import { M, BOX } from "./materials";
import { D, TOP, INNER } from "./layout";
import { BANKS } from "../sim/transactions";
import { engine, useSim } from "../sim/store";
import { mulberry32 } from "../sim/model";

const ROAD_MID = INNER + 2.5;
const LANE = [ROAD_MID - 0.7, ROAD_MID + 0.7];

// Closed rectangular loop on the ring road; t in [0,1)
function loopPoint(t, half, out) {
  const side = Math.floor(t * 4) % 4, f = (t * 4) % 1, a = -half + f * 2 * half;
  if (side === 0) out.set(a, 0, -half);
  else if (side === 1) out.set(half, 0, a);
  else if (side === 2) out.set(-a, 0, half);
  else out.set(-half, 0, -a);
  return side;
}

const bodyMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.08 });
const glassMat = new THREE.MeshStandardMaterial({ color: "#16202c", roughness: 0.05, metalness: 0.9 });
const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.0, 0.85), toneMapped: false });
const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.08, 0.05), toneMapped: false });
const CAR_COLORS = ["#e9ecef", "#1d2a3a", "#8c1c22", "#2f4f6f", "#c9c3b6", "#0f0f12", "#5b6770", "#1f5f4a"];

function Vehicles() {
  const N = 12;
  const cars = useMemo(() => {
    const r = mulberry32(4);
    return Array.from({ length: N }, (_, i) => ({
      lane: i % 2, t: r(), speed: 0.012 + r() * 0.006, van: i === 3 || i === 8,
      c: i === 3 || i === 8 ? "#23402f" : CAR_COLORS[Math.floor(r() * CAR_COLORS.length)],
    }));
  }, []);
  const body = useRef(), cab = useRef(), head = useRef(), tail = useRef(), stripe = useRef();
  const m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []), s = useMemo(() => new THREE.Vector3(), []), o = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []), col = useMemo(() => new THREE.Color(), []);
  const colored = useRef(false);
  useFrame((_, dt) => {
    if (!body.current) return;
    cars.forEach((c, i) => {
      const dir = c.lane ? 1 : -1;
      c.t = (c.t + dir * c.speed * dt * (c.van ? 0.8 : 1) + 1) % 1;
      const half = LANE[c.lane];
      const side = loopPoint(c.t, half, p);
      const ang = [0, -Math.PI / 2, Math.PI, Math.PI / 2][side] + (dir < 0 ? Math.PI : 0);
      q.setFromAxisAngle(up, ang);
      const L = c.van ? 1.55 : 1.3;
      const put = (mesh, dx, dy, dz, sx, sy, sz) => {
        o.set(dx, dy, dz).applyQuaternion(q).add(p);
        m.compose(o, q, s.set(sx, sy, sz));
        mesh.setMatrixAt(i, m);
      };
      put(body.current, 0, 0.3, 0, L, 0.34, 0.66);
      put(cab.current, c.van ? 0.05 : -0.08, c.van ? 0.68 : 0.6, 0, c.van ? L * 0.92 : L * 0.55, c.van ? 0.44 : 0.28, 0.6);
      put(head.current, L / 2 + 0.01, 0.34, 0, 0.03, 0.08, 0.5);
      put(tail.current, -L / 2 - 0.01, 0.34, 0, 0.03, 0.07, 0.52);
      put(stripe.current, 0, c.van ? 0.62 : 0.3, 0, c.van ? L * 0.94 : 0.05, c.van ? 0.06 : 0.05, c.van ? 0.62 : 0.05);
      if (!colored.current) body.current.setColorAt(i, col.set(c.c));
    });
    colored.current = true;
    [body, cab, head, tail, stripe].forEach((r) => { r.current.instanceMatrix.needsUpdate = true; });
    if (body.current.instanceColor) body.current.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={body} args={[BOX, bodyMat, N]} frustumCulled={false} />
      <instancedMesh ref={cab} args={[BOX, glassMat, N]} frustumCulled={false} />
      <instancedMesh ref={head} args={[BOX, headMat, N]} frustumCulled={false} />
      <instancedMesh ref={tail} args={[BOX, tailMat, N]} frustumCulled={false} />
      <instancedMesh ref={stripe} args={[BOX, M.gold, N]} frustumCulled={false} />
    </group>
  );
}

function tickerTexture() {
  const c = document.createElement("canvas");
  c.width = 2048; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#060b14"; g.fillRect(0, 0, c.width, c.height);
  g.font = "700 60px 'JetBrains Mono', monospace"; g.textBaseline = "middle";
  const items = [["SENSEX", "82,416.30", "+0.62%"], ["NIFTY 50", "25,108.75", "+0.48%"], ["BANK NIFTY", "56,212.10", "-0.21%"], ["USD/INR", "83.42", "+0.05%"], ["GOLD", "₹72,180", "+0.34%"], ["FRAUD BLOCKED", "₹4.2 Cr", "TODAY"]];
  let x = 30;
  items.forEach(([n, v, d]) => {
    g.fillStyle = "#9fb4d6"; g.fillText(n, x, 66); x += g.measureText(n).width + 22;
    g.fillStyle = "#ffffff"; g.fillText(v, x, 66); x += g.measureText(v).width + 18;
    g.fillStyle = d.startsWith("-") ? "#ff5a5a" : d === "TODAY" ? "#ffb020" : "#3ee28a"; g.fillText(d, x, 66); x += g.measureText(d).width + 70;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(0.5, 1);
  return t;
}

function TickerBoards() {
  const tex = useMemo(tickerTexture, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }), [tex]);
  useFrame((_, dt) => { tex.offset.x = (tex.offset.x + dt * 0.035) % 1; });
  const boards = [[-16.4, -16.4, Math.PI / 4], [16.4, -16.4, -Math.PI / 4]];
  return boards.map(([x, z, r]) => (
    <group key={x} position={[x, 0, z]} rotation-y={r}>
      {[-1.6, 1.6].map((dx) => <mesh key={dx} position={[dx, 1.6, -0.05]} material={M.darkMetal} castShadow><boxGeometry args={[0.12, 3.2, 0.12]} /></mesh>)}
      <mesh position={[0, 3.1, -0.06]} material={M.darkMetal} castShadow><boxGeometry args={[4.0, 0.9, 0.14]} /></mesh>
      <mesh position={[0, 3.1, 0.02]} material={mat}><planeGeometry args={[3.8, 0.7]} /></mesh>
    </group>
  ));
}

const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.1, 2.0), toneMapped: false });
function ATMs() {
  const items = useMemo(() => BANKS.flatMap(({ pos: [cx, cz] }) => [[cx + 1.7, cz + D / 2 + 0.25], [cx - 1.7, cz + D / 2 + 0.25]]), []);
  const bodies = useMemo(() => items.map(([x, z]) => ({ p: [x, BASE_Y + 0.55, z], s: [0.42, 1.1, 0.3] })), [items]);
  const screens = useMemo(() => items.map(([x, z]) => ({ p: [x, BASE_Y + 0.82, z + 0.152], s: [0.3, 0.22, 0.01] })), [items]);
  return (
    <group>
      <Instanced items={bodies} material={M.darkMetal} castShadow />
      <Instanced items={screens} material={screenMat} />
    </group>
  );
}
const BASE_Y = 0.35;

// Vertical light pillar from each rooftop anchor, plus alarm beacon + glow during fraud events.
const pillarVS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const pillarFS = `uniform vec3 uColor; uniform float uTime; uniform float uAmp; varying vec2 vUv;
void main(){ float f=pow(1.0-vUv.y,1.6); float band=0.6+0.4*sin(vUv.y*30.0-uTime*6.0); float a=f*band*uAmp*(0.55+0.45*sin(vUv.x*6.283*2.0+uTime)); gl_FragColor=vec4(uColor*2.0, a*0.55); }`;

function BankLights({ bank }) {
  const pillar = useRef(), light = useRef(), beacon = useRef();
  const alert = useSim((s) => s.bankAlert[bank.id]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: pillarVS, fragmentShader: pillarFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color("#58b6ff") }, uTime: { value: 0 }, uAmp: { value: 0.5 } },
  }), []);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    const c = alert === "fraud" ? "#ff3030" : alert === "suspicious" ? "#ffa820" : "#58b6ff";
    mat.uniforms.uColor.value.lerp(new THREE.Color(c), 0.08);
    mat.uniforms.uAmp.value += ((alert ? 1.3 : 0.45) - mat.uniforms.uAmp.value) * 0.06;
    if (light.current) {
      light.current.color.copy(mat.uniforms.uColor.value);
      light.current.intensity += ((alert ? 26 + Math.sin(t * 9) * 12 : 0) - light.current.intensity) * 0.15;
    }
    if (beacon.current) { beacon.current.visible = !!alert; beacon.current.rotation.y += dt * 5; }
  });
  const [x, z] = bank.pos;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, TOP + 0.72 + 0.6, 0]} material={mat}>
        <cylinderGeometry args={[0.3, 0.58, 1.2, 24, 1, true]} />
      </mesh>
      <pointLight ref={light} position={[0, TOP + 1.6, D / 2 + 2]} intensity={0} distance={14} decay={1.6} />
      <group ref={beacon} position={[2.8, TOP + 0.9, D / 2 - 0.3]} visible={false}>
        <mesh><sphereGeometry args={[0.12, 12, 10]} /><meshBasicMaterial color={[3, 0.3, 0.2]} toneMapped={false} /></mesh>
        <mesh position-x={0.9} rotation-z={Math.PI / 2}><coneGeometry args={[0.35, 1.8, 16, 1, true]} /><meshBasicMaterial color={[2, 0.2, 0.15]} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      </group>
    </group>
  );
}

// Expanding ground shockwaves at the coordinator whenever it aggregates or distributes fraud intelligence.
function Shockwaves() {
  const rings = useRef([]);
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: "#5fd0ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })), []);
  useFrame(() => {
    const age = engine.time - engine.coordPulse;
    mats.forEach((m, i) => {
      const a = age - i * 0.35;
      const mesh = rings.current[i];
      if (!mesh) return;
      if (a < 0 || a > 2.4) { m.opacity = 0; return; }
      const k = a / 2.4;
      mesh.scale.setScalar(1 + k * 16);
      m.color.set(engine.coordColor);
      m.opacity = (1 - k) * 0.9;
    });
  });
  return (
    <group position-y={0.12}>
      {mats.map((m, i) => (
        <mesh key={i} ref={(el) => (rings.current[i] = el)} material={m} rotation-x={-Math.PI / 2}><ringGeometry args={[0.92, 1, 96]} /></mesh>
      ))}
    </group>
  );
}

// Soft sun shafts streaming in from the golden-hour sun side.
const shaftFS = `uniform float uTime; varying vec2 vUv; void main(){ float edge=smoothstep(0.0,0.3,vUv.x)*smoothstep(1.0,0.7,vUv.x);
 float fall=smoothstep(0.0,0.6,vUv.y)*smoothstep(1.0,0.75,vUv.y); float flick=0.75+0.25*sin(uTime*0.4+vUv.x*5.0);
 gl_FragColor=vec4(vec3(1.0,0.78,0.48), edge*fall*flick*0.09); }`;
function SunShafts() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: pillarVS, fragmentShader: shaftFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 } } }), []);
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt; });
  const shafts = useMemo(() => [[-22, -8, 6], [-20, 2, 4.5], [-24, 10, 7], [-14, -18, 5]], []);
  return shafts.map(([x, z, w], i) => (
    <mesh key={i} material={mat} position={[x + 6, 9, z + 3]} rotation={[0, -0.6, 0.85]}><planeGeometry args={[w, 26]} /></mesh>
  ));
}

export function CityLife() {
  return (
    <group>
      <Vehicles />
      <TickerBoards />
      <ATMs />
      {BANKS.map((b) => <BankLights key={b.id} bank={b} />)}
      <Shockwaves />
      <SunShafts />
    </group>
  );
}

