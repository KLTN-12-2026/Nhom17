type AuthShellProps = {
  children: React.ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f8f7f3] lg:grid-cols-2">
      {/* Left showcase */}
      <section className="relative hidden overflow-hidden bg-[#2450d8] px-12 py-10 text-white lg:flex lg:flex-col">
        {/* subtle background glow */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black tracking-tight text-[#2450d8] shadow-[0_4px_0_rgba(15,23,42,0.15)]">
            PQP
          </div>

          <div className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
            AI CORE 4.2
          </div>
        </div>

        {/* Main content */}
        <div className="relative my-auto max-w-xl py-12">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
              Adaptive Quiz / AI-Powered Platform
            </span>
          </div>

          <h1 className="max-w-lg text-5xl font-bold leading-[0.98] tracking-[-0.04em]">
            A calmer, smarter way
            <br />
            to know what you
            <br />
            know.
          </h1>

          <p className="mt-6 max-w-lg text-sm leading-6 text-blue-100">
            Assess, understand, and keep moving with an AI-powered
            personalized exam companion designed for focused academic
            mastery.
          </p>

          {/* Feature cards */}
          <div className="mt-12 space-y-3">
            <FeatureCard
              icon="🛡"
              title="Real-time Anti-Cheating Monitoring"
              description="Browser lockdown, multi-tab telemetry, and biometric face p..."
            />

            <FeatureCard
              icon="◉"
              title="AI Mistake Diagnosis"
              description="Instant cognitive flaw detection with tailored micro-remediati..."
            />

            <FeatureCard
              icon="♟"
              title="Live Collaborative Rooms"
              description="Synchronous peer challenges, live proctoring dashboard & in..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-auto">
          <div className="flex items-center gap-2 text-[10px] font-medium text-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Platform Operational • 99.98% Proctor Uptime
          </div>

          <div className="mt-3 flex gap-5 text-[9px] text-blue-100">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Institutional SLA</span>
          </div>
        </div>
      </section>

      {/* Auth content */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-[500px]">{children}</div>
      </section>
    </main>
  );
}

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/10 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-white/15">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-400/30 text-sm">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-white">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[9px] text-blue-100/80">
          {description}
        </p>
      </div>

      <span className="text-sm text-blue-100/70 transition-transform group-hover:translate-x-0.5">
        ›
      </span>
    </div>
  );
}
