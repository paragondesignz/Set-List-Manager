"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBandBySlug, useSong, useMemberSong, useUpdateSong, useRemoveSong, useStorageUrl } from "@/lib/convex";
import { useMemberAuth } from "@/hooks/useMemberAuth";
import { SongForm } from "@/components/songs/song-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Trash2, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  VOCAL_INTENSITY_LABELS,
  VOCAL_INTENSITY_COLORS,
  ENERGY_LEVEL_LABELS,
  ENERGY_LEVEL_COLORS,
} from "@/lib/song-labels";

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortUrlMatch) return shortUrlMatch[1];
  const longUrlMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longUrlMatch) return longUrlMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

function ChartViewer({ fileId }: { fileId: string }) {
  const fileUrl = useStorageUrl(fileId);
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center p-8 rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="animate-pulse text-muted-foreground text-sm">Loading chart...</div>
      </div>
    );
  }
  const isPDF = fileUrl.includes('.pdf') || !fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  if (!isPDF) {
    return (
      <div className="space-y-2">
        <div className="w-full rounded-lg border border-border overflow-hidden bg-white">
          <img src={fileUrl} alt="Song chart" className="w-full h-auto" />
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="xs" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </a>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="w-full rounded-lg border border-border overflow-hidden bg-white" style={{ aspectRatio: '1 / 1.414' }}>
        <iframe src={`${fileUrl}#view=FitH`} title="Chart PDF" className="w-full h-full" />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="xs" asChild>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}

function MemberSongView({ songId, bandSlug }: { songId: string; bandSlug: string }) {
  const { token } = useMemberAuth();
  const song = useMemberSong(token, songId);

  if (song === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (song === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Song not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/${bandSlug}/songs`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Songs
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{song.title}</h1>
        <p className="text-muted-foreground text-sm">{song.artist}</p>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card space-y-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Vocal Intensity</span>
            <Badge variant="outline" className={VOCAL_INTENSITY_COLORS[song.vocalIntensity]}>
              {VOCAL_INTENSITY_LABELS[song.vocalIntensity]}
            </Badge>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Energy Level</span>
            <Badge variant="outline" className={ENERGY_LEVEL_COLORS[song.energyLevel]}>
              {ENERGY_LEVEL_LABELS[song.energyLevel]}
            </Badge>
          </div>
          {song.key && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Key</span>
              <Badge variant="outline">{song.key}</Badge>
            </div>
          )}
        </div>

        {song.notes && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Notes</span>
            <p className="text-sm whitespace-pre-wrap">{song.notes}</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {song.youtubeUrl && getYouTubeVideoId(song.youtubeUrl) && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">YouTube</span>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-border bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(song.youtubeUrl)}`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}
          {song.chartFileId && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Chart</span>
              <ChartViewer fileId={song.chartFileId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditSongPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const songId = params.songId as string;
  const { isMember } = useMemberAuth();

  const band = useBandBySlug(isMember ? null : bandSlug);
  const song = useSong(isMember ? null : songId);
  const updateSong = useUpdateSong();
  const removeSong = useRemoveSong();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isMember) {
    return <MemberSongView songId={songId} bandSlug={bandSlug} />;
  }

  if (!band) return null;

  if (song === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (song === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Song not found</div>
      </div>
    );
  }

  const handleSubmit = async (data: {
    title: string;
    artist: string;
    vocalIntensity: number;
    energyLevel: number;
    key?: string;
    notes?: string;
    chartFileId?: string;
    youtubeUrl?: string;
  }) => {
    try {
      await updateSong({
        songId: songId as any,
        patch: {
          title: data.title,
          artist: data.artist,
          vocalIntensity: data.vocalIntensity,
          energyLevel: data.energyLevel,
          key: data.key,
          notes: data.notes,
          chartFileId: data.chartFileId as any,
          youtubeUrl: data.youtubeUrl
        }
      });
      toast.success("Song updated");
    } catch (e: any) {
      toast.error("Failed to update song", { description: e?.message });
      throw e;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeSong({ songId: songId as any });
      toast.success("Song deleted");
      router.push(`/${bandSlug}/songs`);
    } catch (e: any) {
      toast.error("Failed to delete song", { description: e?.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Edit Song
          </h1>
          <p className="text-muted-foreground text-sm">
            Update song details
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </Button>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card">
        <SongForm
          initialData={{
            title: song.title,
            artist: song.artist,
            vocalIntensity: song.vocalIntensity,
            energyLevel: song.energyLevel,
            key: song.key,
            notes: song.notes,
            chartFileId: song.chartFileId,
            youtubeUrl: song.youtubeUrl
          }}
          onSubmit={handleSubmit}
          cancelHref={`/${bandSlug}/songs`}
        />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Song</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{song.title}&quot;? This
              will also remove it from any setlists. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
