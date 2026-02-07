"use client";

import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
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
  fileName: string;
};

export function PdfDownloadButton({
  setlist,
  items,
  songsById,
  options,
  fileName
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setLoading(true);
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

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setLoading(false);
    }
  }, [setlist, items, songsById, options, fileName]);

  return (
    <Button className="w-full" onClick={handleDownload} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </>
      )}
    </Button>
  );
}
