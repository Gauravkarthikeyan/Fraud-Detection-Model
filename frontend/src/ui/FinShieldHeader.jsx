import { useState } from "react";
import { Search, Bell, UserRound, Landmark, ShieldAlert, Link2, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "../components/ui/command";
import { ShieldLogo } from "./ShieldLogo";
import { useSim } from "../sim/store";
import { BANKS, BANK_MAP, formatINR } from "../sim/transactions";

const LEVEL_ICON = { fraud: ShieldAlert, linked: Link2, info: Info };

export function AlertItem({ a }) {
  const Icon = LEVEL_ICON[a.level];
  return (
    <div className={`alert-item lvl-${a.level}`} data-testid={`alert-${a.id}`}>
      <div className="alert-ic"><Icon size={16} /></div>
      <div><div className="alert-title">{a.title}</div><div className="alert-detail">{a.detail}</div></div>
    </div>
  );
}

function SearchMenu() {
  const [open, setOpen] = useState(false);
  const feeds = useSim((s) => s.feeds);
  const select = useSim((s) => s.select);
  const pick = (id) => { select(id); setOpen(false); };
  const txs = BANKS.flatMap((b) => feeds[b.id].slice(0, 5));
  return (
    <>
      <button className="hdr-btn" data-testid="header-search-button" onClick={() => setOpen(true)} aria-label="Search"><Search size={18} /></button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search banks or transactions…" data-testid="search-input" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Banks">
            {BANKS.map((b) => (
              <CommandItem key={b.id} value={`${b.name} ${b.profile}`} onSelect={() => pick(b.id)} data-testid={`search-bank-${b.id}`}>
                <Landmark /> <span>{b.name}</span><span className="ml-auto text-xs opacity-60">{b.profile}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Recent transactions">
            {txs.map((t) => (
              <CommandItem key={t.id} value={`${t.cat} ${t.cp} ${BANK_MAP[t.bank].name} ${t.id}`} onSelect={() => pick(t.bank)}>
                <span>{t.cat} · {t.cp}</span><span className="ml-auto text-xs opacity-60">{BANK_MAP[t.bank].name} · {formatINR(t.amount)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function Notifications() {
  const alerts = useSim((s) => s.alerts);
  const [seen, setSeen] = useState(0);
  const unread = Math.max(0, alerts.length - seen);
  return (
    <Popover onOpenChange={(o) => o && setSeen(alerts.length)}>
      <PopoverTrigger asChild>
        <button className="hdr-btn" data-testid="header-notifications-button" aria-label="Notifications">
          <Bell size={18} />{unread > 0 && <span className="hdr-badge" data-testid="notification-badge">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="fs-pop w-[340px]" data-testid="notifications-popover">
        <div className="pop-title">Alerts</div>
        {alerts.length === 0 ? <div className="pop-empty">No alerts yet. Start the simulation and inject a fraud event.</div>
          : <div className="space-y-2">{alerts.slice(0, 6).map((a) => <AlertItem key={a.id} a={a} />)}</div>}
      </PopoverContent>
    </Popover>
  );
}

function Profile() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hdr-btn hdr-avatar" data-testid="header-profile-button" aria-label="Profile"><UserRound size={18} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="fs-pop w-[260px]" data-testid="profile-popover">
        <div className="flex items-center gap-3">
          <div className="avatar-lg">AM</div>
          <div><div className="pop-title !mb-0">Aditi Mehta</div><div className="pop-empty !p-0">Fraud Intelligence Analyst</div></div>
        </div>
        <div className="pop-note">Demo profile · FINSHIELD network observer</div>
      </PopoverContent>
    </Popover>
  );
}

export default function FinShieldHeader() {
  return (
    <header className="fs-header" data-testid="app-header">
      <div className="hdr-left">
        <div className="win-dots"><span /><span /><span /></div>
        <ShieldLogo size={22} />
      </div>
      <div className="hdr-notch" data-testid="brand-wordmark">
        <ShieldLogo size={24} />
        <span className="wordmark">FINSHIELD</span>
      </div>
      <div className="hdr-right">
        <SearchMenu />
        <Notifications />
        <Profile />
      </div>
    </header>
  );
}
