"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const features = [
  "Unlimited bands & song libraries",
  "Drag-and-drop setlist builder",
  "Smart auto-generation with pacing",
  "PDF export & email to band",
  "Multi-set gig management",
  "Setlist templates & pinned slots",
  "Band member access sharing",
  "Chart & lead sheet uploads",
];

export default function SubscribePage() {
  const router = useRouter();
  const { user, isActive, isTrial } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user?.stripeCustomerId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeCustomerId: user.stripeCustomerId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setLoading(false);
    }
  };

  // If active, show management option
  if (isActive && !isTrial) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="flex justify-center mb-4">
            <Image src="/set-list-creator-logo-trans.png" alt="Set List Creator" width={64} height={64} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            You&apos;re subscribed!
          </h1>
          <p className="text-muted-foreground mb-6">
            Manage your billing, update payment method, or cancel.
          </p>
          <div className="space-y-3">
            <Button onClick={handleManageSubscription} disabled={loading} className="w-full h-12">
              {loading ? "Loading..." : "Manage Subscription"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full h-12">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/set-list-creator-logo-trans.png" alt="Set List Creator" width={64} height={64} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isTrial ? "Your trial has ended" : "Subscribe to continue"}
          </h1>
          <p className="text-muted-foreground">
            Unlock the full power of Set List Creator
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Set List Creator Pro</h2>
              <p className="text-sm text-muted-foreground">Everything you need on stage night</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold">$7.95</span>
              <span className="text-muted-foreground text-sm"> NZD/mo</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={handleSubscribe}
            disabled={loading || !user}
            className="w-full h-12 font-medium brand-gradient text-white hover:opacity-90"
          >
            {loading ? "Loading..." : "Subscribe Now"}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            14-day free trial included. Cancel anytime.
          </p>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="text-sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
