import { connection } from "next/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceModule } from "@/components/workspace-module";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("users").select("business_id").eq("id", user.id).maybeSingle();
  if (!profile?.business_id) redirect("/protected");
  const [{ data: conversationsData }, { data: messagesData }] = await Promise.all([
    supabase.from("conversations").select("id, customer_id, channel, status, ai_paused, updated_at, customers (full_name)").eq("business_id", profile.business_id).order("updated_at", { ascending: false }).limit(40),
    supabase.from("messages").select("id, conversation_id, direction, actor, body, created_at").eq("business_id", profile.business_id).order("created_at", { ascending: true }).limit(300),
  ]);
  const messages = (messagesData ?? []).map((m) => ({ id: m.id as string, conversationId: m.conversation_id as string, direction: m.direction as string, actor: m.actor as string, body: m.body as string | null, createdAt: String(m.created_at) }));
  const lastByConversation = new Map<string, string | null>();
  messages.forEach((m) => lastByConversation.set(m.conversationId, m.body));
  const conversations = (conversationsData ?? []).map((c) => ({ id: c.id as string, customerId: c.customer_id as string, name: Array.isArray(c.customers) ? (c.customers[0]?.full_name || "Unknown customer") : (c.customers?.full_name || "Unknown customer"), channel: String(c.channel), status: String(c.status), aiPaused: Boolean(c.ai_paused), lastMessage: lastByConversation.get(c.id) || null, updated: String(c.updated_at) }));
  return <WorkspaceShell title="CONVERSATIONS" eyebrow="03 / CUSTOMER SIGNAL"><WorkspaceModule kind="conversations" conversations={conversations} messages={messages} /></WorkspaceShell>;
}
