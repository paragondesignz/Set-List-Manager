"use client";

import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { SetlistPDF } from "./setlist-pdf";
import { toast } from "sonner";

type Song = {
  _id: string;
  title: string;
  artist: string;
  vocalIntensity: number;
  energyLevel: number;
  chartFileId?: string;
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

type ChartUrlMap = Record<string, string | null>;

type Props = {
  setlist: Setlist;
  items: Item[];
  songsById: Map<string, Song>;
  chartUrls: ChartUrlMap | undefined;
  options: PdfOptions;
  fileName: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\s\-_]/gi, "").replace(/\s+/g, "-");
}

export function BandPackDownloadButton({
  setlist,
  items,
  songsById,
  chartUrls,
  options,
  fileName
}: Props) {
  const [loading, setLoading] = useState(false);

  // Count songs with charts
  const songsWithCharts = items.filter((item) => {
    const song = songsById.get(item.songId);
    return song?.chartFileId && chartUrls?.[song.chartFileId];
  });

  const handleDownload = useCallback(async () => {
    setLoading(true);
    const zip = new JSZip();

    try {
      // Generate setlist PDF
      const doc = (
        <SetlistPDF
          setlist={setlist}
          items={items}
          songsById={songsById}
          options={options}
        />
      );
      const pdfBlob = await pdf(doc).toBlob();
      zip.file(`${sanitizeFilename(setlist.name)}-setlist.pdf`, pdfBlob);

      // Create charts folder
      const chartsFolder = zip.folder("charts");

      // Fetch and add chart files
      if (chartUrls && chartsFolder) {
        const fetchPromises: Promise<void>[] = [];

        for (const item of items) {
          const song = songsById.get(item.songId);
          if (!song?.chartFileId) continue;

          const chartUrl = chartUrls[song.chartFileId];
          if (!chartUrl) continue;

          const promise = (async () => {
            try {
              const response = await fetch(chartUrl);
              if (!response.ok) {
                console.error(`Failed to fetch chart for ${song.title}`);
                return;
              }

              const contentType = response.headers.get("content-type") || "";
              let extension = "pdf";
              if (contentType.includes("image/png")) extension = "png";
              else if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) extension = "jpg";
              else if (contentType.includes("image/gif")) extension = "gif";

              const blob = await response.blob();
              const filename = `${sanitizeFilename(song.title)}-${sanitizeFilename(song.artist)}.${extension}`;
              chartsFolder.file(filename, blob);
            } catch (e) {
              console.error(`Failed to fetch chart for ${song.title}:`, e);
            }
          })();

          fetchPromises.push(promise);
        }

        await Promise.all(fetchPromises);
      }

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Band pack downloaded");
    } catch (error) {
      console.error("Failed to generate band pack:", error);
      toast.error("Failed to generate band pack");
    } finally {
      setLoading(false);
    }
  }, [setlist, items, songsById, chartUrls, options, fileName]);

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={handleDownload} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download Band Pack
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        {songsWithCharts.length > 0
          ? `Includes setlist PDF + ${songsWithCharts.length} chart${songsWithCharts.length !== 1 ? "s" : ""}`
          : "Includes setlist PDF (no charts available)"
        }
      </p>
    </div>
  );
}
