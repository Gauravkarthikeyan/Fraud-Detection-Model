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
float gust = 0.65 + 0.55 * max(0.0, sin(uTime * 0.21 + wp.x * 0.035 - wp.z * 0.02));
float sw = (sin(uTime * 0.75 + ph) * 0.7 + sin(uTime * 1.8 + ph * 2.3) * 0.3) * gust;
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

const loader = new THREE.TextureLoader();
const texCache = {};
function pbr(name, { color = "#ffffff", rough = 1, nScale = 1, metal = 0, env = 1 } = {}) {
  const ld = (suffix, srgb) => {
    const key = name + suffix;
    if (!texCache[key]) {
      const t = loader.load(`/tex/${name}_${suffix}.jpg`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      texCache[key] = t;
    }
    return texCache[key];
  };
  return new THREE.MeshStandardMaterial({
    map: ld("diff", true), normalMap: ld("nor_gl"), roughnessMap: ld("rough"),
    normalScale: new THREE.Vector2(nScale, nScale), roughness: rough, metalness: metal, color, envMapIntensity: env,
  });
}

// Triplanar-style world UVs so stretched/instanced boxes keep a consistent real-world texel density.
export function worldUV(m, scale) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
{
  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
  im = instanceMatrix;
  #endif
  vec4 wp4 = modelMatrix * im * vec4(position, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * mat3(im) * normal);
  vec2 tuv = abs(wn.y) > 0.6 ? wp4.xz : (abs(wn.x) > 0.6 ? wp4.zy : wp4.xy);
  tuv *= ${scale.toFixed(3)};
  #ifdef USE_MAP
  vMapUv = tuv;
  #endif
  #ifdef USE_NORMALMAP
  vNormalMapUv = tuv;
  #endif
  #ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv = tuv;
  #endif
}`);
  };
  const key = m.customProgramCacheKey ? m.customProgramCacheKey() : "";
  m.customProgramCacheKey = () => key + "wuv" + scale;
  return m;
}

function leafTexture(pink) {
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const n = pink ? 260 : 190;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.pow(Math.random(), 0.6) * 220;
      const x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d;
      g.save(); g.translate(x, y); g.rotate(Math.random() * Math.PI * 2);
      if (pink) {
        const l = 72 + Math.random() * 18;
        for (let k = 0; k < 5; k++) {
          g.rotate((Math.PI * 2) / 5);
          g.fillStyle = `hsl(${330 + Math.random() * 15}, ${55 + Math.random() * 25}%, ${l}%)`;
          g.beginPath(); g.ellipse(0, -7, 5, 8, 0, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = "#f9e08a"; g.beginPath(); g.arc(0, 0, 2.2, 0, Math.PI * 2); g.fill();
      } else {
        const L = 14 + Math.random() * 14;
        const grd = g.createLinearGradient(-L, 0, L, 0);
        const hue = 78 + Math.random() * 30, lit = 26 + Math.random() * 26;
        grd.addColorStop(0, `hsl(${hue}, 45%, ${lit - 8}%)`); grd.addColorStop(1, `hsl(${hue}, 55%, ${lit + 10}%)`);
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(0, 0, L, L * 0.42, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(20,40,10,0.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
      }
      g.restore();
    }
  });
}

const std = (o) => new THREE.MeshStandardMaterial(o);
const leafParams = (pink) => ({ map: leafTexture(pink), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.78, color: "#ffffff" });
export const M = {
  stoneWall: worldUV(pbr("clay_plaster", { color: "#fff4e2", nScale: 1.1 }), 0.32),
  stone: worldUV(pbr("clay_plaster", { color: "#fff8ec", nScale: 0.7 }), 0.6),
  stoneDark: worldUV(pbr("large_sandstone_blocks_01", { color: "#f0e2cc", nScale: 1 }), 0.7),
  roof: worldUV(pbr("roof_slates_02", { color: "#c9ccd0", nScale: 1.2 }), 0.55),
  roofDark: worldUV(pbr("roof_slates_02", { color: "#8d9196" }), 0.55),
  windowGlass: std({ color: "#2a1e14", emissive: "#ffab5a", emissiveIntensity: 1.05, roughness: 0.05, metalness: 0.7, envMapIntensity: 2.2 }),
  skyGlass: std({ color: "#9ec8e8", roughness: 0.05, metalness: 0.8, envMapIntensity: 2 }),
  bronze: std({ color: "#6e5232", roughness: 0.3, metalness: 0.9 }),
  metal: std({ color: "#c6cbd1", roughness: 0.22, metalness: 0.95 }),
  darkMetal: std({ color: "#2a2e33", roughness: 0.4, metalness: 0.8 }),
  grassGround: worldUV(pbr("leafy_grass", { color: "#9fbf6a", nScale: 1 }), 0.32),
  asphalt: worldUV(pbr("asphalt_02", { color: "#9a9a9a", nScale: 0.8 }), 0.28),
  paver: worldUV(pbr("rectangular_paving", { color: "#efe4d2", nScale: 1 }), 0.55),
  plaza: worldUV(pbr("patterned_paving_02", { color: "#fbf3e6", nScale: 1 }), 0.36),
  curb: std({ color: "#b8b1a4", roughness: 0.9 }),
  marking: std({ color: "#efeee8", roughness: 0.8 }),
  soil: worldUV(pbr("bark_brown_02", { color: "#5a4a3a", nScale: 1.5 }), 1.2),
  hedge: worldUV(pbr("leafy_grass", { color: "#7d9a5a", nScale: 2 }), 0.9),
  trunk: pbr("bark_brown_02", { color: "#cfc2b4", nScale: 1.4 }),
  leafCard: windMaterial(leafParams(false), { amp: 0.09 }),
  blossomCard: windMaterial(leafParams(true), { amp: 0.09 }),
  leaf: windMaterial({ color: "#ffffff", roughness: 0.85 }, { amp: 0.06 }),
  flower: windMaterial({ color: "#ffffff", roughness: 0.7 }, { amp: 0.03 }),
  grass: windMaterial({ color: "#ffffff", roughness: 1, side: THREE.DoubleSide }, { mode: "grass", amp: 0.08, h: 0.32 }),
  lamp: new THREE.MeshStandardMaterial({ color: "#fff1d0", emissive: "#ffc46b", emissiveIntensity: 2.4, toneMapped: false }),
  wood: worldUV(pbr("bark_brown_02", { color: "#c48a5a", nScale: 0.6 }), 2.0),
  banner: std({ color: "#4a3f9e", roughness: 0.7, side: THREE.DoubleSide }),
  gold: std({ color: "#d2a54c", roughness: 0.3, metalness: 0.9 }),
};
M.trunk.map.repeat.set(1, 3);
