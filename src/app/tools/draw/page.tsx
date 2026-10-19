import type { Metadata } from "next";
import { DrawTool } from "@/components/draw-tool";
import { ToolPage } from "@/components/tool-page";
import { findTool } from "@/data/tools";

const tool = findTool("draw");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function DrawPage() {
  return (
    <ToolPage id="draw">
      <DrawTool />
    </ToolPage>
  );
}
