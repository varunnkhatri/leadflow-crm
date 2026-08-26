import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceSection } from "@/components/workspace-section";
import { requireWorkspaceUser } from "@/lib/require-workspace-user";

export default async function PipelinePage() {
  await requireWorkspaceUser();
  return <WorkspaceShell title="PIPELINE" eyebrow="01 / OPPORTUNITY FLOW"><WorkspaceSection kind="Pipeline" /></WorkspaceShell>;
}
