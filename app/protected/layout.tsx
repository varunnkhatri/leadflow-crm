export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Authentication is enforced by the dashboard itself. Keep this layout neutral so
  // workspace navigation is owned by WorkspaceShell instead of a global click bridge.
  return <>{children}</>;
}
