import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instanced } from "./Instanced";
import { M } from "./materials";
import { R, PIPE_Y, SPOKE_END, roundedCurve, routePoints } from "./layout";
import { BANKS } from "../sim/transactions";
import { engine, useSim } from "../sim/store";

const SHELL_R = 0.17, CORE_R = 0.075;
const shellMat = new THREE.MeshPhysicalMaterial({
  color: "#cfe8ff", roughness: 0.06, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1,
  emissive: "#2b7dff", emissiveIntensity: 0.18, depthWrite: false, envMapIntensity: 1.8,
});
const coreVS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const coreFS = `uniform float uTime; uniform vec3 uColor; uniform float uLen; uniform float uSpeed; uniform float uDir; uniform float uBoost;
varying vec2 vUv;
void main(){ float x=vUv.x*uLen; float s=fract(x/1.1 - uTime*uSpeed*uDir);
 float pulse=smoothstep(0.0,0.12,s)*smoothstep(0.55,0.12,s);
 float rim=0.65+0.35*sin(vUv.y*6.2831);
 vec3 c=uColor*(0.55+pulse*(1.3+uBoost))*rim; gl_FragColor=vec4(c,1.0); }`;

const BLUE = new THREE.Color("#3f9cff");

function GlassDataPipe({ curve, closed = false, bank = null }) {
  const len = curve.getLength();
  const { shell, core, mat } = useMemo(() => {
    const seg = Math.max(24, Math.round(len * 6));
    const mat = new THREE.ShaderMaterial({
      vertexShader: coreVS, fragmentShader: coreFS, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uColor: { value: BLUE.clone() }, uLen: { value: len }, uSpeed: { value: 0.3 }, uDir: { value: 1 }, uBoost: { value: 0 } },
    });
    return { shell: new THREE.TubeGeometry(curve, seg, SHELL_R, 14, closed), core: new THREE.TubeGeometry(curve, seg, CORE_R, 8, closed), mat };
  }, [curve, len, closed]);
  const tgt = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => {
    const running = useSim.getState().running;
    const u = mat.uniforms;
    u.uTime.value += dt;
    u.uSpeed.value += ((running ? 0.9 : 0.28) - u.uSpeed.value) * 0.05;
    const p = bank && engine.pipes[bank];
    const active = p && engine.time < p.until;
    tgt.copy(active ? new THREE.Color(p.color) : BLUE);
    u.uColor.value.lerp(tgt, 0.08);
    u.uDir.value = active ? p.dir : 1;
    u.uBoost.value += ((active ? 1.2 : running ? 0.4 : 0) - u.uBoost.value) * 0.06;
  });
  return (
    <group>
      <mesh geometry={core} material={mat} />
      <mesh geometry={shell} material={shellMat} renderOrder={2} />
    </group>
  );
}

const COLLAR = new THREE.CylinderGeometry(SHELL_R + 0.035, SHELL_R + 0.035, 0.09, 16);
const POST = new THREE.CylinderGeometry(0.04, 0.05, 1, 8);

function useHardware(curves) {
  return useMemo(() => {
    const posts = [], collars = [], nodes = [], glows = [];
    const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), e = new THREE.Euler();
    curves.forEach((c) => {
      const L = c.getLength(), n = Math.floor(L / 2.2);
      for (let i = 1; i < n; i++) {
        const t = i / n, p = c.getPointAt(t), tan = c.getTangentAt(t);
        posts.push({ p: [p.x, PIPE_Y / 2 - 0.05, p.z], s: [1, PIPE_Y - 0.1, 1] });
        q.setFromUnitVectors(up, tan); e.setFromQuaternion(q);
        collars.push({ p: [p.x, p.y, p.z], rx: e.x, r: e.y, rz: e.z });
      }
    });
    const pts = [];
    [-1, 1].forEach((a) => [-1, 1].forEach((b) => pts.push([a * R, b * R])));
    pts.push([-R, 0], [R, 0], [0, -R], [0, R]);
    pts.forEach(([x, z]) => {
      nodes.push({ p: [x, PIPE_Y, z], s: [0.58, 0.52, 0.58] });
      glows.push({ p: [x, PIPE_Y, z], s: [0.3, 0.3, 0.3] });
      posts.push({ p: [x, 0.1, z], s: [0.72, 0.12, 0.72] });
    });
    [[-SPOKE_END, 0], [SPOKE_END, 0], [0, -SPOKE_END], [0, SPOKE_END]].forEach(([x, z]) => {
      nodes.push({ p: [x, PIPE_Y, z], s: [0.42, 0.42, 0.42] });
      glows.push({ p: [x, PIPE_Y, z], s: [0.2, 0.2, 0.2] });
    });
    return { posts, collars, nodes, glows };
  }, [curves]);
}

