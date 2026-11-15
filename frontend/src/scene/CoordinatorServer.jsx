import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instanced } from "./Instanced";
import { M, textTexture } from "./materials";
import { AIR } from "./layout";
import { engine, useSim } from "../sim/store";

const TOWER_H = 7.2, HALF = 1.0, BASE_H = 0.45;

const ledVS = `varying float vSeed; varying vec2 vUv;
void main(){ vUv = uv; vec4 w = instanceMatrix * vec4(position, 1.0);
  vSeed = fract(sin(dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  gl_Position = projectionMatrix * modelViewMatrix * w; }`;
const ledFS = `uniform float uTime; uniform float uPulse; uniform vec3 uTint; varying float vSeed;
void main(){ float rate = 1.5 + vSeed * 7.0; float on = step(0.42, fract(uTime * rate * 0.35 + vSeed * 9.0));
  vec3 base = mix(vec3(0.2, 1.0, 0.55), vec3(0.3, 0.75, 1.0), step(0.55, vSeed));
  base = mix(base, uTint, uPulse * 0.85);
  gl_FragColor = vec4(base * (0.25 + on * (1.6 + uPulse * 2.0)), 1.0); }`;

function useLeds() {
  return useMemo(() => {
    const items = [];
    const faces = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    faces.forEach(([fx, fz]) => {
      for (let c = 0; c < 4; c++) for (let r = 0; r < 26; r++) {
        const y = BASE_H + 0.5 + r * 0.24;
        if (Math.abs(y - AIR) < 0.45) continue;
        const u = -0.66 + c * 0.44;
        for (let k = 0; k < 3; k++) {
          const off = (k - 1) * 0.1;
          const x = fz ? u + off : fx * (HALF + 0.012), z = fz ? fz * (HALF + 0.012) : u + off;
          items.push({ p: [x, y, z], s: fz ? [0.05, 0.035, 0.01] : [0.01, 0.035, 0.05] });
        }
      }
    });
    return items;
  }, []);
}

function useRacks() {
  return useMemo(() => {
    const dark = [], metal = [];
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([fx, fz]) => {
      for (let c = 0; c < 4; c++) {
        const u = -0.66 + c * 0.44;
        const p = fz ? [u, BASE_H + TOWER_H / 2, fz * (HALF + 0.004)] : [fx * (HALF + 0.004), BASE_H + TOWER_H / 2, u];
        dark.push({ p, s: fz ? [0.4, TOWER_H - 0.4, 0.01] : [0.01, TOWER_H - 0.4, 0.4] });
      }
      for (let r = 0; r < 9; r++) {
        const y = BASE_H + 0.3 + r * 0.8;
        metal.push({ p: fz ? [0, y, fz * (HALF + 0.02)] : [fx * (HALF + 0.02), y, 0], s: fz ? [2.0, 0.03, 0.03] : [0.03, 0.03, 2.0] });
      }
    });
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      metal.push({ p: [a * 1.55, 0.55, b * 1.55], s: [0.7, 0.5, 0.7] });
    });
    return { dark, metal };
  }, []);
}

