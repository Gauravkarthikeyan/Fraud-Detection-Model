import * as THREE from "three";

export const wind = { uTime: { value: 0 } };
export const BOX = new THREE.BoxGeometry(1, 1, 1);

export function windMaterial(params, { amp = 0.08, mode = "canopy", h = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial(params);
  const A = amp.toFixed(3);
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = wind.uTime;
    s.vertexShader = "uniform float uTime;\n" + s.vertexShader.replace("#include <begin_vertex>", `
#include <begin_vertex>
vec3 wp = vec3(0.0);
#ifdef USE_INSTANCING
wp = instanceMatrix[3].xyz;
#endif
float ph = wp.x * 0.31 + wp.z * 0.47;
${mode === "grass" ? `
float k = clamp(position.y / ${h.toFixed(2)}, 0.0, 1.0); k *= k;
float gust = sin(uTime * 0.5 + wp.x * 0.09 + wp.z * 0.05) * 0.5 + 0.5;
transformed.x += (sin(uTime * 1.5 + ph) * 0.6 + gust * 0.7) * ${A} * k;
transformed.z += cos(uTime * 1.2 + ph * 1.7) * ${A} * 0.5 * k;` : `
float hk = clamp(wp.y * 0.28, 0.25, 1.3);
float sw = sin(uTime * 0.75 + ph) * 0.7 + sin(uTime * 1.8 + ph * 2.3) * 0.3;
transformed.x += sw * ${A} * hk;
transformed.z += cos(uTime * 0.62 + ph * 1.3) * ${A} * 0.6 * hk;
transformed += normal * sin(uTime * 2.6 + position.x * 9.0 + position.y * 7.0 + ph) * ${(amp * 0.22).toFixed(3)};`}`);
  };
  m.customProgramCacheKey = () => `${mode}${A}${h}`;
  return m;
}

function canvasTex(w, h, draw, repeat = 1) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}
const noise = (g, w, h, n, a) => {
  for (let i = 0; i < n; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
};

const stoneTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#efe2c8"; g.fillRect(0, 0, w, h);
  noise(g, w, h, 9000, 0.06);
  g.strokeStyle = "rgba(120,96,64,0.28)"; g.lineWidth = 2;
  for (let r = 0; r < 10; r++) {
    const y = (r * h) / 10;
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    for (let x = (r % 2) * 48; x < w; x += 96) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h / 10); g.stroke(); }
  }
});
const paverTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#cbbca2"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const l = 70 + Math.random() * 14;
    g.fillStyle = `hsl(36, 22%, ${l}%)`;
    g.fillRect(x * 32 + ((y % 2) * 16) + 1, y * 32 + 1, 30, 30);
  }
  noise(g, w, h, 3000, 0.08);
}, 1);
const grassTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#5d8a35"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `hsla(${85 + Math.random() * 20}, ${40 + Math.random() * 20}%, ${24 + Math.random() * 18}%, 0.5)`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 3);
  }
}, 60);
const asphaltTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#45474b"; g.fillRect(0, 0, w, h); noise(g, w, h, 6000, 0.12);
}, 8);

export function textTexture(text, { w = 1024, h = 128, color = "#4a3b28", bg = null, size = 78, font = "600 {s}px 'Cormorant Garamond', Georgia, serif", spacing = 14 } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = color;
    g.font = font.replace("{s}", size);
    g.textAlign = "center"; g.textBaseline = "middle";
    if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

const std = (o) => new THREE.MeshStandardMaterial(o);
export const M = {
  stoneWall: std({ map: stoneTex, roughness: 0.82, color: "#f3e7cf" }),
  stone: std({ color: "#eadbbd", roughness: 0.78 }),
  stoneDark: std({ color: "#cdb690", roughness: 0.85 }),
  roof: std({ color: "#5e6266", roughness: 0.88, metalness: 0.05 }),
  roofDark: std({ color: "#474b4f", roughness: 0.9 }),
  windowGlass: std({ color: "#3a2a1a", emissive: "#ffae5e", emissiveIntensity: 0.85, roughness: 0.12, metalness: 0.4 }),
  skyGlass: std({ color: "#9ec8e8", roughness: 0.05, metalness: 0.6, envMapIntensity: 1.6 }),
  bronze: std({ color: "#6e5232", roughness: 0.35, metalness: 0.8 }),
  metal: std({ color: "#b9bec4", roughness: 0.3, metalness: 0.9 }),
  darkMetal: std({ color: "#2f3338", roughness: 0.45, metalness: 0.7 }),
  grassGround: std({ map: grassTex, color: "#ffffff", roughness: 1 }),
  asphalt: std({ map: asphaltTex, roughness: 0.95 }),
  paver: std({ map: paverTex, roughness: 0.9 }),
  plaza: std({ map: paverTex, color: "#f1e9dc", roughness: 0.85 }),
  curb: std({ color: "#b8b1a4", roughness: 0.9 }),
  marking: std({ color: "#efeee8", roughness: 0.8 }),
  soil: std({ color: "#4b3424", roughness: 1 }),
  hedge: windMaterial({ color: "#ffffff", roughness: 0.95 }, { amp: 0.012 }),
  trunk: std({ color: "#5c4331", roughness: 0.95 }),
  leaf: windMaterial({ color: "#ffffff", roughness: 0.85 }, { amp: 0.06 }),
  flower: windMaterial({ color: "#ffffff", roughness: 0.7 }, { amp: 0.03 }),
  grass: windMaterial({ color: "#ffffff", roughness: 1, side: THREE.DoubleSide }, { mode: "grass", amp: 0.07, h: 0.32 }),
  lamp: new THREE.MeshStandardMaterial({ color: "#fff1d0", emissive: "#ffc46b", emissiveIntensity: 2.4, toneMapped: false }),
  wood: std({ color: "#7a5434", roughness: 0.8 }),
  banner: std({ color: "#4a3f9e", roughness: 0.7, side: THREE.DoubleSide }),
  gold: std({ color: "#d2a54c", roughness: 0.35, metalness: 0.85 }),
};