const nodeMat = new THREE.MeshPhysicalMaterial({ color: "#d8ecff", roughness: 0.08, transparent: true, opacity: 0.4, clearcoat: 1, depthWrite: false });
const glowMat = new THREE.MeshBasicMaterial({ color: "#58b8ff", toneMapped: false });

// Signals: bright pulses that physically travel along the route tubes.
function DataFlowParticles({ routes }) {
  const ref = useRef();
  const POOL = 14, TRAIL = 6;
  const geo = useMemo(() => new THREE.SphereGeometry(0.11, 12, 10), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, depthWrite: false }), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []), col = useMemo(() => new THREE.Color(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const list = engine.signals.slice(-POOL);
    for (let i = 0; i < POOL; i++) {
      const s = list[i];
      for (let k = 0; k < TRAIL; k++) {
        const idx = i * TRAIL + k;
        if (!s) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(idx, m4); continue; }
        const u = Math.min(1, Math.max(0, (engine.time - s.start) / s.dur));
        const route = routes[s.bank];
        let t = (s.dir === "in" ? u : 1 - u) - (s.dir === "in" ? 1 : -1) * k * 0.012;
        t = Math.min(1, Math.max(0, t));
        route.getPointAt(t, p);
        const sc = (1 - k / TRAIL) * (k === 0 ? 1.0 : 0.8);
        m4.makeScale(sc, sc, sc).setPosition(p);
        mesh.setMatrixAt(idx, m4);
        mesh.setColorAt(idx, col.set(s.color).multiplyScalar(k === 0 ? 1.6 : 1.1 - k * 0.12));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, POOL * TRAIL]} frustumCulled={false} renderOrder={3} />;
}

export function DataNetwork() {
  const net = useMemo(() => {
    const ring = roundedCurve([[-R, -R], [R, -R], [R, R], [-R, R]], 0.9, PIPE_Y, true);
    const routes = {}, feeders = [], spokes = [];
    BANKS.forEach((b) => {
      const pts = routePoints(b.id, b.pos);
      routes[b.id] = roundedCurve(pts, 0.8);
      feeders.push([b.id, roundedCurve(pts.slice(0, 3), 0.8)]);
      spokes.push([b.id, roundedCurve(pts.slice(3), 0.8)]);
    });
    return { ring, routes, feeders, spokes };
  }, []);
  const hw = useHardware(useMemo(() => [net.ring, ...net.feeders.map((f) => f[1]), ...net.spokes.map((s) => s[1])], [net]));
  return (
    <group>
      <GlassDataPipe curve={net.ring} closed />
      {net.feeders.map(([id, c]) => <GlassDataPipe key={`f${id}`} curve={c} bank={id} />)}
      {net.spokes.map(([id, c]) => <GlassDataPipe key={`s${id}`} curve={c} bank={id} />)}
      <Instanced items={hw.posts} material={M.darkMetal} geometry={POST} castShadow />
      <Instanced items={hw.collars} material={M.metal} geometry={COLLAR} />
      <Instanced items={hw.glows} material={glowMat} />
      <Instanced items={hw.nodes} material={nodeMat} renderOrder={2} />
      <DataFlowParticles routes={net.routes} />
    </group>
  );
}
