"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useBandsList } from "@/lib/convex";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Plus, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const bands = useBandsList();
  const { isLoading, isExpired } = useSubscription();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    router.push("/login");
  };

  // Redirect to subscribe if subscription expired
  useEffect(() => {
    if (!isLoading && isExpired) {
      router.push("/subscribe");
    }
  }, [isLoading, isExpired, router]);

  // Auto-redirect to first band if only one
  useEffect(() => {
    if (bands && bands.length === 1 && !isExpired) {
      router.push(`/${bands[0].slug}`);
    }
  }, [bands, router, isExpired]);

  if (bands === undefined || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isExpired) {
    return null; // Will redirect
  }

  // If multiple bands, show band selector
  if (bands.length > 1) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 border-b border-border bg-background">
          <div className="container mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center">
              <Image src="/logo.webp" alt="Set List Creator" width={120} height={32} />
            </Link>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="p-8 max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Select a Band
            </h1>
            <p className="text-muted-foreground">
              Choose a band to manage setlists
            </p>
          </div>

          <div className="grid gap-4">
            {bands.map((band) => (
              <Link
                key={band._id}
                href={`/${band.slug}`}
                className="block p-6 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
              >
                <h2 className="text-xl font-semibold">{band.name}</h2>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link href="/bands">
                <Plus className="h-4 w-4 mr-2" />
                Manage Bands
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If no bands, show create prompt
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center">
            <Image src="/set-list-creator-logo-trans.png" alt="Set List Creator" width={28} height={28} />
          </Link>
          <Button variant="ghost" size="icon-sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="flex items-center justify-center p-8" style={{ minHeight: "calc(100vh - 49px)" }}>
        <div className="max-w-md text-center animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome to Set List Creator
          </h1>
          <p className="text-muted-foreground mb-8">
            Create your first band to get started with setlist management
          </p>
          <Button asChild size="lg">
            <Link href="/bands">
              <Plus className="h-4 w-4 mr-2" />
              Create a Band
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
