import type { Metadata } from "next";
import { ToolPage } from "@/components/tool-page";
import { WhiteboardTool } from "@/components/whiteboard-tool";
import { findTool } from "@/data/tools";

const tool = findTool("whiteboard");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function WhiteboardPage() {
  return (
    <ToolPage id="whiteboard">
      <WhiteboardTool />
    </ToolPage>
  );
}
