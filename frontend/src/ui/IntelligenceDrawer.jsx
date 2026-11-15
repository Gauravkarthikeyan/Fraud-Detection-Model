import { ShieldCheck, Lock, FlaskConical, Radar, Brain, Network, Combine } from "lucide-react";
import { useSim } from "../sim/store";
import { FL, ROUNDS } from "../sim/model";
import { BANKS } from "../sim/transactions";
import { Drawer, Section } from "./Drawer";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function Spark({ algo, round }) {
  const w = 300, h = 64;
  const line = (a) => FL[a].slice(1).map((r, i) => `${(i / (ROUNDS - 1)) * w},${h - r.metrics.recall * h}`).join(" ");
  const cx = round > 0 ? ((round - 1) / (ROUNDS - 1)) * w : null;
  return (
    <svg viewBox={`0 -6 ${w} ${h + 12}`} className="spark" data-testid="recall-chart">
      <line x1="0" x2={w} y1={h - FL.localRecall * h} y2={h - FL.localRecall * h} className="spark-base" />
      <polyline points={line("fedavg")} className={`spark-line ${algo === "fedavg" ? "on" : ""}`} />
      <polyline points={line("fedprox")} className={`spark-line alt ${algo === "fedprox" ? "on" : ""}`} />
      {cx !== null && <circle cx={cx} cy={h - FL[algo][round].metrics.recall * h} r="4.5" className="spark-dot" />}
    </svg>
  );
}

function Algorithms({ stats, m }) {
  const rows = [
    [Radar, "Local anomaly detection", "Per-bank z-score profile", stats.anomaly, `Recall ${pct(FL.anomalyRecall)}`],
    [Brain, "Behavioural classifier", "Logistic model, 7 features", stats.classifier, `PR-AUC ${m ? m.prauc.toFixed(3) : "—"}`],
    [Network, "Graph intelligence", "Salted-hash beneficiary links", stats.graph, "Cross-bank matches"],
    [Combine, "Federated aggregation", "Weighted parameter averaging", stats.fed, "Rounds completed"],
  ];
  return (
    <div className="algo-list">
      {rows.map(([Icon, name, sub, n, metric]) => (
        <div className="algo-row" key={name} data-testid={`algo-${name.split(" ")[0].toLowerCase()}`}>
          <div className="algo-ic"><Icon size={17} /></div>
          <div className="algo-main"><div className="algo-name">{name}</div><div className="algo-sub">{sub} · {metric}</div></div>
          <div className="algo-n mono">{n}</div>
        </div>
      ))}
    </div>
  );
}

export default function IntelligenceDrawer() {
  const s = useSim();
  const open = s.drawer === "intel";
  const m = s.round > 0 ? FL[s.algo][s.round].metrics : null;
  const coordLabel = { idle: "Idle · listening", aggregating: "Aggregating updates", distributing: "Distributing model" }[s.coord];
  return (
    <Drawer side="right" open={open} onClose={() => s.toggleDrawer(null)} title="Federated Intelligence" kicker="Coordinator · central fountain" testId="intel-drawer">
      <div className="coord-card">
        <div className={`coord-state st-${s.coord}`} data-testid="coordinator-status"><span className="dot" />{coordLabel}</div>
        <div className="coord-grid">
          <div><div className="stat-label">Round</div><div className="stat-val" data-testid="fl-round">{s.round}<small>/{ROUNDS}</small></div></div>
          <div><div className="stat-label">Global model</div><div className="stat-val sm" data-testid="model-version">GM-v1.{String(s.round).padStart(2, "0")}</div></div>
        </div>
        <div className="seg" data-testid="algo-toggle">
          {["fedavg", "fedprox"].map((a) => (
            <button key={a} className={s.algo === a ? "on" : ""} onClick={() => s.setAlgo(a)} data-testid={`algo-${a}-button`}>{a === "fedavg" ? "FedAvg" : "FedProx"}</button>
          ))}
        </div>
      </div>

      <Section title="Model performance" right={<span className="hint">{FL.testSize.toLocaleString("en-IN")} held-out txns</span>}>
        <div className="metric-grid">
          {[["Precision", m?.precision], ["Recall", m?.recall], ["F1", m?.f1], ["PR-AUC", m?.prauc], ["False +", m?.fpr]].map(([k, v]) => (
            <div className="metric" key={k} data-testid={`metric-${k.toLowerCase().replace(/[^a-z]/g, "")}`}>
              <div className="stat-label">{k}</div><div className="metric-val">{v === undefined ? "—" : k === "PR-AUC" ? v.toFixed(3) : pct(v)}</div>
            </div>
          ))}
        </div>
        <Spark algo={s.algo} round={s.round} />
        <div className="legend"><span className="lg a" />FedAvg <span className="lg b" />FedProx <span className="lg c" />Local-only avg</div>
        <div className="compare">
          <div><span>Local-only recall (avg)</span><b className="mono">{pct(FL.localRecall)}</b></div>
          <div><span>Federated recall</span><b className="mono cyan">{m ? pct(m.recall) : "—"}</b></div>
        </div>
      </Section>

      <Section title="Non-IID private datasets" right={<span className="hint">fraud is rare</span>}>
        <div className="noniid">
          {BANKS.map((b) => {
            const st = FL.stats[b.id];
            return (
              <div className="noniid-row" key={b.id}>
                <span className="noniid-name">{b.name.split(" ")[0]}</span>
                <div className="bar"><i style={{ width: `${Math.min(100, st.rate * 5000)}%` }} /></div>
                <span className="mono noniid-val">{(st.rate * 100).toFixed(2)}% · {st.frauds}/{st.n}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Intelligence systems"><Algorithms stats={s.stats} m={m} /></Section>

      <Section title="Privacy status">
        <div className="privacy">
          <div><ShieldCheck size={16} /> Raw transaction records stay inside each bank</div>
          <div><Lock size={16} /> Shared: model weights and salted-hash fraud signals only</div>
          <div className="warn"><FlaskConical size={16} /> Simulated privacy protocol for demonstration. No production encryption or compliance is claimed.</div>
        </div>
      </Section>
    </Drawer>
  );
}
