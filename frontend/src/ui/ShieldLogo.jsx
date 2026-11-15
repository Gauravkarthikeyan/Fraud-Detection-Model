export function ShieldLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="fsg" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9fdcff" /><stop offset="1" stopColor="#3a7bff" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 27 6.6v8.2c0 6.9-4.6 12-11 14.7C9.6 26.8 5 21.7 5 14.8V6.6L16 2.5Z" stroke="url(#fsg)" strokeWidth="2" fill="rgba(58,123,255,0.16)" />
      <path d="M16 9.2 21.4 12.3v6.2L16 21.6l-5.4-3.1v-6.2L16 9.2Z" stroke="url(#fsg)" strokeWidth="1.7" fill="rgba(159,220,255,0.18)" />
      <circle cx="16" cy="15.4" r="1.9" fill="#bfe8ff" />
    </svg>
  );
}
