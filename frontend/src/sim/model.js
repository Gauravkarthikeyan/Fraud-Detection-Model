// Synthetic non-IID bank datasets, logistic-regression clients, FedAvg / FedProx aggregation and metrics.
export const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
const bern = (r, p) => (r() < p ? 1 : 0);
const poisson = (r, l) => {
  const L = Math.exp(-l);
  let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
};

export const FEATURES = ["Amount deviation", "Night-time", "New payee", "Velocity", "Device change", "New account", "Unusual geo"];
export const ROUNDS = 12;

const legit = (o) => ({ night: 0.06, newPayee: 0.15, vel: 1.4, device: 0.04, age: 0.05, geo: 0.02, ...o });
export const PROFILES = {
  alpha: { n: 4000, fraudRate: 0.012, logMean: 3.2, legit: legit({ newPayee: 0.2 }),
    fraud: { amt: 0.7, night: 0.35, newPayee: 0.92, vel: 6, device: 0.35, age: 0.4, geo: 0.08 } },
  metro: { n: 2600, fraudRate: 0.009, logMean: 5.3, legit: legit({ newPayee: 0.1, vel: 1.0 }),
    fraud: { amt: 1.7, night: 0.2, newPayee: 0.7, vel: 1.6, device: 0.3, age: 0.3, geo: 0.65 } },
  unity: { n: 3600, fraudRate: 0.015, logMean: 2.9, legit: legit({ newPayee: 0.12, vel: 2.0 }),
    fraud: { amt: -0.4, night: 0.5, newPayee: 0.4, vel: 8, device: 0.5, age: 0.25, geo: 0.2 } },
  national: { n: 2200, fraudRate: 0.008, logMean: 4.8, legit: legit({ newPayee: 0.08, night: 0.03 }),
    fraud: { amt: 1.9, night: 0.4, newPayee: 0.8, vel: 1.8, device: 0.75, age: 0.6, geo: 0.3 } },
};
const IDS = Object.keys(PROFILES);

export function sample(r, prof, fraud) {
  const f = fraud ? prof.fraud : prof.legit;
  return [
    fraud ? f.amt + gauss(r) * 0.8 : gauss(r),
    bern(r, f.night), bern(r, f.newPayee),
    Math.min(poisson(r, f.vel), 12) / 6,
    bern(r, f.device), bern(r, f.age), bern(r, f.geo),
  ];
}

function makeSplit(r, prof, n) {
  const X = [], y = [];
  for (let i = 0; i < n; i++) {
    const fr = r() < prof.fraudRate ? 1 : 0;
    X.push(sample(r, prof, fr));
    y.push(fr);
  }
  return { X, y };
}

export const sigmoid = (z) => 1 / (1 + Math.exp(-z));
export const predict = (w, x) => {
  let z = w[0];
  for (let i = 0; i < x.length; i++) z += w[i + 1] * x[i];
  return sigmoid(z);
};

function localTrain(w0, { X, y }, { epochs = 5, lr = 1.6, mu = 0, posW = 20 }) {
  const w = w0.slice(), n = X.length, g = new Array(w.length);
  for (let e = 0; e < epochs; e++) {
    g.fill(0);
    for (let k = 0; k < n; k++) {
      const x = X[k];
      const err = (predict(w, x) - y[k]) * (y[k] ? posW : 1);
      g[0] += err;
      for (let i = 0; i < x.length; i++) g[i + 1] += err * x[i];
    }
    for (let j = 0; j < w.length; j++) w[j] -= lr * (g[j] / n + mu * (w[j] - w0[j]));
  }
  return w;
}

export function evaluate(w, { X, y }, th = 0.5) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const s = X.map((x, i) => {
    const p = predict(w, x);
    if (p >= th) y[i] ? tp++ : fp++; else y[i] ? fn++ : tn++;
    return [p, y[i]];
  });
  s.sort((a, b) => b[0] - a[0]);
  const P = tp + fn;
  let hit = 0, ap = 0;
  s.forEach(([, yy], k) => { if (yy) { hit++; ap += hit / (k + 1); } });
  const precision = tp + fp ? tp / (tp + fp) : 0, recall = P ? tp / P : 0;
  return {
    precision, recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    prauc: P ? ap / P : 0,
    fpr: fp + tn ? fp / (fp + tn) : 0,
    positives: P, total: X.length,
  };
}

