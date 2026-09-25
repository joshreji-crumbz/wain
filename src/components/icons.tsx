type IconProps = { className?: string };

const base = "h-5 w-5";

function Svg({
  className = base,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function CameraIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </Svg>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="m5 17 4.5-5 3.5 4 2.5-3 3.5 4" />
      <circle cx="9" cy="9" r="1.4" />
    </Svg>
  );
}

export function LinkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 13a4 4 0 0 0 5.7.3l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M14 11a4 4 0 0 0-5.7-.3L5.7 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </Svg>
  );
}

export function MicIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </Svg>
  );
}

export function WaveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
    </Svg>
  );
}

export function MapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  );
}

export function ChatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
    </Svg>
  );
}

export function DirectionsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m3 11 18-8-8 18-2-8z" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10" />
      <path d="M16 3c-1.5 1.5-2 3-2 5s.7 3 2 3v10" />
    </Svg>
  );
}

export function InstagramIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" />
    </Svg>
  );
}

export function WebsiteIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Svg>
  );
}

export function PhoneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 12l5 2v4a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 3z" />
    </Svg>
  );
}

export function BackIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function BookmarkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4h12v16l-6-4-6 4z" />
    </Svg>
  );
}

export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </Svg>
  );
}

export function DotsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.8" />
    </Svg>
  );
}

export function PinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </Svg>
  );
}

export function DocIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h6M10 16h6" />
    </Svg>
  );
}

export function PeopleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M17 14c2.3.8 4 2.9 4 6" />
    </Svg>
  );
}

export function VideoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="m16 11 5-3v8l-5-3z" />
    </Svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={p.className ?? base} aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function VerifiedIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={p.className ?? base} aria-hidden>
      <path d="m12 2 2.4 1.9 3-.3 1 2.9 2.6 1.6L20 11l1 2.9-2.6 1.6-1 2.9-3-.3L12 20l-2.4-1.9-3 .3-1-2.9L3 13.9 4 11 3 8.1l2.6-1.6 1-2.9 3 .3z" />
      <path d="m8.5 12 2.3 2.3 4.7-4.7" stroke="#0B0907" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}
