"use client";

import { useState, useEffect, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { SetlistPDF } from "./setlist-pdf";

type Song = {
  _id: string;
  title: string;
  artist: string;
  vocalIntensity: number;
  energyLevel: number;
};

type SetConfig = {
  setIndex: number;
  songsPerSet: number;
};

type Setlist = {
  name: string;
  gigDate?: number;
  notes?: string;
  setsConfig: SetConfig[];
};

type Item = {
  _id: string;
  songId: string;
  setIndex: number;
  position: number;
};

type PdfOptions = {
  showArtist: boolean;
  showIntensity: boolean;
  showEnergy: boolean;
};

type Props = {
  setlist: Setlist;
  items: Item[];
  songsById: Map<string, Song>;
  options: PdfOptions;
};

export function PdfPreview({ setlist, items, songsById, options }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const generatePreview = useCallback(async () => {
    setLoading(true);

    // Clean up previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }

    try {
      const doc = (
        <SetlistPDF
          setlist={setlist}
          items={items}
          songsById={songsById}
          options={options}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error("Failed to generate PDF preview:", error);
    } finally {
      setLoading(false);
    }
  }, [setlist, items, songsById, options]);

  useEffect(() => {
    generatePreview();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [options.showArtist, options.showIntensity, options.showEnergy]);

  // Initial generation
  useEffect(() => {
    generatePreview();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Preview</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={generatePreview}
            disabled={loading}
            title="Refresh preview"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setFullscreenOpen(true)}
            disabled={!blobUrl}
            title="View fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 overflow-hidden aspect-[1/1.414] relative w-full">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : blobUrl ? (
          <iframe
            src={blobUrl}
            className="absolute inset-0 w-full h-full border-0"
            title="PDF Preview"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Failed to load preview
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{setlist.name} - Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden">
            {blobUrl && (
              <iframe
                src={blobUrl}
                className="w-full h-full"
                title="PDF Preview Fullscreen"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
