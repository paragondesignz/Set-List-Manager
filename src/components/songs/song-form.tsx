"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChartUpload } from "./chart-upload";
import { useStorageUrl } from "@/lib/convex";
import { ExternalLink } from "lucide-react";
import {
  VOCAL_INTENSITY_LABELS,
  ENERGY_LEVEL_LABELS,
} from "@/lib/song-labels";

type SongFormData = {
  title: string;
  artist: string;
  vocalIntensity: number;
  energyLevel: number;
  notes?: string;
  chartFileId?: string;
  youtubeUrl?: string;
};

type SongFormProps = {
  initialData?: Partial<SongFormData>;
  onSubmit: (data: SongFormData) => Promise<void>;
  cancelHref: string;
};

function Label2({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Handle youtu.be short URLs
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortUrlMatch) return shortUrlMatch[1];

  // Handle youtube.com URLs
  const longUrlMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longUrlMatch) return longUrlMatch[1];

  // Handle youtube.com/embed URLs
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

function YouTubeEmbed({ url }: { url: string }) {
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div className="flex items-center justify-center p-4 rounded-xl border border-border/60 bg-card shadow-sm text-sm text-muted-foreground">
        Invalid YouTube URL
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}

function PDFViewer({ fileId }: { fileId: string }) {
  const fileUrl = useStorageUrl(fileId);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center p-8 rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="animate-pulse text-muted-foreground text-sm">Loading chart...</div>
      </div>
    );
  }

  // Check if it's likely a PDF (we can also check the URL or content-type)
  const isPDF = fileUrl.includes('.pdf') || !fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i);

  if (!isPDF) {
    // It's an image - show it directly
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-border overflow-hidden bg-white">
          <img
            src={fileUrl}
            alt="Song chart"
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open Full Size
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // It's a PDF - embed it
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border overflow-hidden bg-white" style={{ height: '500px' }}>
        <iframe
          src={`${fileUrl}#view=FitH`}
          title="Chart PDF"
          className="w-full h-full"
        />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open in New Tab
          </a>
        </Button>
      </div>
    </div>
  );
}

export function SongForm({ initialData, onSubmit, cancelHref }: SongFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [artist, setArtist] = useState(initialData?.artist ?? "");
  const [vocalIntensity, setVocalIntensity] = useState(
    initialData?.vocalIntensity ?? 3
  );
  const [energyLevel, setEnergyLevel] = useState(
    initialData?.energyLevel ?? 3
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [chartFileId, setChartFileId] = useState<string | undefined>(
    initialData?.chartFileId
  );
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtubeUrl ?? "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        artist: artist.trim(),
        vocalIntensity,
        energyLevel,
        notes: notes.trim() || undefined,
        chartFileId,
        youtubeUrl: youtubeUrl.trim() || undefined
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label2 htmlFor="title">Title</Label2>
          <Input
            id="title"
            placeholder="Song title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label2 htmlFor="artist">Artist</Label2>
          <Input
            id="artist"
            placeholder="Original artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label2>Vocal Intensity</Label2>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setVocalIntensity(n)}
                className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  vocalIntensity === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                {VOCAL_INTENSITY_LABELS[n]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label2>Energy Level</Label2>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEnergyLevel(n)}
                className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  energyLevel === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                {ENERGY_LEVEL_LABELS[n]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label2 htmlFor="youtube">YouTube URL</Label2>
        <Input
          id="youtube"
          placeholder="https://youtube.com/watch?v=..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />
        {youtubeUrl && getYouTubeVideoId(youtubeUrl) && (
          <div className="mt-3">
            <YouTubeEmbed url={youtubeUrl} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label2>Chart (PDF or Image)</Label2>
        <ChartUpload
          currentFileId={chartFileId}
          onUpload={setChartFileId}
          onRemove={() => setChartFileId(undefined)}
        />
        {chartFileId && (
          <div className="mt-3">
            <PDFViewer fileId={chartFileId} />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label2 htmlFor="notes">Notes</Label2>
        <Textarea
          id="notes"
          placeholder="Any notes about this song..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading || !title.trim() || !artist.trim()}>
          {loading ? "Saving..." : "Save Song"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
