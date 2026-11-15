import { Html } from "@react-three/drei";
import { ArrowUpRight, ArrowDownLeft, Download, ShoppingCart, Building2, Home, TrendingUp, AlertTriangle, ShieldAlert, Link2, Landmark, ChevronDown } from "lucide-react";
import { ROOF_Y } from "./layout";
import { useSim, engine } from "../sim/store";
import { formatINR, agoLabel } from "../sim/transactions";

export const TX_ICONS = { send: ArrowUpRight, arrowIn: ArrowDownLeft, download: Download, cart: ShoppingCart, building: Building2, home: Home, trend: TrendingUp, alert: AlertTriangle, shield: ShieldAlert, link: Link2 };
const ICON_TONE = { send: "green", arrowIn: "green", download: "blue", cart: "violet", building: "blue", home: "violet", trend: "violet", alert: "amber", shield: "red", link: "amber" };

export function TxRow({ tx, now, compact = false }) {
  const Icon = TX_ICONS[tx.icon] || ArrowUpRight;
  const tone = tx.status === "fraud" ? "red" : tx.status === "suspicious" ? "amber" : ICON_TONE[tx.icon];
  const amtClass = tx.status === "fraud" ? "amt-red" : tx.status === "suspicious" ? "amt-amber" : tx.dir === "in" ? "amt-green" : "amt-out";
  return (
    <div className={`tx-row is-${tx.status} ${compact ? "is-compact" : ""}`} data-testid={`tx-row-${tx.id}`}>
      <div className={`tx-icon tone-${tone}`}><Icon size={compact ? 15 : 18} strokeWidth={2.4} /></div>
      <div className="tx-main">
        <div className="tx-title">{tx.cat}{tx.note && <span className="tx-note">{tx.note}</span>}</div>
        <div className="tx-sub">{tx.cp}</div>
      </div>
      <div className="tx-right">
        <div className={`tx-amt ${amtClass}`}>{tx.dir === "in" ? "+ " : "− "}{formatINR(tx.amount)}</div>
        <div className="tx-time">{agoLabel(now, tx.t)}</div>
      </div>
    </div>
  );
}

export function BankTransactionPanel({ bank }) {
  const feed = useSim((s) => s.feeds[bank.id]);
  useSim((s) => s.tick);
  const select = useSim((s) => s.select);
  const selected = useSim((s) => s.selected === bank.id);
  const alert = useSim((s) => s.bankAlert[bank.id]);
  const now = engine.time;
  return (
    <Html transform sprite position={[bank.pos[0], ROOF_Y, bank.pos[1]]} distanceFactor={8} zIndexRange={[5, 0]} className="tx-html">
      <div className="tx-anchor">
        <div className={`tx-panel ${selected ? "is-selected" : ""} ${alert ? `alert-${alert}` : ""}`} data-testid={`tx-panel-${bank.id}`} onClick={() => select(bank.id)}>
          <div className="tx-head">
            <div className="tx-bank-icon"><Landmark size={22} strokeWidth={2.2} /></div>
            <div>
              <div className="tx-bank">{bank.name}</div>
              <div className="tx-live">Live Transactions</div>
            </div>
            <div className="tx-rt"><span className="rt-dot" />Real-time</div>
          </div>
          <div className="tx-rows">
            {feed.slice(0, 3).map((tx) => <TxRow key={tx.id} tx={tx} now={now} />)}
          </div>
          <div className="tx-more">+{feed.length - 3} more transactions <ChevronDown size={14} /></div>
        </div>
        <div className="tx-pointer" />
      </div>
    </Html>
  );
}
