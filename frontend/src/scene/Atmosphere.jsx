import { useMemo } from "react";
import * as THREE from "three";
import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export const SUN = new THREE.Vector3(-30, 17, 20);

const skyVS = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`;
const skyFS = `uniform vec3 uSun; uniform float uTime; varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
void main(){ vec3 d=normalize(vDir); float h=max(d.y,0.0);
 vec3 zenith=vec3(0.27,0.52,0.86), mid=vec3(0.56,0.74,0.93), horizon=vec3(0.99,0.86,0.68);
 vec3 col=mix(horizon, mid, smoothstep(0.0,0.16,h)); col=mix(col, zenith, smoothstep(0.16,0.7,h));
 float sd=max(dot(d, normalize(uSun)),0.0);
 col += vec3(1.0,0.7,0.4)*pow(sd,6.0)*0.35 + vec3(1.0,0.92,0.75)*pow(sd,400.0)*1.5;
 vec2 uv=d.xz/(d.y+0.15)*1.2 + vec2(uTime*0.003, uTime*0.001);
 float c=smoothstep(0.5,0.82,fbm(uv*1.4)); c*=smoothstep(0.02,0.22,h);
 vec3 cc=mix(vec3(1.0,0.96,0.92), vec3(1.0,0.82,0.62), pow(sd,1.5)*0.8);
 col=mix(col, cc, c*0.85);
 if(d.y<0.0) col=horizon;
 gl_FragColor=vec4(col,1.0); }`;

function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: skyVS, fragmentShader: skyFS, side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN.clone().normalize() }, uTime: { value: 0 } },
  }), []);
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt; });
  return <mesh material={mat} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[500, 32, 16]} /></mesh>;
}

export function Atmosphere() {
  return (
    <>
      <fog attach="fog" args={["#d9dccf", 95, 230]} />
      <hemisphereLight args={["#bcd6ff", "#6b5a3a", 0.35]} />
      
      <directionalLight
        position={SUN.toArray()} intensity={2.9} color="#ffcf98" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30}
        shadow-camera-near={1} shadow-camera-far={110}
      />
      <Environment files="/hdr/sky.hdr" background environmentIntensity={0.75} backgroundIntensity={0.95} backgroundRotation={[0, 2.2, 0]} environmentRotation={[0, 2.2, 0]} />
    </>
  );
}
