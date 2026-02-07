"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

type ParsedSong = {
  title: string;
  artist: string;
  vocalIntensity: number;
  energyLevel: number;
};

type ImportResult = {
  status: "inserted" | "duplicate" | "skipped";
  title: string;
  artist: string;
  id?: string;
  reason?: string;
};

type CSVImportProps = {
  onImport: (songs: ParsedSong[]) => Promise<ImportResult[]>;
};

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Skip the escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentLine.push(currentField);
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        currentLine.push(currentField);
        if (currentLine.some((f) => f.trim())) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = "";
        if (char === "\r") i++; // Skip \n after \r
      } else if (char !== "\r") {
        currentField += char;
      }
    }
  }

  // Don't forget the last field/line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField);
    if (currentLine.some((f) => f.trim())) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function mapEnergyToLevel(energy: number): number {
  // Energy is 0-1, map to 1-5
  if (energy < 0.2) return 1;
  if (energy < 0.4) return 2;
  if (energy < 0.6) return 3;
  if (energy < 0.8) return 4;
  return 5;
}

function deriveVocalIntensity(genres: string, energy: number): number {
  const genreLower = genres.toLowerCase();

  // Ballads and quiet genres tend to be easier on the voice
  if (genreLower.includes("ballad") || genreLower.includes("smooth")) {
    return Math.min(3, mapEnergyToLevel(energy));
  }

  // High energy genres tend to be more demanding
  if (genreLower.includes("bebop") || genreLower.includes("hard bop")) {
    return Math.max(3, mapEnergyToLevel(energy));
  }

  // Default based on energy
  return mapEnergyToLevel(energy);
}

function parseSongsFromCSV(rows: string[][], headers: string[]): ParsedSong[] {
  const songs: ParsedSong[] = [];

  // Normalize headers for flexible matching
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  // Find column indices - support various common column names
  const titleIdx = normalizedHeaders.findIndex((h) =>
    h.includes("track name") ||
    h === "title" ||
    h === "song" ||
    h === "song name" ||
    h === "name"
  );
  const artistIdx = normalizedHeaders.findIndex((h) =>
    h.includes("artist") ||
    h === "artist name" ||
    h === "performer" ||
    h === "band"
  );
  const energyIdx = normalizedHeaders.findIndex((h) =>
    h === "energy"
  );
  const genresIdx = normalizedHeaders.findIndex((h) =>
    h === "genres" || h === "genre"
  );

  // Title is required, but artist is optional
  if (titleIdx === -1) {
    throw new Error("CSV must have a title column (e.g., 'Title', 'Track Name', 'Song', 'Name')");
  }

  for (const row of rows) {
    const title = row[titleIdx]?.trim();
    // Artist is optional - use empty string if column missing or value empty
    let artist = artistIdx >= 0 ? (row[artistIdx]?.trim() || "") : "";

    // Skip rows with no title
    if (!title) continue;

    // Clean up artist - take first artist if multiple (separated by ;)
    if (artist.includes(";")) {
      artist = artist.split(";")[0].trim();
    }

    // Parse energy
    const energyStr = energyIdx >= 0 ? row[energyIdx] : null;
    const energy = energyStr ? parseFloat(energyStr) : 0.5;
    const energyLevel = mapEnergyToLevel(isNaN(energy) ? 0.5 : energy);

    // Parse genres for vocal intensity
    const genres = genresIdx >= 0 ? row[genresIdx] || "" : "";
    const vocalIntensity = deriveVocalIntensity(genres, energy);

    songs.push({
      title,
      artist,
      vocalIntensity,
      energyLevel
    });
  }

  return songs;
}

export function CSVImport({ onImport }: CSVImportProps) {
  const [open, setOpen] = useState(false);
  const [parsedSongs, setParsedSongs] = useState<ParsedSong[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setParsedSongs([]);
    setImportResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        throw new Error("CSV file appears to be empty");
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const songs = parseSongsFromCSV(dataRows, headers);

      if (songs.length === 0) {
        throw new Error("No valid songs found in CSV");
      }

      setParsedSongs(songs);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const results = await onImport(parsedSongs);
      const inserted = results.filter((r) => r.status === "inserted").length;
      const duplicates = results.filter((r) => r.status === "duplicate").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      setImportResult({ success: inserted, failed: duplicates + skipped });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setParsedSongs([]);
    setError(null);
    setImportResult(null);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        Import CSV
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && !open && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Songs from CSV
            </DialogTitle>
            <DialogDescription>
              {importResult ? (
                <span className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Imported {importResult.success} songs
                  {importResult.failed > 0 && (
                    <span className="text-muted-foreground">
                      ({importResult.failed} skipped as duplicates)
                    </span>
                  )}
                </span>
              ) : (
                `Found ${parsedSongs.length} songs to import. Review and confirm.`
              )}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {!importResult && parsedSongs.length > 0 && (
            <div className="flex-1 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead className="text-center">Vocal</TableHead>
                    <TableHead className="text-center">Energy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedSongs.slice(0, 50).map((song, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{song.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {song.artist || <span className="italic">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{song.vocalIntensity}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{song.energyLevel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedSongs.length > 50 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  ... and {parsedSongs.length - 50} more songs
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {importResult ? (
              <Button onClick={handleClose}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing || parsedSongs.length === 0}>
                  {importing ? "Importing..." : `Import ${parsedSongs.length} Songs`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
