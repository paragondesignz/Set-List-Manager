"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useSongsList,
  useSetlistsList,
  useUpcomingGigsWithRsvp,
  useMemberDashboard,
  useMemberRespondToGig,
} from "@/lib/convex";
import { useMemberAuth } from "@/hooks/useMemberAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Music,
  ListMusic,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Clock,
  MapPin,
  Check,
  X,
  Users,
} from "lucide-react";
import { useState } from "react";

// ============================================================================
// Admin Dashboard
// ============================================================================

function AdminDashboard({ bandSlug }: { bandSlug: string }) {
  const band = useBandBySlug(bandSlug);
  const songs = useSongsList(band ? { bandId: band._id } : null);
  const setlists = useSetlistsList(band ? { bandId: band._id } : null);
  const upcomingGigs = useUpcomingGigsWithRsvp(band ? { bandId: band._id } : null);

  if (!band) return null;

  const recentSetlists = setlists?.slice(0, 5) ?? [];
  const draftCount = setlists?.filter((s: { status: string }) => s.status === "draft").length ?? 0;
  const totalSongs = songs?.length ?? 0;
  const nextGig = upcomingGigs?.[0] ?? null;

  // Build needs-attention items
  const attentionItems: { key: string; message: string; href: string; type: "warning" | "info" }[] = [];

  if (upcomingGigs) {
    for (const gig of upcomingGigs) {
      if (gig.status === "confirmed" && !gig.hasSetlist) {
        attentionItems.push({
          key: `no-setlist-${gig._id}`,
          message: `"${gig.name}" has no setlist assigned`,
          href: `/${bandSlug}/gigs/${gig._id}`,
          type: "warning",
        });
      }
      if (gig.rsvp.pending > 0) {
        attentionItems.push({
          key: `pending-rsvp-${gig._id}`,
          message: `${gig.rsvp.pending} member${gig.rsvp.pending !== 1 ? "s" : ""} haven't responded to "${gig.name}"`,
          href: `/${bandSlug}/gigs/${gig._id}`,
          type: "info",
        });
      }
    }
  }

  if (setlists) {
    const drafts = setlists.filter((s: { status: string }) => s.status === "draft");
    for (const draft of drafts.slice(0, 3)) {
      attentionItems.push({
        key: `draft-${draft._id}`,
        message: `"${draft.name}" is still a draft`,
        href: `/${bandSlug}/setlists/${draft._id}`,
        type: "info",
      });
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {band.name}
        </h1>
        <p className="text-muted-foreground">Dashboard overview</p>
      </div>

      {/* Next Gig Spotlight */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Next Gig</CardTitle>
        </CardHeader>
        <CardContent>
          {nextGig ? (
            <Link href={`/${bandSlug}/gigs/${nextGig._id}`} className="block group">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {nextGig.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(nextGig.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatCountdown(nextGig.date)}
                    </span>
                    {nextGig.venueName && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {nextGig.venueName}
                      </span>
                    )}
                    {nextGig.startTime && (
                      <span>Starts {nextGig.startTime}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    {nextGig.rsvp.total > 0 && (
                      <span className="flex items-center gap-1.5 text-sm">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-medium">{nextGig.rsvp.confirmed}/{nextGig.rsvp.total}</span>
                        <span className="text-muted-foreground">confirmed</span>
                      </span>
                    )}
                    <Badge variant={nextGig.status === "confirmed" ? "default" : "secondary"}>
                      {nextGig.status}
                    </Badge>
                    {!nextGig.hasSetlist && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        No setlist
                      </Badge>
                    )}
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors hidden sm:block" />
              </div>
            </Link>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">No upcoming gigs</p>
              <Button asChild size="sm">
                <Link href={`/${bandSlug}/gigs/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Gig
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Needs Attention */}
      {attentionItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Needs Attention
          </h2>
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <AlertTriangle className={`h-4 w-4 shrink-0 ${item.type === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                <span className="text-sm flex-1">{item.message}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Link href={`/${bandSlug}/songs`}>
          <Card className="hover-lift cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Songs
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Music className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSongs}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${bandSlug}/setlists`}>
          <Card className="hover-lift cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Setlists
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListMusic className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{setlists?.length ?? 0}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${bandSlug}/setlists?status=draft`}>
          <Card className="hover-lift cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Drafts
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListMusic className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftCount}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${bandSlug}/gigs`}>
          <Card className="hover-lift cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Gigs
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingGigs?.length ?? 0}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover-lift group cursor-pointer">
          <Link href={`/${bandSlug}/setlists/new`}>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center transition-all duration-200 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25">
                <Plus className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Create Setlist</h3>
                <p className="text-sm text-muted-foreground">
                  Start a new setlist for your next gig
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover-lift group cursor-pointer">
          <Link href={`/${bandSlug}/songs/new`}>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center transition-all duration-200 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25">
                <Music className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Add Song</h3>
                <p className="text-sm text-muted-foreground">
                  Add a new song to your library
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover-lift group cursor-pointer">
          <Link href={`/${bandSlug}/gigs/new`}>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center transition-all duration-200 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25">
                <Calendar className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Create Gig</h3>
                <p className="text-sm text-muted-foreground">
                  Add an upcoming gig
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Upcoming Gigs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Gigs</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${bandSlug}/gigs`}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!upcomingGigs || upcomingGigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No upcoming gigs</p>
              <Button asChild>
                <Link href={`/${bandSlug}/gigs/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first gig
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingGigs.map((gig) => (
                <Link
                  key={gig._id}
                  href={`/${bandSlug}/gigs/${gig._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium">{gig.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(gig.date)}
                      {gig.venueName && ` — ${gig.venueName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {gig.rsvp.total > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {gig.rsvp.confirmed}/{gig.rsvp.total}
                      </span>
                    )}
                    {!gig.hasSetlist && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                        No setlist
                      </Badge>
                    )}
                    <Badge
                      variant={
                        gig.status === "enquiry"
                          ? "secondary"
                          : gig.status === "confirmed"
                            ? "default"
                            : "outline"
                      }
                    >
                      {gig.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Setlists */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Setlists</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${bandSlug}/setlists`}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentSetlists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No setlists yet</p>
              <Button asChild>
                <Link href={`/${bandSlug}/setlists/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first setlist
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSetlists.map((setlist: { _id: string; name: string; status: string; gigDate?: number }) => (
                <Link
                  key={setlist._id}
                  href={`/${bandSlug}/setlists/${setlist._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium">{setlist.name}</h4>
                    {setlist.gigDate && (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(setlist.gigDate)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      setlist.status === "draft"
                        ? "secondary"
                        : setlist.status === "finalised"
                          ? "default"
                          : "outline"
                    }
                  >
                    {setlist.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Member Dashboard
// ============================================================================

function MemberDashboard({
  bandSlug,
  memberName,
  bandName,
  token,
}: {
  bandSlug: string;
  memberName: string;
  bandName: string;
  token: string;
}) {
  const dashboard = useMemberDashboard(token);
  const respondToGig = useMemberRespondToGig();
  const [respondingGigId, setRespondingGigId] = useState<string | null>(null);

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  async function handleRespond(gigId: string, status: "confirmed" | "declined") {
    setRespondingGigId(gigId);
    try {
      await respondToGig({ token, gigId: gigId as any, status });
    } finally {
      setRespondingGigId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">
          Welcome, {memberName}
        </h1>
        <p className="text-muted-foreground">{bandName}</p>
      </div>

      {/* Needs Your Response */}
      {dashboard.needsResponse.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Needs Your Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.needsResponse.map((gig) => (
                <div
                  key={gig._id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-amber-200 bg-white"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{gig.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(gig.date)}
                      {gig.venueName && ` — ${gig.venueName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleRespond(gig._id, "confirmed")}
                      disabled={respondingGigId === gig._id}
                      className="gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespond(gig._id, "declined")}
                      disabled={respondingGigId === gig._id}
                      className="gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Gigs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Gigs</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${bandSlug}/gigs`}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {dashboard.upcomingGigs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No upcoming gigs
            </p>
          ) : (
            <div className="space-y-3">
              {dashboard.upcomingGigs.map((gig) => (
                <Link
                  key={gig._id}
                  href={`/${bandSlug}/gigs/${gig._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium">{gig.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(gig.date)}
                      {gig.venueName && ` — ${gig.venueName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {gig.myStatus && (
                      <Badge
                        variant={
                          gig.myStatus === "confirmed"
                            ? "default"
                            : gig.myStatus === "declined"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {gig.myStatus}
                      </Badge>
                    )}
                    <Badge
                      variant={gig.status === "confirmed" ? "default" : "secondary"}
                    >
                      {gig.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Setlists */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Setlists</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${bandSlug}/setlists`}>
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {dashboard.recentSetlists.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No setlists yet
            </p>
          ) : (
            <div className="space-y-3">
              {dashboard.recentSetlists.map((setlist) => (
                <Link
                  key={setlist._id}
                  href={`/${bandSlug}/setlists/${setlist._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium">{setlist.name}</h4>
                    {setlist.gigDate && (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(setlist.gigDate)}
                      </p>
                    )}
                  </div>
                  <Badge variant="default">finalised</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover-lift group cursor-pointer">
          <Link href={`/${bandSlug}/songs`}>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Song Library</h3>
                <p className="text-sm text-muted-foreground">
                  {dashboard.songCount} songs
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover-lift group cursor-pointer">
          <Link href={`/${bandSlug}/setlists`}>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListMusic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">All Setlists</h3>
                <p className="text-sm text-muted-foreground">
                  View setlists
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover-lift group cursor-pointer">
          <Link href={`/${bandSlug}/gigs`}>
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">All Gigs</h3>
                <p className="text-sm text-muted-foreground">
                  View gigs
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCountdown(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  if (diff < 0) return "Today";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days away`;
}

// ============================================================================
// Page
// ============================================================================

export default function BandDashboardPage() {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const { isMember, session, token } = useMemberAuth();

  if (isMember && session && token) {
    return (
      <MemberDashboard
        bandSlug={bandSlug}
        memberName={session.member.name}
        bandName={session.band.name}
        token={token}
      />
    );
  }

  return <AdminDashboard bandSlug={bandSlug} />;
}