const concat = (parts) => ({ X: parts.flatMap((p) => p.X), y: parts.flatMap((p) => p.y) });

function federate(data, pooledTest, algo) {
  let w = new Array(FEATURES.length + 1).fill(0);
  const total = IDS.reduce((a, id) => a + data[id].train.X.length, 0);
  const history = [{ round: 0, w, metrics: evaluate(w, pooledTest), perBank: {} }];
  for (let r = 1; r <= ROUNDS; r++) {
    const locals = IDS.map((id) => localTrain(w, data[id].train, { epochs: 8, mu: algo === "fedprox" ? 0.08 : 0 }));
    const next = w.map((_, j) => IDS.reduce((a, id, k) => a + (locals[k][j] * data[id].train.X.length) / total, 0));
    w = next;
    const perBank = Object.fromEntries(IDS.map((id) => [id, evaluate(w, data[id].test).recall]));
    history.push({ round: r, w, metrics: evaluate(w, pooledTest), perBank });
  }
  return history;
}

function anomalyStats({ X, y }) {
  const L = X.filter((_, i) => !y[i]);
  const m = FEATURES.map((_, j) => L.reduce((a, x) => a + x[j], 0) / L.length);
  const s = FEATURES.map((_, j) => Math.sqrt(L.reduce((a, x) => a + (x[j] - m[j]) ** 2, 0) / L.length) || 1);
  return { m, s };
}
export const anomalyScore = (st, x) => Math.sqrt(x.reduce((a, v, j) => a + ((v - st.m[j]) / st.s[j]) ** 2, 0) / x.length);
export const ANOMALY_TH = 2.2;

function build() {
  const data = {};
  IDS.forEach((id, k) => {
    const r = mulberry32(1000 + k * 77);
    const p = PROFILES[id];
    data[id] = { train: makeSplit(r, p, p.n), test: makeSplit(r, p, Math.round(p.n * 0.5)) };
  });
  const pooledTest = concat(IDS.map((id) => data[id].test));
  const fedavg = federate(data, pooledTest, "fedavg");
  const fedprox = federate(data, pooledTest, "fedprox");
  const localOnly = Object.fromEntries(IDS.map((id) => {
    const w = localTrain(new Array(FEATURES.length + 1).fill(0), data[id].train, { epochs: ROUNDS * 8 });
    return [id, { w, pooled: evaluate(w, pooledTest), own: evaluate(w, data[id].test) }];
  }));
  const anomaly = Object.fromEntries(IDS.map((id) => [id, anomalyStats(data[id].train)]));
  let aTp = 0, aP = 0;
  IDS.forEach((id) => data[id].test.X.forEach((x, i) => {
    if (data[id].test.y[i]) { aP++; if (anomalyScore(anomaly[id], x) > ANOMALY_TH) aTp++; }
  }));
  const stats = Object.fromEntries(IDS.map((id) => {
    const t = data[id].train;
    const frauds = t.y.reduce((a, v) => a + v, 0);
    return [id, { n: t.X.length, frauds, rate: frauds / t.X.length, avgTicket: Math.round(10 ** PROFILES[id].logMean) }];
  }));
  const localRecall = IDS.reduce((a, id) => a + localOnly[id].pooled.recall, 0) / IDS.length;
  const localPrauc = IDS.reduce((a, id) => a + localOnly[id].pooled.prauc, 0) / IDS.length;
  return { fedavg, fedprox, localOnly, localRecall, localPrauc, anomaly, anomalyRecall: aP ? aTp / aP : 0, stats, testSize: pooledTest.X.length };
}

export const FL = build();

export const fnv = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
};
