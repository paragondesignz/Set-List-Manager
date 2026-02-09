"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useBandBySlug, useBandsList } from "@/lib/convex";
import { useSubscription } from "@/hooks/useSubscription";
import { useMemberAuth } from "@/hooks/useMemberAuth";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { X, Music, ListMusic, Calendar, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Member Header (simplified, read-only)
// ============================================================================

function MemberHeader({
  bandName,
  bandSlug,
  memberName,
  memberRole,
  onLogout,
}: {
  bandName: string;
  bandSlug: string;
  memberName: string;
  memberRole: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  const links = [
    { href: `/${bandSlug}/songs`, label: "Songs", icon: Music },
    { href: `/${bandSlug}/setlists`, label: "Setlists", icon: ListMusic },
    { href: `/${bandSlug}/gigs`, label: "Gigs", icon: Calendar },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.webp" alt="Set List Creator" width={120} height={32} />
          <span className="text-border text-lg select-none">/</span>
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
            {bandName}
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-[-0.6875rem] left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center ml-auto gap-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium leading-tight">{memberName}</div>
            <div className="text-xs text-muted-foreground leading-tight">{memberRole}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5 h-8">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Band Layout
// ============================================================================

export default function BandLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;

  // Member auth (always called)
  const { isMember, isLoading: memberLoading, session: memberSession, logout: memberLogout } = useMemberAuth();

  // Admin data (skip queries when in member mode to avoid auth failures)
  const band = useBandBySlug(isMember ? null : bandSlug);
  const bands = useBandsList();
  const { isLoading: subLoading, isExpired, isTrial, daysLeft } = useSubscription();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Redirect to subscribe if admin subscription expired
  useEffect(() => {
    if (!isMember && !subLoading && isExpired) {
      router.push("/subscribe");
    }
  }, [isMember, subLoading, isExpired, router]);

  // Redirect member to their own band if they navigate elsewhere
  useEffect(() => {
    if (isMember && memberSession && memberSession.band.slug !== bandSlug) {
      router.replace(`/${memberSession.band.slug}/songs`);
    }
  }, [isMember, memberSession, bandSlug, router]);

  // ── Loading states ──
  if (memberLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // ── Member mode ──
  if (isMember && memberSession) {
    if (memberSession.band.slug !== bandSlug) {
      return null; // Will redirect via useEffect
    }

    return (
      <div className="min-h-screen">
        <MemberHeader
          bandName={memberSession.band.name}
          bandSlug={memberSession.band.slug}
          memberName={memberSession.member.name}
          memberRole={memberSession.member.role}
          onLogout={memberLogout}
        />
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </div>
    );
  }

  // ── Admin mode ──

  // Loading state
  if (band === undefined || bands === undefined || subLoading) {
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
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
