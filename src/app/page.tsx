"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBandsList } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const bands = useBandsList();

  // Auto-redirect to first band if only one
  useEffect(() => {
    if (bands && bands.length === 1) {
      router.push(`/${bands[0].slug}`);
    }
  }, [bands, router]);

  if (bands === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If multiple bands, show band selector
  if (bands.length > 1) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 font-[var(--font-playfair)]">
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
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-[var(--font-playfair)]">
          Welcome to Set List Manager
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
  );
}
