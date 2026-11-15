import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { BOX } from "./materials";

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// items: [{ p:[x,y,z], s:[sx,sy,sz] | number, r?: yRot, rx?, rz?, c?: color }]
export function Instanced({ items, material, geometry = BOX, castShadow = false, receiveShadow = false, ...rest }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const mesh = ref.current;
    items.forEach((it, i) => {
      _p.set(...it.p);
      _e.set(it.rx || 0, it.r || 0, it.rz || 0);
      _q.setFromEuler(_e);
      const s = it.s ?? 1;
      Array.isArray(s) ? _s.set(...s) : _s.set(s, s, s);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      if (it.c) mesh.setColorAt(i, _c.set(it.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} {...rest} />;
}

export const rot = (x, z, r) => [x * Math.cos(r) + z * Math.sin(r), -x * Math.sin(r) + z * Math.cos(r)];
