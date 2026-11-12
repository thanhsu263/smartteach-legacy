import type { ReactNode } from "react";
import { CheckIcon, CloseIcon } from "@/components/icons";

export function WorkspaceFeedback({ tone, children }: { tone: "success" | "error"; children?: ReactNode }) {
  const Icon = tone === "error" ? CloseIcon : CheckIcon;
  return (
    <p role={tone === "error" ? "alert" : "status"} aria-atomic="true" data-work-feedback={tone}>
      {children ? <><Icon size={18} /><span>{children}</span></> : null}
    </p>
  );
}
