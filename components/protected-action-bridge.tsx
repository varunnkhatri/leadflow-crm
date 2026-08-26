"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const routes: Record<string, string> = {
  Dashboard: "/protected",
  Leads: "/leads",
  Pipeline: "/pipeline",
  Customers: "/customers",
  Conversations: "/conversations",
  Tasks: "/tasks",
  "AI Agents": "/ai-agents",
  Campaigns: "/campaigns",
  Analytics: "/analytics",
  Integrations: "/integrations",
  "View pipeline": "/pipeline",
  "View all": "/leads",
  "Ask AI": "/ai-agents",
};

export function ProtectedActionBridge() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const item = target.closest("a, aside nav > div, button");
      if (!item) return;
      const text = item.textContent?.replace(/\d+/g, "").trim() || "";
      const key = Object.keys(routes).find((name) => text.includes(name));
      if (!key) return;
      const isSidebar = Boolean(target.closest("aside nav"));
      const isAction = text.includes("View pipeline") || text.includes("View all") || text.includes("Ask AI");
      if (!isSidebar && !isAction) return;
      const href = routes[key];
      if (href === window.location.pathname) return;
      event.preventDefault();
      router.push(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);
  return null;
}
