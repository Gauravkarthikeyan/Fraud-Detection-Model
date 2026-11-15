import { lazy, Suspense, useEffect, useMemo } from "react";
import "@/App.css";
import { Toaster } from "sonner";
import FinShieldHeader from "./ui/FinShieldHeader";
import ActivityDrawer from "./ui/ActivityDrawer";
import IntelligenceDrawer from "./ui/IntelligenceDrawer";
import { SimulationControls, SideToggles, ViewButton, BankInspector } from "./ui/SimulationControls";
import { ShieldLogo } from "./ui/ShieldLogo";

const FinancialDistrict = lazy(() => import("./scene/FinancialDistrict"));

const hasWebGL = () => {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
};

const Loader = () => (
  <div className="fs-loader" data-testid="world-loader"><ShieldLogo size={44} /><span>Building the financial district…</span></div>
);

function App() {
  const webgl = useMemo(hasWebGL, []);
  useEffect(() => { document.documentElement.classList.add("dark"); }, []);
  return (
    <div className="fs-root">
      <div className="fs-world">
        {webgl ? <Suspense fallback={<Loader />}><FinancialDistrict /></Suspense> : (
          <div className="fs-loader" data-testid="webgl-fallback"><ShieldLogo size={44} /><span>Your browser can't display 3D graphics (WebGL is off). Enable hardware acceleration to explore the FINSHIELD district.</span></div>
        )}
      </div>
      <FinShieldHeader />
      <SideToggles />
      <ActivityDrawer />
      <IntelligenceDrawer />
      <BankInspector />
      <SimulationControls />
      <ViewButton />
      <div className="fs-hint" data-testid="nav-hint">Drag to orbit · Right-drag to pan · Scroll to zoom · Click a bank</div>
      <Toaster theme="dark" position="top-center" offset={74} toastOptions={{ className: "fs-toast" }} />
    </div>
  );
}

export default App;
