"use client";

import { useParams, notFound } from "next/navigation";
import { useBandBySlug, useBandsList } from "@/lib/convex";
import { Header } from "@/components/layout/header";

export default function BandLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);
  const bands = useBandsList();

  // Loading state
  if (band === undefined || bands === undefined) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Band not found
  if (band === null) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Header band={band} bands={bands} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
