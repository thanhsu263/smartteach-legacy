import type { Metadata } from "next";
import { GroupsTool } from "@/components/groups-tool";
import { ToolPage } from "@/components/tool-page";
import { findTool } from "@/data/tools";

const tool = findTool("groups");

export const metadata: Metadata = { title: tool.title, description: tool.description };

export default function GroupsPage() {
  return (
    <ToolPage id="groups">
      <GroupsTool />
    </ToolPage>
  );
}
