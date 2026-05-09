import Link from "next/link";
import { getPlanLimits, formatStorageLimit } from "@todouss/billing";

const free = getPlanLimits("FREE");
const pro = getPlanLimits("PRO");

export default function PricingPage() {
  return (
    <div className="px-6 py-20 max-w-4xl mx-auto space-y-16">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Start free and upgrade when you need more projects, teammates, or file storage.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-xl border border-border p-8 space-y-4 bg-background">
          <h2 className="text-xl font-semibold">Free</h2>
          <p className="text-3xl font-bold">$0</p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>{free.maxActiveProjects} active projects</li>
            <li>Up to {free.maxMembers} members</li>
            <li>{formatStorageLimit(free.maxStorageBytes)} file storage</li>
            <li>List, board, calendar, timeline, and table views</li>
          </ul>
          <Link
            href="/sign-up"
            className="inline-flex rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Start free
          </Link>
        </div>

        <div className="rounded-xl border border-primary/30 p-8 space-y-4 bg-primary/5">
          <h2 className="text-xl font-semibold">Pro</h2>
          <p className="text-3xl font-bold">$8<span className="text-base font-normal text-muted-foreground">/mo</span></p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>Unlimited projects</li>
            <li>Unlimited members</li>
            <li>{formatStorageLimit(pro.maxStorageBytes)} storage</li>
            <li>Real-time sync and collaboration</li>
          </ul>
          <Link
            href="/sign-up"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get started
          </Link>
          <p className="text-xs text-muted-foreground">Subscribe from workspace settings after you create an account.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-8 space-y-3">
        <h2 className="text-lg font-semibold">Business</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          $16 per seat per month — unlimited projects, members, and storage. Choose the Business price in Stripe when you
          subscribe. Enterprise options available on request.
        </p>
      </div>
    </div>
  );
}
