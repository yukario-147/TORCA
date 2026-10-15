// src/icons.jsx
// 線画アイコン（ナビ・操作ボタン用）。currentColor で色が付く

const PATHS = {
  home: <><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9v10a1.5 1.5 0 0 0 1.5 1.5h3.5v-6h3v6H17a1.5 1.5 0 0 0 1.5-1.5V9" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  film: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="M3.5 9.5h17M3.5 14.5h17M8.5 5v4.5M15.5 5v4.5M8.5 14.5V19M15.5 14.5V19" /></>,
  ticket: <><path d="M4 8.5V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5Z" /><path d="M14 5.5v1.5M14 10v1.5M14 14.5V16" /></>,
  gear: <><path d="M18.75 10.13 L21.06 10.42 L21.06 13.58 L18.75 13.87 L18.09 15.45 L19.53 17.29 L17.29 19.53 L15.45 18.09 L13.87 18.75 L13.58 21.06 L10.42 21.06 L10.13 18.75 L8.55 18.09 L6.71 19.53 L4.47 17.29 L5.91 15.45 L5.25 13.87 L2.94 13.58 L2.94 10.42 L5.25 10.13 L5.91 8.55 L4.47 6.71 L6.71 4.47 L8.55 5.91 L10.13 5.25 L10.42 2.94 L13.58 2.94 L13.87 5.25 L15.45 5.91 L17.29 4.47 L19.53 6.71 L18.09 8.55Z" /><circle cx="12" cy="12" r="2.8" /></>,
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  chevron: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  external: <><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5 11 13" /><path d="M18 14v4a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5h4" /></>,
  clipboard: <><rect x="6" y="4.5" width="12" height="16" rx="2.5" /><path d="M9.5 4.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.5" /><path d="M9 10.5h6M9 14.5h4" /></>,
  trash: <><path d="M4.5 7h15M10 7V5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V7" /><path d="M6.5 7l.8 11.2A1.5 1.5 0 0 0 8.8 19.5h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7" /></>,
  share: <><path d="M12 15V4.5M8 8.5l4-4 4 4" /><path d="M5.5 12.5V18a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-5.5" /></>,
  download: <><path d="M12 4.5V15M8 11l4 4 4-4" /><path d="M5 19.5h14" /></>,
  star: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4Z" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  prev: <><path d="M6.5 5.5v13" /><path d="M18 5.5v13L9 12l9-6.5Z" fill="currentColor" stroke="none" /></>,
  next: <><path d="M17.5 5.5v13" /><path d="M6 5.5v13L15 12 6 5.5Z" fill="currentColor" stroke="none" /></>,
  refresh: <><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></>,
  sparkle: <path d="M12 3.5c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7Z" fill="currentColor" stroke="none" />,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
};

export function Icon({ name, size = 20, stroke = 2, filled = false, style, className }) {
  const body = PATHS[name];
  if (!body) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      style={{ flexShrink: 0, ...style }} className={className}
    >
      {body}
    </svg>
  );
}
