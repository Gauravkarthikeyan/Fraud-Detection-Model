import { create } from "zustand";
import { toast } from "sonner";
import { FL, PROFILES, ROUNDS, mulberry32, sample, predict, anomalyScore, ANOMALY_TH, fnv } from "./model";
import { BANKS, BANK_IDS, BANK_MAP, INJECT_ORDER, FRAUD_SCRIPT, LINKED_SCRIPT, pickTx, formatINR } from "./transactions";

// Mutable per-frame state read directly by the 3D scene (never triggers React renders).
export const engine = {};
let uid = 0;

function resetEngine() {
  Object.assign(engine, {
    time: 0, events: [], signals: [], pipes: {}, coordPulse: -10, coordColor: "#5fd0ff",
    nextTx: 0.8, nextRound: 2.5, nextTick: 4, cursor: 0, rng: mulberry32(2026), sigId: 0,
  });
}
resetEngine();

function initialFeeds() {
  const r = mulberry32(42);
  return Object.fromEntries(BANK_IDS.map((id) => [id, Array.from({ length: 9 }, (_, i) => ({
    id: ++uid, bank: id, ...pickTx(r, id), t: -(i * 32 + (i ? 20 : 0)), status: "ok", score: 0.02,
  }))]));
}

const initialState = () => ({
  running: false, started: false, round: 0, feeds: initialFeeds(),
  counts: Object.fromEntries(BANKS.map((b) => [b.id, { total: b.base, suspicious: 0, fraud: 0 }])),
  alerts: [], coord: "idle", stats: { anomaly: 0, classifier: 0, graph: 0, fed: 0 }, tick: 0, injectCount: 0,
  bankAlert: {},
});

export const useSim = create((set, get) => ({
  ...initialState(),
  algo: "fedprox", selected: null, drawer: null, resetView: 0, busy: false,
  start: () => set({ running: true, started: true }),
  pause: () => set({ running: false }),
  replay: () => { resetEngine(); set({ ...initialState(), running: true, started: true, busy: false }); },
  inject: () => injectFraud(),
  setAlgo: (algo) => set({ algo }),
  select: (id) => set({ selected: id, drawer: null }),
  toggleDrawer: (d) => set((s) => ({ drawer: s.drawer === d ? null : d, selected: d ? null : s.selected })),
  returnView: () => set((s) => ({ selected: null, resetView: s.resetView + 1 })),
}));

export const currentModel = (s) => FL[s.algo][s.round];
const at = (dt, fn) => engine.events.push({ at: engine.time + dt, fn });
const signal = (bank, dir, color, dur = 2.2) => engine.signals.push({ id: ++engine.sigId, bank, dir, color, start: engine.time, dur });
const tintPipe = (bank, color, dur, dir = 1) => { engine.pipes[bank] = { color, until: engine.time + dur, dir }; };

function addTx(bank, tx) {
  useSim.setState((s) => ({
    feeds: { ...s.feeds, [bank]: [tx, ...s.feeds[bank]].slice(0, 12) },
    counts: { ...s.counts, [bank]: { ...s.counts[bank], total: s.counts[bank].total + 1,
      suspicious: s.counts[bank].suspicious + (tx.status !== "ok" ? 1 : 0) } },
  }));
}
function patchTx(bank, id, patch) {
  useSim.setState((s) => ({ feeds: { ...s.feeds, [bank]: s.feeds[bank].map((t) => (t.id === id ? { ...t, ...patch } : t)) } }));
}
function addAlert(a) {
  useSim.setState((s) => ({ alerts: [{ id: ++uid, t: engine.time, ...a }, ...s.alerts].slice(0, 30) }));
}
const bump = (k, n = 1) => useSim.setState((s) => ({ stats: { ...s.stats, [k]: s.stats[k] + n } }));

function liveTx(bank) {
  const s = useSim.getState();
  const r = engine.rng;
  const x = sample(r, PROFILES[bank], false);
  const p = predict(currentModel(s).w, x);
  const a = anomalyScore(FL.anomaly[bank], x);
  const flagged = s.round > 0 && p > 0.9 && a > ANOMALY_TH;
  if (flagged) { bump("anomaly"); bump("classifier"); }
  const tx = { id: ++uid, bank, ...pickTx(r, bank), t: engine.time, status: "ok", score: p };
  if (flagged) Object.assign(tx, { status: "suspicious", icon: "alert", note: "Held for review" });
  addTx(bank, tx);
  if (flagged) addAlert({ level: "linked", bank, title: `${BANK_MAP[bank].name} held a transaction`, detail: `${tx.cat} ${formatINR(tx.amount)} · local model score ${(p * 100).toFixed(0)}%` });
}

