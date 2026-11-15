import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, SMAA, Bloom, Vignette, ToneMapping, BrightnessContrast, HueSaturation } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { CityLife } from "./CityLife";
import { Atmosphere } from "./Atmosphere";
import { Landscape } from "./Landscape";
import { Vegetation } from "./Vegetation";
import { StreetFurniture } from "./Furniture";
import { BankBuilding } from "./BankBuilding";
import { BankTransactionPanel } from "./BankTransactionPanel";
import { CentralFountain } from "./CentralFountain";
import { DataNetwork } from "./GlassDataPipe";
import { wind } from "./materials";
import { DEFAULT_CAM } from "./layout";
import { BANKS, BANK_MAP } from "../sim/transactions";
import { engineTick, useSim } from "../sim/store";

function Driver() {
  const frame = useRef(0);
  useFrame(({ gl }, dt) => {
    const d = Math.min(dt, 0.1);
    if (frame.current++ < 90) gl.shadowMap.needsUpdate = true;
    wind.uTime.value += d;
    engineTick(d);
  });
  return null;
}

function CameraRig() {
  const controls = useRef();
  const anim = useRef(null);
  const { camera } = useThree();
  const selected = useSim((s) => s.selected);
  const resetView = useSim((s) => s.resetView);
  useEffect(() => {
    if (selected) {
      const [x, z] = BANK_MAP[selected].pos;
      anim.current = { t: new THREE.Vector3(x, 3.2, z), p: new THREE.Vector3(x * 1.25, 15.5, z + 17) };
    } else {
      anim.current = { t: new THREE.Vector3(...DEFAULT_CAM.target), p: new THREE.Vector3(...DEFAULT_CAM.pos) };
    }
  }, [selected, resetView]);
  useFrame((_, dt) => {
    const a = anim.current, c = controls.current;
    if (!a || !c) return;
    const k = 1 - Math.exp(-dt * 2.6);
    camera.position.lerp(a.p, k);
    c.target.lerp(a.t, k);
    c.update();
    if (camera.position.distanceTo(a.p) < 0.05 && c.target.distanceTo(a.t) < 0.05) anim.current = null;
  });
  return (
    <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} target={DEFAULT_CAM.target}
      minDistance={12} maxDistance={78} minPolarAngle={0.35} maxPolarAngle={1.18} panSpeed={0.8} rotateSpeed={0.6} zoomSpeed={0.8}
      onStart={() => { anim.current = null; }} />
  );
}

function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur levels={5} intensity={0.6} luminanceThreshold={1.0} luminanceSmoothing={0.2} radius={0.65} />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.08} />
      <BrightnessContrast brightness={0.02} contrast={0.06} />
      <Vignette eskil={false} offset={0.22} darkness={0.55} />
    </EffectComposer>
  );
}

export default function FinancialDistrict() {
  return (
    <Canvas
      shadows dpr={[1, 1.25]} data-testid="world-canvas"
      camera={{ position: DEFAULT_CAM.pos, fov: 36, near: 0.5, far: 1200 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => { gl.toneMappingExposure = 1.02; gl.shadowMap.autoUpdate = false; window.__fs = { gl, scene }; }}
      onPointerMissed={() => {}}
    >
      <Driver />
      <Suspense fallback={null}><Atmosphere /></Suspense>
      <Landscape />
      <Vegetation />
      <StreetFurniture />
      <CentralFountain />
      <DataNetwork />
      {BANKS.map((b) => <BankBuilding key={b.id} bank={b} />)}
      {BANKS.map((b) => <BankTransactionPanel key={b.id} bank={b} />)}
      <CityLife />
      <CameraRig />
      <Effects />
    </Canvas>
  );
}
