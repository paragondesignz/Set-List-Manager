"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useBandBySlug,
  useSetlist,
  useSetlistItems,
  useSongsList,
  useMemberSetlist,
  useMemberSetlistItems,
  useMemberSongsList,
  useMultipleStorageUrls
} from "@/lib/convex";
import { useMemberAuth } from "@/hooks/useMemberAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, FileText, Package, Loader2 } from "lucide-react";

// Dynamic import for PDF button to avoid SSR issues
const PdfDownloadButton = dynamic(
  () =>
    import("@/components/export/pdf-download-button").then(
      (mod) => mod.PdfDownloadButton
    ),
  {
    ssr: false,
    loading: () => (
      <Button className="w-full" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    )
  }
);

const BandPackDownloadButton = dynamic(
  () =>
    import("@/components/export/band-pack-download-button").then(
      (mod) => mod.BandPackDownloadButton
    ),
  {
    ssr: false,
    loading: () => (
      <Button className="w-full" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    )
  }
);

const PdfPreview = dynamic(
  () =>
    import("@/components/export/pdf-preview").then((mod) => mod.PdfPreview),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-muted/20 aspect-[1/1.414] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

type Song = {
  _id: string;
  title: string;
  artist: string;
  vocalIntensity: number;
  energyLevel: number;
  chartFileId?: string;
};

export default function ExportPage() {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const setlistId = params.setlistId as string;
  const { isMember, token: memberToken } = useMemberAuth();

  // Admin queries (skipped in member mode)
  const band = useBandBySlug(isMember ? null : bandSlug);
  const adminSetlist = useSetlist(isMember ? null : setlistId);
  const adminItems = useSetlistItems(isMember ? null : setlistId);
  const adminSongs = useSongsList(!isMember && band ? { bandId: band._id } : null);

  // Member queries (skipped in admin mode)
  const memberSetlist = useMemberSetlist(
    isMember ? memberToken : null,
    isMember ? setlistId : null
  );
  const memberItems = useMemberSetlistItems(
    isMember ? memberToken : null,
    isMember ? setlistId : null
  );
  const memberSongs = useMemberSongsList(
    isMember && memberToken ? { token: memberToken } : null
  );

  // Use the correct data source
  const setlist = isMember ? memberSetlist : adminSetlist;
  const items = isMember ? memberItems : adminItems;
  const songs = isMember ? memberSongs : adminSongs;

  const [showArtist, setShowArtist] = useState(true);
  const [showIntensity, setShowIntensity] = useState(false);
  const [showEnergy, setShowEnergy] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get chart storage IDs from songs in the setlist
  const chartStorageIds = useMemo(() => {
    if (!items || !songs) return [];
    const songIds = new Set(items.map((i: any) => i.songId));
    const ids: string[] = [];
    for (const song of songs) {
      if (songIds.has(song._id) && song.chartFileId) {
        ids.push(song.chartFileId);
      }
    }
    return ids;
  }, [items, songs]);

  const chartUrls = useMultipleStorageUrls(chartStorageIds);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isMember && !band) return null;

  if (setlist === undefined || items === undefined || songs === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (setlist === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Setlist not found</div>
      </div>
    );
  }

  const songsById = new Map<string, Song>(
    songs.map((s: Song) => [s._id, s])
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${bandSlug}/setlists/${setlistId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Export: {setlist.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Download or share your setlist
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Options (admin only) */}
          {!isMember && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">PDF Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Show artist</span>
                  <Switch checked={showArtist} onCheckedChange={setShowArtist} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Show vocal intensity</span>
                  <Switch checked={showIntensity} onCheckedChange={setShowIntensity} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Show energy level</span>
                  <Switch checked={showEnergy} onCheckedChange={setShowEnergy} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Options */}
          <div className="grid gap-4 sm:grid-cols-2">
        <Card className="hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">PDF Export</h3>
                <p className="text-sm text-muted-foreground">
                  Clean printable setlist
                </p>
              </div>
            </div>
            {mounted && (
              <PdfDownloadButton
                setlist={setlist}
                items={items}
                songsById={songsById}
                options={{
                  showArtist,
                  showIntensity,
                  showEnergy
                }}
                fileName={`${setlist.name.replace(/[^a-z0-9]/gi, "-")}.pdf`}
              />
            )}
          </CardContent>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Band Pack</h3>
                <p className="text-sm text-muted-foreground">
                  Setlist + charts ZIP
                </p>
              </div>
            </div>
            {mounted && (
              <BandPackDownloadButton
                setlist={setlist}
                items={items}
                songsById={songsById}
                chartUrls={chartUrls}
                options={{
                  showArtist,
                  showIntensity,
                  showEnergy
                }}
                fileName={`${setlist.name.replace(/[^a-z0-9]/gi, "-")}-band-pack.zip`}
              />
            )}
          </CardContent>
        </Card>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {mounted && (
            <PdfPreview
              setlist={setlist}
              items={items}
              songsById={songsById}
              options={{
                showArtist,
                showIntensity,
                showEnergy
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
