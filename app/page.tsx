import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.22),transparent_32%),radial-gradient(circle_at_85%_30%,rgba(124,58,237,0.18),transparent_30%)]" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-600/25">
            L
          </span>
          <span className="text-xl font-semibold tracking-tight">LeadFlow</span>
          <span className="hidden rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-xs font-medium text-blue-300 sm:inline">
            AI CRM
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-sm text-blue-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Intelligent lead management
          </div>

          <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Turn every enquiry into a{" "}
            <span className="text-blue-400">sales opportunity.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
            LeadFlow brings your customer enquiries, AI lead scoring and sales
            pipeline together in one focused CRM. Know who needs attention and
            what to do next.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-semibold shadow-xl shadow-blue-600/20 transition hover:bg-blue-500"
            >
              Start managing leads
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-white/5 px-6 font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Sign in to CRM →
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>✓ AI-assisted scoring</span>
            <span>✓ Centralized customer data</span>
            <span>✓ Real-time lead pipeline</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-blue-600/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <div>
                <p className="text-sm text-slate-500">Dashboard</p>
                <p className="mt-1 font-semibold">Lead overview</p>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
              <Stat label="Total leads" value="128" />
              <Stat label="Hot" value="24" accent="text-red-400" />
              <Stat label="Warm" value="41" accent="text-amber-400" />
              <Stat label="Open" value="86" accent="text-blue-400" />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <span className="text-sm font-medium">Recent leads</span>
                <span className="text-xs text-slate-500">AI scored</span>
              </div>
              <LeadPreview name="Restaurant website" score="90" temp="HOT" />
              <LeadPreview name="Commercial property" score="76" temp="WARM" />
              <LeadPreview name="Marketing enquiry" score="52" temp="COLD" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-slate-800/80 bg-slate-950/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:grid-cols-3 lg:px-8">
          <Feature title="Capture" text="Bring enquiries into one structured customer record instead of losing them across inboxes and chats." />
          <Feature title="Understand" text="Use AI-assisted intent, urgency and lead scoring to prioritize the opportunities that matter." />
          <Feature title="Act" text="Give your team a clear pipeline, customer context and recommended next action for every lead." />
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© 2026 LeadFlow CRM</p>
        <div className="flex gap-5">
          <Link href="/auth/login" className="hover:text-white">Sign in</Link>
          <Link href="/auth/sign-up" className="hover:text-white">Create account</Link>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value, accent = "text-white" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function LeadPreview({ name, score, temp }: { name: string; score: string; temp: string }) {
  const tempClass = temp === "HOT" ? "text-red-400 bg-red-400/10" : temp === "WARM" ? "text-amber-400 bg-amber-400/10" : "text-sky-400 bg-sky-400/10";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="mt-1 text-xs text-slate-500">Customer enquiry</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${tempClass}`}>{temp}</span>
        <span className="w-8 text-right text-sm font-bold">{score}</span>
      </div>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">{title}</p>
      <p className="mt-3 leading-7 text-slate-400">{text}</p>
    </div>
  );
}
