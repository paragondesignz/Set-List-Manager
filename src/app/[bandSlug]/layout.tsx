"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { useBandBySlug, useBandsList } from "@/lib/convex";
import { useSubscription } from "@/hooks/useSubscription";
import { Header } from "@/components/layout/header";
import { X } from "lucide-react";

export default function BandLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);
  const bands = useBandsList();
  const { isLoading, isExpired, isTrial, daysLeft } = useSubscription();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Redirect to subscribe if subscription expired
  useEffect(() => {
    if (!isLoading && isExpired) {
      router.push("/subscribe");
    }
  }, [isLoading, isExpired, router]);

  // Loading state
  if (band === undefined || bands === undefined || isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return null; // Will redirect
  }

  // Band not found
  if (band === null) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Header band={band} bands={bands} />
      {isTrial && !bannerDismissed && (
        <div
          className={`border-b text-xs px-4 py-1.5 flex items-center justify-center gap-2 ${
            daysLeft <= 3
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-primary/5 border-primary/10 text-muted-foreground"
          }`}
        >
          <span>
            You have {daysLeft} day{daysLeft !== 1 ? "s" : ""} left on your free trial.{" "}
            <Link href="/subscribe" className="font-medium underline underline-offset-2 hover:text-foreground">
              Subscribe
            </Link>
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="ml-1 p-0.5 rounded hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
