import { useMemo } from "react";
import * as THREE from "three";
import { Instanced, rot } from "./Instanced";
import { M } from "./materials";
import { D, INNER } from "./layout";
import { BANKS } from "../sim/transactions";

const POST = new THREE.CylinderGeometry(0.035, 0.05, 1, 8);
const BULB = new THREE.SphereGeometry(1, 12, 10);

function useFurniture() {
  return useMemo(() => {
    const lampPos = [];
    [-1, 1].forEach((s) => {
      [6.2, 9.8, 13.4, 16.9].forEach((d) => {
        lampPos.push([1.5, s * d], [-1.5, s * d], [s * d, 1.5], [s * d, -1.5]);
      });
      [-13, -6, 6, 13].forEach((d) => lampPos.push([d, s * (INNER + 0.6)], [s * (INNER + 0.6), d]));
    });
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => lampPos.push([sx * 5.0, sz * 2.0], [sx * 2.0, sz * 5.0])));
    const posts = [], heads = [], caps = [], bulbs = [];
    lampPos.forEach(([x, z]) => {
      posts.push({ p: [x, 0.85, z], s: [1, 1.7, 1] });
      caps.push({ p: [x, 1.98, z], s: [0.2, 0.06, 0.2] });
      heads.push({ p: [x, 1.82, z], s: [0.14, 0.24, 0.14] });
      caps.push({ p: [x, 0.08, z], s: [0.16, 0.16, 0.16] });
    });
    lampPos.forEach(([x, z]) => bulbs.push({ p: [x, 1.82, z], s: 0.05 }));

    const benchDefs = [];
    [30, 150, 210, 330].forEach((deg) => {
      const a = (deg * Math.PI) / 180;
      benchDefs.push([Math.sin(a) * 2.95, Math.cos(a) * 2.95, a + Math.PI]);
    });
    [-1, 1].forEach((s) => {
      benchDefs.push([1.62, s * 11, -Math.PI / 2], [-1.62, s * 11, Math.PI / 2]);
      benchDefs.push([s * 11, 1.62, Math.PI], [s * 11, -1.62, 0]);
    });
    const seats = [], legs = [];
    benchDefs.forEach(([x, z, r]) => {
      const off = (dx, dz) => { const [a, b] = rot(dx, dz, r); return [x + a, z + b]; };
      seats.push({ p: [x, 0.42, z], s: [1.2, 0.07, 0.42], r });
      const [bx, bz] = off(0, -0.2);
      seats.push({ p: [bx, 0.66, bz], s: [1.2, 0.3, 0.06], r });
      [-0.5, 0.5].forEach((dx) => { const [lx, lz] = off(dx, 0); legs.push({ p: [lx, 0.2, lz], s: [0.06, 0.4, 0.4], r }); });
    });

    const poles = [], banners = [], trims = [];
    BANKS.forEach(({ pos: [cx, cz] }) => {
      [-2.75, 2.75].forEach((dx) => {
        const x = cx + dx, z = cz + D / 2 + 1.9;
        poles.push({ p: [x, 1.4, z], s: [1, 2.8, 1] });
        banners.push({ p: [x + 0.26, 2.05, z], s: [0.44, 1.05, 0.03] });
        trims.push({ p: [x + 0.26, 2.6, z], s: [0.5, 0.05, 0.05] });
      });
    });
    return { posts, heads, caps, bulbs, seats, legs, poles, banners, trims };
  }, []);
}

export function StreetFurniture() {
  const f = useFurniture();
  return (
    <group>
      <Instanced items={f.posts} material={M.darkMetal} geometry={POST} castShadow />
      <Instanced items={f.caps} material={M.darkMetal} castShadow />
      <Instanced items={f.heads} material={M.lamp} />
      <Instanced items={f.bulbs} material={M.lamp} geometry={BULB} />
      <Instanced items={f.seats} material={M.wood} castShadow receiveShadow />
      <Instanced items={f.legs} material={M.darkMetal} castShadow />
      <Instanced items={f.poles} material={M.darkMetal} geometry={POST} castShadow />
      <Instanced items={f.banners} material={M.banner} castShadow />
      <Instanced items={f.trims} material={M.gold} />
    </group>
  );
}
