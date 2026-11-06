const PATHS = {
  back: "M15 5l-7 7 7 7",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3",
  redo: "M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3",
  play: "M7 4.5v15l12-7.5z",
  pause: "M7 4h4v16H7zM13 4h4v16h-4z",
  toStart: "M6 5v14M19 5l-10 7 10 7z",
  plus: "M12 5v14M5 12h14",
  person: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  magnet: "M6 4v8a6 6 0 0012 0V4M6 4h4v8a2 2 0 004 0V4h4M6 8h4M14 8h4",
  path: "M5 19c3-1 4-6 7-7s5 1 7-4M15 6h4v4",
  stage: "M3 6h18v12H3zM12 6v12M7.5 6v12M16.5 6v12M3 12h18",
  share: "M12 3v12M7 8l5-5 5 5M5 13v6h14v-6",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  close: "M6 6l12 12M18 6L6 18",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M8 8h12v12H8zM4 16V4h12",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  file: "M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14l3 3 3-3",
  open: "M14 3H6v18h12V7zM14 3v4h4M12 17v-6M9 14l3-3 3 3",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1 1 0 100-.01",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const filled = name === "play" || name === "pause";
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