export function CoordinatorServer() {
  const leds = useLeds(), racks = useRacks();
  const toggle = useSim((s) => s.toggleDrawer);
  const ledMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ledVS, fragmentShader: ledFS, toneMapped: false,
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 }, uTint: { value: new THREE.Color("#5fd0ff") } },
  }), []);
  const stripMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.6, 2.6), toneMapped: false }), []);
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#bfe0ff", roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.18, clearcoat: 1, depthWrite: false, envMapIntensity: 2.2 }), []);
  const label = useMemo(() => textTexture("FEDERATED COORDINATOR", { color: "#cfe9ff", bg: "#0b1424", size: 46, spacing: 8, w: 1024, h: 96, font: "700 {s}px 'Plus Jakarta Sans', sans-serif" }), []);
  const crown = useRef(), core = useRef();
  const base = useMemo(() => new THREE.Color(0.5, 1.6, 2.6), []), tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }, dt) => {
    const k = Math.max(0, 1 - (engine.time - engine.coordPulse) / 1.8);
    const busy = useSim.getState().coord !== "idle";
    ledMat.uniforms.uTime.value = clock.elapsedTime;
    ledMat.uniforms.uPulse.value = Math.max(k, busy ? 0.35 : 0);
    ledMat.uniforms.uTint.value.set(engine.coordColor);
    tmp.set(engine.coordColor).multiplyScalar(2.6);
    stripMat.color.copy(base).lerp(tmp, k);
    if (crown.current) crown.current.rotation.z += dt * (0.3 + k * 2.5);
    if (core.current) core.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.2) * 0.06 + k * 0.35);
  });
  const top = BASE_H + TOWER_H;
  return (
    <group
      onClick={(e) => { e.stopPropagation(); toggle("intel"); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
      <mesh position={[0, BASE_H / 2, 0]} material={M.stoneDark} castShadow receiveShadow><boxGeometry args={[3.6, BASE_H, 3.6]} /></mesh>
      <mesh position={[0, BASE_H + 0.06, 0]} material={M.darkMetal} receiveShadow><boxGeometry args={[2.7, 0.12, 2.7]} /></mesh>
      <mesh position={[0, BASE_H + TOWER_H / 2, 0]} material={M.darkMetal} castShadow><boxGeometry args={[HALF * 2, TOWER_H, HALF * 2]} /></mesh>
      <Instanced items={racks.dark} material={M.roofDark} />
      <Instanced items={racks.metal} material={M.metal} castShadow />
      <Instanced items={leds} material={ledMat} />
      {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => (
        <mesh key={`${a}${b}`} position={[a * (HALF + 0.03), BASE_H + TOWER_H / 2, b * (HALF + 0.03)]} material={stripMat}><boxGeometry args={[0.05, TOWER_H, 0.05]} /></mesh>
      ))}
      <mesh position={[0, BASE_H + TOWER_H / 2 + 0.05, 0]} material={glass} renderOrder={2}><boxGeometry args={[HALF * 2 + 0.3, TOWER_H + 0.1, HALF * 2 + 0.3]} /></mesh>
      <mesh position={[0, top + 0.12, 0]} material={M.metal} castShadow><boxGeometry args={[2.5, 0.24, 2.5]} /></mesh>
      <group position={[0, top + 0.9, 0]}>
        <mesh ref={crown} rotation-x={Math.PI / 2} material={M.metal}><torusGeometry args={[0.85, 0.07, 14, 64]} /></mesh>
        <mesh rotation-x={Math.PI / 2}><torusGeometry args={[1.05, 0.025, 8, 64]} /><primitive object={stripMat} attach="material" /></mesh>
        <mesh ref={core} material={stripMat}><icosahedronGeometry args={[0.32, 2]} /></mesh>
        <mesh position-y={-0.5} material={M.darkMetal}><cylinderGeometry args={[0.12, 0.2, 0.6, 12]} /></mesh>
      </group>
      {[[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]].map(([fx, fz, r]) => (
        <group key={r} position={[fx * (HALF + 0.12), AIR, fz * (HALF + 0.12)]} rotation-y={r}>
          <mesh rotation-x={Math.PI / 2} material={M.metal}><cylinderGeometry args={[0.46, 0.46, 0.18, 24]} /></mesh>
          <mesh rotation-x={Math.PI / 2} material={stripMat} position-z={0.02}><torusGeometry args={[0.4, 0.03, 8, 32]} /></mesh>
        </group>
      ))}
      <mesh position={[0, BASE_H + 0.35, 1.81]}><planeGeometry args={[2.6, 0.26]} /><meshBasicMaterial map={label} toneMapped={false} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.1}><ringGeometry args={[2.38, 2.5, 64]} /><meshBasicMaterial color={[0.4, 1.3, 2.0]} transparent opacity={0.45} toneMapped={false} /></mesh>
    </group>
  );
}
