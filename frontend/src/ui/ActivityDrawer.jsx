import { useSim, engine } from "../sim/store";
import { BANKS, BANK_MAP } from "../sim/transactions";
import { Drawer, Section } from "./Drawer";
import { AlertItem } from "./FinShieldHeader";
import { TxRow } from "../scene/BankTransactionPanel";

export default function ActivityDrawer() {
  const open = useSim((s) => s.drawer === "activity");
  const close = useSim((s) => s.toggleDrawer);
  const counts = useSim((s) => s.counts);
  const alerts = useSim((s) => s.alerts);
  const feeds = useSim((s) => s.feeds);
  const bankAlert = useSim((s) => s.bankAlert);
  const select = useSim((s) => s.select);
  useSim((s) => s.tick);
  const total = BANKS.reduce((a, b) => a + counts[b.id].total, 0);
  const sus = BANKS.reduce((a, b) => a + counts[b.id].suspicious, 0);
  const recent = BANKS.flatMap((b) => feeds[b.id].slice(0, 4)).sort((a, b) => b.t - a.t).slice(0, 5);
  const fraudAlerts = alerts.filter((a) => a.level !== "info").slice(0, 3);
  return (
    <Drawer side="left" open={open} onClose={() => close(null)} title="Network Activity" kicker="Live · 4 institutions" testId="activity-drawer">
      <div className="stat-pair">
        <div className="stat"><div className="stat-label">Transactions today</div><div className="stat-val" data-testid="total-transactions">{total.toLocaleString("en-IN")}</div></div>
        <div className="stat"><div className="stat-label">Suspicious</div><div className="stat-val amber" data-testid="suspicious-count">{sus}</div></div>
      </div>
      <Section title="Connected banks">
        <div className="bank-list">
          {BANKS.map((b) => (
            <button key={b.id} className="bank-line" onClick={() => select(b.id)} data-testid={`activity-bank-${b.id}`}>
              <span className={`dot ${bankAlert[b.id] ? `dot-${bankAlert[b.id]}` : "dot-ok"}`} />
              <span className="bank-line-name">{b.name}<small>{b.profile}</small></span>
              <span className="mono">{counts[b.id].total.toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Latest fraud alerts">
        {fraudAlerts.length ? <div className="space-y-2">{fraudAlerts.map((a) => <AlertItem key={a.id} a={a} />)}</div>
          : <div className="muted-note">No fraud alerts yet. Use “Inject fraud” to run the cross-bank scenario.</div>}
      </Section>
      <Section title="Recent activity">
        <div className="space-y-1.5">
          {recent.map((t) => (
            <div key={t.id}><div className="recent-bank">{BANK_MAP[t.bank].name}</div><TxRow tx={t} now={engine.time} compact /></div>
          ))}
        </div>
      </Section>
    </Drawer>
  );
}
