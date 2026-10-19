import type { Metadata } from "next";
import { CountdownTool } from "@/components/countdown-tool";
import { ToolPage } from "@/components/tool-page";
import { findTool } from "@/data/tools";

const tool = findTool("countdown");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function CountdownPage() {
  return (
    <ToolPage id="countdown">
      <CountdownTool />
    </ToolPage>
  );
}
