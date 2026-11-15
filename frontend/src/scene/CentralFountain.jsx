import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { M } from "./materials";
import { engine, useSim } from "../sim/store";
import { AIR } from "./layout";

const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const BASIN = lathe([[0, 0.1], [1.95, 0.1], [2.0, 0.2], [2.02, 0.5], [1.9, 0.56], [1.78, 0.52], [1.75, 0.3], [0, 0.3]]);
const BOWL2 = lathe([[0.18, 0], [0.5, 0.06], [0.82, 0.22], [0.9, 0.3], [0.84, 0.33], [0.5, 0.2], [0, 0.2]]);
const BOWL3 = lathe([[0.1, 0], [0.3, 0.05], [0.46, 0.17], [0.5, 0.22], [0.44, 0.24], [0, 0.14]]);
const PEDESTAL = lathe([[0.32, 0], [0.22, 0.12], [0.16, 0.5], [0.2, 0.9], [0.12, 1.0], [0, 1.0]], 32);
const SPIRE = lathe([[0.12, 0], [0.07, 0.25], [0.09, 0.45], [0.03, 0.62], [0, 0.66]], 24);

const waterVS = `varying vec2 vUv; varying vec3 vP; void main(){ vUv=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `;
const poolFS = `uniform float uTime; varying vec2 vUv; varying vec3 vP;
void main(){ float d=length(vUv-0.5)*2.0; float w=sin(d*34.0-uTime*2.4)*0.5+0.5; float w2=sin((vUv.x+vUv.y)*40.0+uTime*1.3)*0.5+0.5;
 vec3 deep=vec3(0.10,0.42,0.55), lite=vec3(0.55,0.86,0.95); vec3 c=mix(deep,lite,w*0.35+w2*0.15+ (1.0-d)*0.2);
 c += vec3(1.0,0.85,0.6)*pow(w*w2,6.0)*0.35; gl_FragColor=vec4(c,0.9); }`;
const fallFS = `uniform float uTime; varying vec2 vUv; void main(){ float s=fract(vUv.y*3.0+uTime*1.6); float st=sin(vUv.x*120.0)*0.5+0.5;
 float a=(0.18+0.25*smoothstep(0.0,0.6,s))*(0.6+0.4*st); gl_FragColor=vec4(vec3(0.78,0.93,1.0),a*smoothstep(0.0,0.15,vUv.y)); }`;

function useWaterMats() {
  return useMemo(() => {
    const u = { uTime: { value: 0 } };
    const pool = new THREE.ShaderMaterial({ uniforms: u, vertexShader: waterVS, fragmentShader: poolFS, transparent: true });
    const fall = new THREE.ShaderMaterial({ uniforms: u, vertexShader: waterVS, fragmentShader: fallFS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    return { u, pool, fall };
  }, []);
}

const hubGlass = new THREE.MeshPhysicalMaterial({ color: "#d6ecff", roughness: 0.05, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false, envMapIntensity: 2 });

function Coordinator() {
  const ring = useRef(), core = useRef(), halo = useRef();
  const toggle = useSim((s) => s.toggleDrawer);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = Math.max(0, 1 - (engine.time - engine.coordPulse) / 1.6);
    if (ring.current) ring.current.rotation.z += dt * (0.25 + k * 1.5);
    col.set("#5fd0ff").lerp(new THREE.Color(engine.coordColor), k);
    if (core.current) { core.current.color.copy(col); core.current.opacity = 0.55 + 0.25 * Math.sin(t * 2) + k * 0.2; }
    if (halo.current) { halo.current.color.copy(col); halo.current.opacity = 0.25 + k * 0.5; halo.current.needsUpdate = true; }
  });
  return (
    <group position={[0, AIR, 0]}
      onClick={(e) => { e.stopPropagation(); toggle("intel"); }}
      onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
      <mesh rotation-x={Math.PI / 2} material={M.metal}><torusGeometry args={[1.12, 0.09, 16, 64]} /></mesh>
      <mesh ref={ring} rotation-x={Math.PI / 2.3} material={M.gold}><torusGeometry args={[0.78, 0.03, 10, 64]} /></mesh>
      <mesh material={hubGlass}><sphereGeometry args={[0.62, 32, 20]} /></mesh>
      <mesh scale={[0.26, 0.4, 0.26]}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial ref={core} color="#5fd0ff" transparent toneMapped={false} /></mesh>
      <mesh position-y={-(0.62 + (AIR - 3.28) / 2)} material={M.metal}><cylinderGeometry args={[0.05, 0.08, AIR - 3.28, 10]} /></mesh>
      <mesh position-y={-(AIR - 0.09)} rotation-x={-Math.PI / 2}><ringGeometry args={[2.38, 2.5, 64]} /><meshBasicMaterial ref={halo} color="#5fd0ff" transparent opacity={0.3} toneMapped={false} /></mesh>
    </group>
  );
}

export function CentralFountain() {
  const w = useWaterMats();
  useFrame((_, dt) => { w.u.uTime.value += dt; });
  return (
    <group>
      <mesh geometry={BASIN} material={M.stone} castShadow receiveShadow />
      <mesh position-y={0.46} rotation-x={-Math.PI / 2} material={w.pool}><circleGeometry args={[1.78, 48]} /></mesh>
      <mesh geometry={PEDESTAL} material={M.stoneDark} position-y={0.3} castShadow />
      <mesh geometry={BOWL2} material={M.stone} position-y={1.18} castShadow receiveShadow />
      <mesh position-y={1.4} rotation-x={-Math.PI / 2} material={w.pool}><circleGeometry args={[0.8, 32]} /></mesh>
      <mesh position-y={0.92} material={w.fall}><cylinderGeometry args={[0.88, 1.25, 0.56, 40, 1, true]} /></mesh>
      <mesh geometry={PEDESTAL} material={M.stoneDark} position-y={1.38} scale={[0.6, 0.5, 0.6]} castShadow />
      <mesh geometry={BOWL3} material={M.stone} position-y={1.86} castShadow />
      <mesh position-y={2.02} rotation-x={-Math.PI / 2} material={w.pool}><circleGeometry args={[0.44, 24]} /></mesh>
      <mesh position-y={1.66} material={w.fall}><cylinderGeometry args={[0.47, 0.82, 0.38, 32, 1, true]} /></mesh>
      <mesh geometry={SPIRE} material={M.metal} position-y={2.0} />
      <Coordinator />
    </group>
  );
}
