import * as THREE from "three";
import { Environment } from "@react-three/drei";

export const SUN = new THREE.Vector3(-30, 17, 20);

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
