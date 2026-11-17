import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Logo "G" nhiều màu theo hướng dẫn nút đăng nhập của Google; giữ màu gốc nên không dùng `Icon`. */
export function GoogleLogo({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...props}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </Icon>
  );
}

export function ShuffleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7h3a5 5 0 0 1 4 2l4 6a5 5 0 0 0 4 2h3M3 17h3a5 5 0 0 0 4-2M14 9a5 5 0 0 1 4-2h3" />
      <path d="M18 4l3 3-3 3M18 14l3 3-3 3" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.3a6.5 6.5 0 0 1 3.5 5.7" />
    </Icon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
      <path d="M14.5 6.5l3 3" />
    </Icon>
  );
}

export function GamepadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 8h10a4 4 0 0 1 3.9 4.8l-.8 4a2.5 2.5 0 0 1-4.3 1.2L14 16H10l-1.8 2a2.5 2.5 0 0 1-4.3-1.2l-.8-4A4 4 0 0 1 7 8z" />
      <path d="M8 10.5v3M6.5 12h3M15.5 11h.01M17.5 13h.01" />
    </Icon>
  );
}

export function SchoolIcon(props: IconProps) {
  return <Icon {...props}><path d="m3 10 9-5 9 5v9H3z" /><path d="M7 19v-5h10v5M10 19v-5h4v5M3 10h18" /></Icon>;
}

export function DashboardIcon(props: IconProps) {
  return <Icon {...props}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></Icon>;
}

export function ClipboardListIcon(props: IconProps) {
  return <Icon {...props}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6v3H9zM9 12h6M9 16h4" /></Icon>;
}

export function BlocksIcon(props: IconProps) {
  return <Icon {...props}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></Icon>;
}

export function PanelLeftIcon(props: IconProps) {
  return <Icon {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M14 9l-3 3 3 3" /></Icon>;
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Icon>
  );
}

export function FullscreenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Icon>
  );
}

/** Trái tim; `filled` tô đặc để phân biệt trạng thái bằng hình dạng, không chỉ bằng màu. */
export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12.5l5 5L20 6.5" />
    </Icon>
  );
}

export function TreasureIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
      <rect x="3" y="11" width="18" height="9" rx="2" />
      <path d="M3 15h18M12 13v4" />
    </Icon>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Icon>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M10 11v5M14 11v5M9 7l1-3h4l1 3M6 7l1 13h10l1-13" />
    </Icon>
  );
}

export function LogoMark({ size = 32, ...props }: IconProps) {
  // Id gradient riêng cho mỗi logo: nếu trùng id, logo đầu nằm trong vùng display:none (cột showcase,
  // sidebar ẩn trên mobile) làm các logo sau mất nền.
  const uid = useId();
  const fillId = `${uid}-fill`;
  const glossId = `${uid}-gloss`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
        <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.48" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="0.52" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${fillId})`} />
      <rect width="64" height="64" rx="14" fill={`url(#${glossId})`} />
      <rect x="12" y="14" width="40" height="28" rx="5" fill="none" stroke="#fff" strokeWidth="4" />
      <path
        d="M22 28l7 7 13-14"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 52h24" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h4" />
    </Icon>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5Z" />
    </Icon>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.8 4.5 5.6v5.8c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.6Z" />
      <path d="m8.8 12 2.2 2.2 4.3-4.4" />
    </Icon>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h5" />
    </Icon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.5 11.8 8.2 16.5 10l-4.7 1.8L10 16.5l-1.8-4.7L3.5 10l4.7-1.8Z" />
      <path d="M18 14.5 18.9 16.6 21 17.5l-2.1.9L18 20.5l-.9-2.1-2.1-.9 2.1-.9Z" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </Icon>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21.5 12h-4l-3 8.5-5-17-3 8.5h-4" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 6h12M8.5 12h12M8.5 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9.5" />
    </Icon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function HelpCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.5M12 17.5h.01" />
    </Icon>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21.5 12.5h-6l-2 3h-3l-2-3h-6" />
      <path d="M5.9 5.1 2.5 12.5V18a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-5.5l-3.4-7.4A2 2 0 0 0 16.3 4H7.7a2 2 0 0 0-1.8 1.1Z" />
    </Icon>
  );
}
