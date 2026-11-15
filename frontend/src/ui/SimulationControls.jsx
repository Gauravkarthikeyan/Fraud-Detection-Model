import { Play, Pause, RotateCcw, Zap, Activity, BrainCircuit, Crosshair, X, ShieldCheck } from "lucide-react";
import { useSim, nextInjectBank } from "../sim/store";
import { FL } from "../sim/model";
import { BANK_MAP } from "../sim/transactions";

export function SimulationControls() {
  const { running, started, busy, round, algo, injectCount, start, pause, replay, inject } = useSim();
  return (
    <div className="fs-controls" data-testid="simulation-controls">
      <button className="ctl primary" onClick={running ? pause : start} data-testid={running ? "pause-simulation-button" : "start-simulation-button"}>
        {running ? <Pause size={16} /> : <Play size={16} />}{running ? "Pause" : started ? "Resume" : "Start simulation"}
      </button>
      <button className="ctl" onClick={replay} data-testid="replay-scenario-button"><RotateCcw size={16} />Replay</button>
      <span className="ctl-div" />
      <button className="ctl danger" onClick={inject} disabled={busy} data-testid="inject-fraud-button">
        <Zap size={16} />{busy ? "Propagating…" : "Inject fraud"}<small>{nextInjectBank(injectCount).split(" ")[0]}</small>
      </button>
      <span className="ctl-status" data-testid="sim-status">
        <span className={`dot ${running ? "dot-live" : ""}`} />Round {round} · {algo === "fedavg" ? "FedAvg" : "FedProx"}
      </span>
    </div>
  );
}

export function SideToggles() {
  const drawer = useSim((s) => s.drawer);
  const toggle = useSim((s) => s.toggleDrawer);
  const alerts = useSim((s) => s.alerts.length);
  return (
    <>
      <button className={`side-toggle left ${drawer === "activity" ? "hide" : ""}`} onClick={() => toggle("activity")} data-testid="open-activity-drawer">
        <Activity size={18} /><span>Activity</span>{alerts > 0 && <i className="side-badge">{alerts}</i>}
      </button>
      <button className={`side-toggle right ${drawer === "intel" ? "hide" : ""}`} onClick={() => toggle("intel")} data-testid="open-intel-drawer">
        <BrainCircuit size={18} /><span>Intelligence</span>
      </button>
    </>
  );
}

export function ViewButton() {
  const returnView = useSim((s) => s.returnView);
  return (
    <button className="view-btn" onClick={returnView} data-testid="reset-camera-button" aria-label="Return to district view" title="Return to district view">
      <Crosshair size={18} />
    </button>
  );
}

export function BankInspector() {
  const { selected, counts, round, algo, bankAlert, returnView } = useSim();
  if (!selected) return null;
  const b = BANK_MAP[selected], c = counts[selected], st = FL.stats[selected];
  const recall = round > 0 ? FL[algo][round].perBank[selected] : null;
  const alert = bankAlert[selected];
  return (
    <div className="inspector" data-testid="bank-inspector">
      <div className="insp-head">
        <div><div className="kicker">Bank inspector</div><div className="insp-name">{b.name}</div><div className="insp-sub">{b.profile}</div></div>
        <button className="icon-btn" onClick={returnView} data-testid="close-inspector-button" aria-label="Back to district"><X size={18} /></button>
      </div>
      <div className="insp-grid">
        <div><div className="stat-label">Processed today</div><div className="stat-val sm">{c.total.toLocaleString("en-IN")}</div></div>
        <div><div className="stat-label">Flagged</div><div className={`stat-val sm ${c.suspicious ? "amber" : ""}`}>{c.suspicious}</div></div>
        <div><div className="stat-label">Local fraud rate</div><div className="stat-val sm">{(st.rate * 100).toFixed(2)}%</div></div>
        <div><div className="stat-label">Global-model recall</div><div className="stat-val sm cyan">{recall === null ? "—" : `${(recall * 100).toFixed(1)}%`}</div></div>
      </div>
      <div className={`insp-status ${alert ? `is-${alert}` : ""}`}><ShieldCheck size={15} />{alert === "fraud" ? "Confirmed fraud · signal shared" : alert === "suspicious" ? "Related activity under review" : "Records stay local · model updates only"}</div>
      <button className="ctl ghost w-full justify-center mt-3" onClick={returnView} data-testid="back-to-district-button">Back to district view</button>
    </div>
  );
}
