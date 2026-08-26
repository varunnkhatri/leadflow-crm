import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceSection } from "@/components/workspace-section";

export default function PipelinePage() {
  return <WorkspaceShell title="PIPELINE" eyebrow="01 / OPPORTUNITY FLOW"><WorkspaceSection kind="Pipeline" /></WorkspaceShell>;
}
