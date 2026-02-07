"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useSongsList,
  useArchiveSong,
  useBulkArchiveSongs,
  useBulkImportSongs
} from "@/lib/convex";
import { CSVImport } from "@/components/songs/csv-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  FileText,
  Youtube,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  VOCAL_INTENSITY_LABELS,
  VOCAL_INTENSITY_SHORT,
  VOCAL_INTENSITY_COLORS,
  ENERGY_LEVEL_LABELS,
  ENERGY_LEVEL_SHORT,
  ENERGY_LEVEL_COLORS,
} from "@/lib/song-labels";

const PAGE_SIZE = 25;

type SortField = "title" | "artist" | "vocalIntensity" | "energyLevel";
type SortDir = "asc" | "desc";

export default function SongsPage() {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);

  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // Filters
  const [vocalFilter, setVocalFilter] = useState<number | null>(null);
  const [energyFilter, setEnergyFilter] = useState<number | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const songs = useSongsList(
    band
      ? { bandId: band._id, includeArchived: showArchived, search }
      : { bandId: "" }
  );
  const archiveSong = useArchiveSong();
  const bulkArchive = useBulkArchiveSongs();
  const bulkImportSongs = useBulkImportSongs();

  // Filter and sort songs
  const filteredAndSortedSongs = useMemo(() => {
    if (!songs) return [];

    let result = [...songs];

    // Apply filters
    if (vocalFilter !== null) {
      result = result.filter((s) => s.vocalIntensity === vocalFilter);
    }
    if (energyFilter !== null) {
      result = result.filter((s) => s.energyLevel === energyFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "artist":
          cmp = a.artist.localeCompare(b.artist);
          break;
        case "vocalIntensity":
          cmp = a.vocalIntensity - b.vocalIntensity;
          break;
        case "energyLevel":
          cmp = a.energyLevel - b.energyLevel;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [songs, vocalFilter, energyFilter, sortField, sortDir]);

  if (!band) return null;

  // Pagination
  const totalSongs = filteredAndSortedSongs.length;
  const totalPages = Math.ceil(totalSongs / PAGE_SIZE);
  const paginatedSongs = filteredAndSortedSongs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = () => {
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleVocalFilterChange = (value: string) => {
    setVocalFilter(value === "all" ? null : parseInt(value));
    handleFilterChange();
  };

  const handleEnergyFilterChange = (value: string) => {
    setEnergyFilter(value === "all" ? null : parseInt(value));
    handleFilterChange();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const clearFilters = () => {
    setVocalFilter(null);
    setEnergyFilter(null);
    setPage(0);
  };

  const hasActiveFilters = vocalFilter !== null || energyFilter !== null;

  const handleArchive = async (songId: string, archived: boolean) => {
    try {
      await archiveSong({ songId: songId as any, archived });
      toast.success(archived ? "Song archived" : "Song restored");
    } catch (e: any) {
      toast.error("Failed to update song", { description: e?.message });
    }
  };

  const handleBulkArchive = async (archived: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkArchive({
        songIds: Array.from(selectedIds) as any[],
        archived
      });
      setSelectedIds(new Set());
      toast.success(
        archived
          ? `${selectedIds.size} songs archived`
          : `${selectedIds.size} songs restored`
      );
    } catch (e: any) {
      toast.error("Failed to update songs", { description: e?.message });
    }
  };

  const toggleSelect = (songId: string) => {
    const next = new Set(selectedIds);
    if (next.has(songId)) {
      next.delete(songId);
    } else {
      next.add(songId);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (!paginatedSongs) return;
    const pageIds = paginatedSongs.map((s) => s._id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      const next = new Set(selectedIds);
      pageIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set([...selectedIds, ...pageIds]));
    }
  };

  const pageIds = paginatedSongs.map((s) => s._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Song Library
          </h1>
          <p className="text-muted-foreground text-sm">
            {totalSongs} song{totalSongs !== 1 ? "s" : ""}
            {hasActiveFilters && songs && ` (${songs.length} total)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CSVImport
            onImport={async (parsedSongs) => {
              return await bulkImportSongs({
                bandId: band._id as any,
                songs: parsedSongs.map((s) => ({
                  title: s.title,
                  artist: s.artist,
                  vocalIntensity: s.vocalIntensity,
                  energyLevel: s.energyLevel
                }))
              });
            }}
          />
          <Button asChild size="sm">
            <Link href={`/${bandSlug}/songs/new`}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Song
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border/60 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search songs..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        <Select value={vocalFilter?.toString() ?? "all"} onValueChange={handleVocalFilterChange}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue placeholder="Vocal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vocal</SelectItem>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {VOCAL_INTENSITY_LABELS[n]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={energyFilter?.toString() ?? "all"} onValueChange={handleEnergyFilterChange}>
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue placeholder="Energy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Energy</SelectItem>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {ENERGY_LEVEL_LABELS[n]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          <span className="text-sm text-muted-foreground">Archived</span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60 shadow-sm animate-slide-up">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkArchive(true)}
          >
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            Archive
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleSort("title")}
                >
                  Song
                  {sortField === "title" && (
                    <ArrowUpDown className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-20">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleSort("vocalIntensity")}
                >
                  Vocal
                  {sortField === "vocalIntensity" && (
                    <ArrowUpDown className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-20">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleSort("energyLevel")}
                >
                  Energy
                  {sortField === "energyLevel" && (
                    <ArrowUpDown className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {songs === undefined ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <span className="text-muted-foreground">Loading...</span>
                </TableCell>
              </TableRow>
            ) : paginatedSongs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <span className="text-muted-foreground">No songs found</span>
                </TableCell>
              </TableRow>
            ) : (
              paginatedSongs.map((song) => (
                <TableRow
                  key={song._id}
                  className={song.archivedAt ? "opacity-50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(song._id)}
                      onCheckedChange={() => toggleSelect(song._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <Link
                        href={`/${bandSlug}/songs/${song._id}`}
                        className="font-medium hover:text-primary transition-colors block truncate"
                      >
                        {song.title}
                      </Link>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="truncate">{song.artist}</span>
                        {song.chartFileId && (
                          <FileText className="h-3 w-3 shrink-0" />
                        )}
                        {song.youtubeUrl && (
                          <Youtube className="h-3 w-3 shrink-0" />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={VOCAL_INTENSITY_COLORS[song.vocalIntensity]}
                    >
                      {VOCAL_INTENSITY_SHORT[song.vocalIntensity]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ENERGY_LEVEL_COLORS[song.energyLevel]}
                    >
                      {ENERGY_LEVEL_SHORT[song.energyLevel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/${bandSlug}/songs/${song._id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleArchive(song._id, !song.archivedAt)
                          }
                        >
                          {song.archivedAt ? (
                            <>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Restore
                            </>
                          ) : (
                            <>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalSongs)} of {totalSongs}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
