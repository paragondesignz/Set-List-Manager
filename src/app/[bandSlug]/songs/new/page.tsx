"use client";

import { useParams, useRouter } from "next/navigation";
import { useBandBySlug, useCreateSong } from "@/lib/convex";
import { SongForm } from "@/components/songs/song-form";
import { toast } from "sonner";

export default function NewSongPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);
  const createSong = useCreateSong();

  if (!band) return null;

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
      await createSong({
        bandId: band._id as any,
        title: data.title,
        artist: data.artist,
        vocalIntensity: data.vocalIntensity,
        energyLevel: data.energyLevel,
        key: data.key,
        notes: data.notes,
        chartFileId: data.chartFileId as any,
        youtubeUrl: data.youtubeUrl
      });
      toast.success("Song created");
      router.push(`/${bandSlug}/songs`);
    } catch (e: any) {
      toast.error("Failed to create song", { description: e?.message });
      throw e;
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Add New Song
        </h1>
        <p className="text-muted-foreground text-sm">
          Add a song to your library
        </p>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card">
        <SongForm onSubmit={handleSubmit} cancelHref={`/${bandSlug}/songs`} />
      </div>
    </div>
  );
}
