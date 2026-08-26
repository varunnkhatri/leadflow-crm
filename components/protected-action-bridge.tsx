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
};

export function ProtectedActionBridge() {
  const router = useRouter();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const nav = target.closest("aside nav");
      if (!nav) return;
      const item = target.closest("a, aside nav > div");
      if (!item) return;
      const label = item.textContent?.replace(/\d+/g, "").trim() || "";
      const key = Object.keys(routes).find((name) => label.includes(name));
      if (!key) return;
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
