import { Database, Lock, Scale, GitCompare, CheckCircle2, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { useSim } from "../sim/store";
import { FL } from "../sim/model";
import { BANKS } from "../sim/transactions";

const pct = (v) => `${(v * 100).toFixed(1)}%`;

export function useApproachRows() {
  const { round, algo, stats } = useSim();
  const m = FL[algo][Math.max(round, 1)].metrics;
  const totalFraud = BANKS.reduce((a, b) => a + FL.stats[b.id].frauds, 0);
  const totalN = BANKS.reduce((a, b) => a + FL.stats[b.id].n, 0);
  const naiveAcc = 1 - totalFraud / totalN;
  const last = FL[algo][FL[algo].length - 1];
  const spread = Object.values(last.perBank);
  return [
    { icon: Database, situation: "Each bank has separate data", problem: "A bank may not see patterns observed by another bank.",
      approach: "Collaborative training across simulated banks.",
      proof: [`${round} federated rounds run`, `Recall ${pct(FL.localRecall)} local-only vs ${pct(m.recall)} federated`, `${stats.graph} cross-bank matches`] },
    { icon: Lock, situation: "Raw transaction data is sensitive", problem: "Sharing records can create privacy and compliance risks.",
      approach: "Keep original datasets on each bank client.",
      proof: ["0 raw records leave a bank", "Only model weights and salted-hash signals are shared", "Simulated protocol, for demonstration only"] },
    { icon: Scale, situation: "Fraud cases are rare", problem: "Accuracy can look high even when fraud is missed.",
      approach: "Use class weights or resampling; measure recall, F1 and PR-AUC.",
      proof: [`Fraud rate ${pct(totalFraud / totalN)} · class weight 20×`, `“Always legit” model: ${pct(naiveAcc)} accuracy, 0% recall`, `Ours: F1 ${pct(m.f1)} · PR-AUC ${m.prauc.toFixed(3)}`] },
    { icon: GitCompare, situation: "Banks have different patterns", problem: "A shared model may perform differently for each bank.",
      approach: "Test non-IID data and compare FedAvg with FedProx.",
      proof: [`Per-bank recall ${pct(Math.min(...spread))} – ${pct(Math.max(...spread))}`, `FedAvg F1 ${pct(FL.fedavg[12].metrics.f1)} vs FedProx ${pct(FL.fedprox[12].metrics.f1)}`, `FPR ${pct(FL.fedavg[12].metrics.fpr)} vs ${pct(FL.fedprox[12].metrics.fpr)}`] },
  ];
}

export function ApproachDialog() {
  const rows = useApproachRows();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="hdr-btn hdr-pill" data-testid="header-approach-button"><BookOpen size={16} /><span>Approach</span></button>
      </DialogTrigger>
      <DialogContent className="approach-dialog" data-testid="approach-dialog">
        <div className="kicker">Why federated fraud intelligence</div>
        <DialogTitle className="approach-title">Four problems FINSHIELD solves</DialogTitle>
        <div className="approach-grid">
          <div className="ap-head"><span>Situation</span><span>Why it is a problem</span><span>Our approach · live evidence</span></div>
          {rows.map((r, i) => (
            <div className="ap-row" key={r.situation} data-testid={`approach-row-${i}`}>
              <div className="ap-sit"><div className="ap-ic"><r.icon size={17} /></div>{r.situation}</div>
              <div className="ap-prob">{r.problem}</div>
              <div className="ap-appr">
                <div className="ap-appr-text">{r.approach}</div>
                {r.proof.map((p) => <div className="ap-proof" key={p}><CheckCircle2 size={13} />{p}</div>)}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ApproachSection() {
  const rows = useApproachRows();
  return (
    <div className="ap-compact">
      {rows.map((r) => (
        <div className="ap-c-row" key={r.situation}>
          <div className="algo-ic"><r.icon size={16} /></div>
          <div><div className="algo-name">{r.situation}</div><div className="algo-sub">{r.approach}</div><div className="ap-c-proof">{r.proof[1] || r.proof[0]}</div></div>
        </div>
      ))}
    </div>
  );
}
