import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32 space-y-8">
        <div className="inline-flex items-center rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
          <span className="mr-2">✨</span> Now in public beta
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-3xl leading-tight">
          The most perfect{" "}
          <span className="text-primary">todo app</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
          Beautifully designed task management for individuals and teams. Fast, focused, and powerful — the way productivity software should be.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start for free
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-border px-6 py-3 text-base font-medium hover:bg-muted transition-colors"
          >
            View pricing
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Free forever. No credit card required.</p>
      </section>

      {/* Features */}
      <section className="border-t border-border py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Everything you need, nothing you don&apos;t</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📋",
                title: "5 powerful views",
                description: "List, Board, Calendar, Timeline, and Table — switch instantly.",
              },
              {
                icon: "⚡",
                title: "Natural language input",
                description: "\"Buy milk tomorrow at 3pm\" creates a task with date and time automatically.",
              },
              {
                icon: "🤝",
                title: "Real-time collaboration",
                description: "Teammates see changes the moment they happen. No refresh needed.",
              },
              {
                icon: "🔁",
                title: "Recurring tasks",
                description: "Daily standups, weekly reviews — set once, never forget.",
              },
              {
                icon: "🔍",
                title: "Powerful search",
                description: "Find anything across all tasks, comments, and projects instantly.",
              },
              {
                icon: "⌨️",
                title: "Keyboard-first",
                description: "Every action has a shortcut. Power users feel right at home.",
              },
            ].map((feature) => (
              <div key={feature.title} className="space-y-3">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">Ready to get things done?</h2>
          <p className="text-muted-foreground text-lg">Join thousands of teams using ToDouss to stay organized and move fast.</p>
          <Link
            href="/sign-up"
            className="inline-flex rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start free today
          </Link>
        </div>
      </section>
    </>
  );
}
