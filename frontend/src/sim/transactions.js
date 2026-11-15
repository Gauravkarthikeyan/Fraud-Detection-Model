export const BANKS = [
  { id: "alpha", name: "Alpha Bank", pos: [-11, -11], profile: "High-volume retail & UPI", base: 18420 },
  { id: "metro", name: "Metro Bank", pos: [11, -11], profile: "Business payments & account transfers", base: 9310 },
  { id: "unity", name: "Unity Bank", pos: [-11, 11], profile: "Merchant payments & small tickets", base: 15260 },
  { id: "national", name: "National Bank", pos: [11, 11], profile: "High-value & recurring transfers", base: 6840 },
];
export const BANK_IDS = BANKS.map((b) => b.id);
export const BANK_MAP = Object.fromEntries(BANKS.map((b) => [b.id, b]));
export const INJECT_ORDER = ["alpha", "metro", "national", "unity"];

const T = {
  alpha: [
    ["UPI Transfer", "send", "out", ["To Rahul S.", "To Priya K.", "To Arjun M.", "To Sneha R."], [200, 5000], 5],
    ["Salary Credit", "download", "in", ["Tech Solutions Pvt. Ltd.", "Infosys Ltd."], [42000, 130000], 1],
    ["Card Payment", "cart", "out", ["Amazon India", "Flipkart", "Swiggy"], [299, 4200], 3],
    ["UPI Received", "arrowIn", "in", ["From Karan D.", "From Meera J."], [500, 9000], 2],
  ],
  metro: [
    ["NEFT Transfer", "send", "out", ["To Global Traders", "To Apex Logistics"], [50000, 800000], 3],
    ["Client Credit", "arrowIn", "in", ["Fusion Global", "Orion Exports"], [120000, 1200000], 2],
    ["RTGS Payment", "building", "out", ["Sterling Steel Ltd.", "BlueLine Freight"], [200000, 1500000], 1],
    ["UPI Payment", "cart", "out", ["Amazon Business", "Zoho Subscription"], [480, 9800], 2],
  ],
  unity: [
    ["Merchant Payment", "cart", "out", ["Reliance Fresh", "DMart", "Zomato"], [90, 2400], 5],
    ["UPI Transfer", "send", "out", ["To Priya K.", "To Vikram T."], [150, 3000], 3],
    ["FD Interest", "download", "in", ["Fixed Deposit", "Recurring Deposit"], [1800, 42000], 1],
    ["Loan EMI", "home", "out", ["Home Loan", "Auto Loan"], [12000, 38000], 1],
  ],
  national: [
    ["Salary Credit", "download", "in", ["Tech Solutions Pvt. Ltd.", "Larsen & Toubro"], [60000, 240000], 2],
    ["Rent Payment", "home", "out", ["Home Office", "Skyline Estates"], [22000, 65000], 2],
    ["Investment", "trend", "out", ["Mutual Fund SIP", "Gold Bonds"], [5000, 150000], 2],
    ["RTGS Transfer", "building", "out", ["To Horizon Capital", "To Meridian Holdings"], [250000, 2500000], 1],
  ],
};

export const FRAUD_SCRIPT = {
  alpha: { cat: "UPI Transfer", cp: "New payee · new device", amount: 48500 },
  metro: { cat: "NEFT Transfer", cp: "Zenith Impex (new beneficiary)", amount: 940000 },
  national: { cat: "RTGS Transfer", cp: "Crestline Ventures (new)", amount: 2150000 },
  unity: { cat: "Card Payment", cp: "Rapid card tests ×6", amount: 4794 },
};
export const LINKED_SCRIPT = {
  alpha: { cat: "UPI Transfer", amount: 24900 },
  metro: { cat: "NEFT Transfer", amount: 310000 },
  national: { cat: "IMPS Transfer", amount: 185000 },
  unity: { cat: "Merchant Payment", amount: 2999 },
};

const niceRound = (a) => (a > 100000 ? Math.round(a / 1000) * 1000 : a > 10000 ? Math.round(a / 100) * 100 : a > 1000 ? Math.round(a / 10) * 10 - 1 : Math.round(a));

export function pickTx(r, bankId) {
  const list = T[bankId];
  const tot = list.reduce((a, t) => a + t[5], 0);
  let x = r() * tot, t = list[0];
  for (const it of list) { x -= it[5]; if (x <= 0) { t = it; break; } }
  const [cat, icon, dir, cps, [lo, hi]] = t;
  const amount = niceRound(lo * Math.pow(hi / lo, r()));
  return { cat, icon, dir, cp: cps[Math.floor(r() * cps.length)], amount };
}

export const formatINR = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
export const agoLabel = (now, t) => {
  const m = Math.floor(Math.max(0, now - t) / 15);
  return m < 1 ? "Just now" : `${m} min ago`;
};
