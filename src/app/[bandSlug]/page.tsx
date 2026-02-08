"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useSongsList,
  useSetlistsList
} from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Music, ListMusic, Calendar, ArrowRight } from "lucide-react";

type Setlist = {
  _id: string;
  name: string;
  status: string;
  gigDate?: number;
};

export default function BandDashboardPage() {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);
  const songs = useSongsList(band ? { bandId: band._id } : { bandId: "" });
  const setlists = useSetlistsList(band ? { bandId: band._id } : { bandId: "" });

  if (!band) return null;

  const recentSetlists = setlists?.slice(0, 5) ?? [];
  const draftCount = setlists?.filter((s: { status: string }) => s.status === "draft").length ?? 0;
  const totalSongs = songs?.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {band.name}
        </h1>
        <p className="text-muted-foreground">Dashboard overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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
                <Calendar className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftCount}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

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
              {recentSetlists.map((setlist: Setlist) => (
                <Link
                  key={setlist._id}
                  href={`/${bandSlug}/setlists/${setlist._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium">{setlist.name}</h4>
                    {setlist.gigDate && (
                      <p className="text-sm text-muted-foreground">
                        {new Date(setlist.gigDate).toLocaleDateString()}
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
