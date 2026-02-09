import Image from "next/image";
import Link from "next/link";
import { Music, ListMusic, Zap, FileText, Users, Layers, Check, LogIn, ArrowRight } from "lucide-react";

const features = [
  {
    icon: ListMusic,
    title: "Drag-and-Drop Builder",
    description:
      "Build setlists visually with an intuitive drag-and-drop interface. Reorder songs, manage multi-set gigs, and see timing update in real time.",
  },
  {
    icon: Zap,
    title: "Smart Auto-Generation",
    description:
      "Generate setlists that respect vocal pacing, energy curves, and freshness. Our algorithm ensures variety and flow for every gig.",
  },
  {
    icon: FileText,
    title: "PDF Export & Email",
    description:
      "Export clean, professional PDFs ready for the stage. Email setlists directly to band members with attached charts.",
  },
  {
    icon: Users,
    title: "Multi-Band Support",
    description:
      "Manage multiple bands from one account. Each band gets its own song library, setlists, members, and templates.",
  },
  {
    icon: Music,
    title: "Song Library with Charts",
    description:
      "Store every song with key, BPM, vocal intensity, energy level, tags, and attached chord charts or lead sheets.",
  },
  {
    icon: Layers,
    title: "Template System",
    description:
      "Save reusable setlist structures with pinned slots. Apply templates to quickly scaffold gigs for recurring venues.",
  },
];

const steps = [
  {
    number: "1",
    title: "Add Your Songs",
    description:
      "Import from CSV or add songs one by one with all the metadata you need — key, BPM, energy, tags, and charts.",
  },
  {
    number: "2",
    title: "Build Your Setlist",
    description:
      "Drag songs into sets, auto-generate with smart pacing, or apply a saved template. Fine-tune order until it feels right.",
  },
  {
    number: "3",
    title: "Share & Perform",
    description:
      "Export a polished PDF, email it to the band, and hit the stage with confidence.",
  },
];

const planFeatures = [
  "Unlimited bands & song libraries",
  "Drag-and-drop setlist builder",
  "Smart auto-generation with pacing",
  "PDF export & email to band",
  "Multi-set gig management",
  "Setlist templates & pinned slots",
  "Band member access sharing",
  "Chart & lead sheet uploads",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Image
            src="/logo.webp"
            alt="Set List Creator"
            width={140}
            height={38}
            priority
          />
          <div className="flex items-center gap-2">
            <Link
              href="/member-login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Band Member Login
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold border border-border hover:bg-accent hover:border-primary/20 transition-all"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 brand-gradient opacity-[0.03]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.webp"
              alt="Set List Creator"
              width={300}
              height={86}
            />
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed tracking-[-0.01em]">
            The professional setlist builder for cover bands. Organise your song library, generate smart setlists, and share polished PDFs — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center h-12 px-8 rounded-xl font-semibold text-white brand-gradient hover:opacity-90 transition-all shadow-md shadow-primary/20"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl font-semibold border border-border text-foreground hover:bg-accent hover:border-primary/20 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Everything you need on stage night
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From song library to printed setlist — built for working musicians.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 hover-lift cursor-default"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 transition-colors group-hover:bg-primary/15">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-muted/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Three steps to a perfect gig
            </h2>
          </div>
          <div className="space-y-10">
            {steps.map((s) => (
              <div key={s.number} className="flex gap-6 items-start">
                <div className="flex-shrink-0 h-11 w-11 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-primary/20">
                  {s.number}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 tracking-tight">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Simple pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              One plan. Everything included. 14-day free trial.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-primary/20 bg-card p-8 shadow-sm">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Set List Creator Pro</h3>
                <p className="text-sm text-muted-foreground">For working musicians</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-extrabold tracking-tight">$7.95</span>
                <span className="text-muted-foreground text-sm"> NZD/mo</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {planFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="group flex items-center justify-center h-12 rounded-xl font-semibold text-white brand-gradient hover:opacity-90 transition-all w-full shadow-md shadow-primary/20"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-xs text-muted-foreground text-center mt-3">
              No credit card required. 14-day free trial.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-muted/40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to build better setlists?
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Sign up and create your first band in under a minute.
          </p>
          <Link
            href="/login"
            className="group inline-flex items-center justify-center h-12 px-10 rounded-xl font-semibold text-white brand-gradient hover:opacity-90 transition-all shadow-md shadow-primary/20"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Image
              src="/logo.webp"
              alt="Set List Creator"
              width={100}
              height={28}
            />
          </div>
          <p>&copy; {new Date().getFullYear()} Set List Creator</p>
        </div>
      </footer>
    </div>
  );
}
