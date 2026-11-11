import {
  Bell,
  Camera,
  Clock,
  Folder,
  House,
  List,
  LogOut,
  Mail,
  MessageCircle,
  MoreHorizontal,
  PanelLeft,
  Settings,
  Sparkles,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
export type IconName =
  | "home"
  | "message"
  | "clock"
  | "file"
  | "people"
  | "spark"
  | "user"
  | "camera"
  | "bell"
  | "gear"
  | "list"
  | "mail"
  | "wallet";

const ICONS: Record<IconName | "more" | "panel" | "logout" | "wallet", LucideIcon> = {
  home: House,
  message: MessageCircle,
  clock: Clock,
  file: Folder,
  people: Users,
  spark: Sparkles,
  user: User,
  camera: Camera,
  bell: Bell,
  gear: Settings,
  list: List,
  mail: Mail,
  more: MoreHorizontal,
  panel: PanelLeft,
  logout: LogOut,
  wallet: Wallet,
};

export function LineIcon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName | "more" | "panel" | "logout" | "wallet";
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
