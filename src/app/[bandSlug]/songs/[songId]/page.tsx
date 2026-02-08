"use client";

import { useParams, useRouter } from "next/navigation";
import { useBandBySlug, useSong, useUpdateSong, useRemoveSong } from "@/lib/convex";
import { SongForm } from "@/components/songs/song-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function EditSongPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const songId = params.songId as string;
  const band = useBandBySlug(bandSlug);
  const song = useSong(songId);
  const updateSong = useUpdateSong();
  const removeSong = useRemoveSong();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