function advanceRound() {
  const s = useSim.getState();
  if (s.round >= ROUNDS) return;
  useSim.setState({ coord: "aggregating" });
  BANK_IDS.forEach((b) => signal(b, "in", "#4aa8ff", 1.8));
  at(1.9, () => {
    useSim.setState((st) => ({ round: st.round + 1, coord: "distributing" }));
    bump("fed");
    engine.coordPulse = engine.time; engine.coordColor = "#5fd0ff";
    BANK_IDS.forEach((b) => signal(b, "out", "#7ff0ff", 1.8));
  });
  at(3.8, () => { if (!useSim.getState().busy) useSim.setState({ coord: "idle" }); });
}

function injectFraud() {
  const s = useSim.getState();
  if (s.busy) return;
  if (!s.running) useSim.setState({ running: true, started: true });
  const origin = INJECT_ORDER[s.injectCount % 4];
  const others = BANK_IDS.filter((b) => b !== origin);
  const hash = fnv(`mule-ring-${s.injectCount}-finshield-demo-salt`);
  const tag = `${hash.slice(0, 4)}·${hash.slice(4, 6)}`;
  const fx = sample(mulberry32(900 + s.injectCount), PROFILES[origin], true);
  const p = Math.max(predict(currentModel(s).w, fx), 0.62);
  const sc = FRAUD_SCRIPT[origin];
  const txId = ++uid;
  useSim.setState((st) => ({ busy: true, injectCount: st.injectCount + 1, bankAlert: { [origin]: "suspicious" } }));
  addTx(origin, { id: txId, bank: origin, cat: sc.cat, cp: sc.cp, amount: sc.amount, dir: "out", icon: "alert", t: engine.time, status: "suspicious", score: p, note: "Anomaly detected" });
  bump("anomaly");
  const name = BANK_MAP[origin].name;

  at(1.4, () => {
    patchTx(origin, txId, { status: "fraud", icon: "shield", note: "Fraud confirmed" });
    useSim.setState((st) => ({ counts: { ...st.counts, [origin]: { ...st.counts[origin], fraud: st.counts[origin].fraud + 1 } }, bankAlert: { [origin]: "fraud" } }));
    bump("classifier");
    addAlert({ level: "fraud", bank: origin, title: `Fraud confirmed at ${name}`, detail: `${sc.cat} ${formatINR(sc.amount)} · score ${(p * 100).toFixed(0)}%` });
    toast.error(`Fraud confirmed at ${name}`, { description: "Sharing a hashed signal with the coordinator. No customer records are sent." });
  });
  at(1.8, () => { signal(origin, "in", "#ff3b3b", 2.2); tintPipe(origin, "#ff3b3b", 2.3); useSim.setState({ coord: "aggregating" }); });
  at(4.0, () => {
    engine.coordPulse = engine.time; engine.coordColor = "#ffb020";
    useSim.setState({ coord: "distributing" });
    addAlert({ level: "info", bank: null, title: "Coordinator distributing intelligence", detail: `Mule signal ${tag} sent to 3 banks` });
    others.forEach((b) => { signal(b, "out", "#ffb020", 2.2); tintPipe(b, "#ffb020", 2.3, -1); });
  });
  at(6.3, () => {
    const st = useSim.getState();
    const alerts = { ...st.bankAlert };
    others.forEach((b, i) => {
      const ls = LINKED_SCRIPT[b];
      addTx(b, { id: ++uid, bank: b, cat: ls.cat, cp: `Beneficiary #${tag}`, amount: ls.amount, dir: "out", icon: "link", t: engine.time - 90 - i * 30, status: "suspicious", score: 0.7 + i * 0.06, note: "Linked to shared signal" });
      alerts[b] = "suspicious";
      addAlert({ level: "linked", bank: b, title: `${BANK_MAP[b].name} found a related transaction`, detail: `Local match on beneficiary #${tag}` });
    });
    bump("graph", others.length);
    useSim.setState({ bankAlert: alerts });
    toast.warning("Cross-bank fraud network detected", { description: `3 related transactions found in other banks' own data · #${tag}` });
  });
  at(8.5, () => useSim.setState({ coord: "idle", busy: false }));
  at(14, () => useSim.setState({ bankAlert: {} }));
}

export function engineTick(dt) {
  const s = useSim.getState();
  if (!s.running) return;
  engine.time += dt;
  if (engine.events.some((e) => e.at <= engine.time)) {
    const due = engine.events.filter((e) => e.at <= engine.time);
    engine.events = engine.events.filter((e) => e.at > engine.time);
    due.forEach((e) => e.fn());
  }
  engine.signals = engine.signals.filter((g) => engine.time < g.start + g.dur);
  if (engine.time >= engine.nextTx) {
    engine.nextTx += 0.8 + engine.rng() * 0.7;
    liveTx(BANK_IDS[engine.cursor++ % 4]);
  }
  if (engine.time >= engine.nextRound) {
    engine.nextRound += 6;
    if (!s.busy) advanceRound();
  }
  if (engine.time >= engine.nextTick) { engine.nextTick += 4; useSim.setState((st) => ({ tick: st.tick + 1 })); }
}

export const nextInjectBank = (count) => BANK_MAP[INJECT_ORDER[count % 4]].name;
