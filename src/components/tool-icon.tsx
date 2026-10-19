import { ClockIcon, PencilIcon, ShuffleIcon, UsersIcon } from "@/components/icons";
import type { ToolId } from "@/data/tools";

const icons = {
  countdown: ClockIcon,
  draw: ShuffleIcon,
  groups: UsersIcon,
  whiteboard: PencilIcon,
} as const;

export function ToolIcon({ id, size = 24 }: { id: ToolId; size?: number }) {
  const Icon = icons[id];
  return <Icon size={size} />;
}
