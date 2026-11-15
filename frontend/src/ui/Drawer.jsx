import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Drawer({ side, open, onClose, title, kicker, children, testId }) {
  const x = side === "left" ? -40 : 40;
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className={`fs-drawer fs-drawer-${side}`} data-testid={testId}
          initial={{ opacity: 0, x }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          <div className="drawer-head">
            <div><div className="kicker">{kicker}</div><h2 className="drawer-title">{title}</h2></div>
            <button className="icon-btn" onClick={onClose} data-testid={`${testId}-close`} aria-label="Close"><X size={18} /></button>
          </div>
          <div className="drawer-body">{children}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export const Section = ({ title, children, right }) => (
  <section className="d-section">
    <div className="d-section-head"><span>{title}</span>{right}</div>
    {children}
  </section>
);
