"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  defaultAnimateLayoutChanges,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import {
  useAddSetlistSong,
  useMoveSetlistItem,
  useRemoveSetlistItem,
  useSwapSetlistSong,
  useClearSet,
  useClearAllSets,
  useUpdateSetlist,
  useRemoveSetFromSetlist,
  useTemplatesList
} from "@/lib/convex";
import {
  generateSetlist,
  checkSetlistPacing,
  FLOW_PRESETS,
  type Song as GenSong,
  type FlowPreset
} from "@/lib/generation-algorithm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  X,
  Wand2,
  AlertTriangle,
  GripVertical,
  Pin,
  Search,
  ArrowUpDown,
  Plus,
  Trash2,
  FileStack
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

type Song = {
  _id: string;
  title: string;
  artist: string;
  vocalIntensity: number;
  energyLevel: number;
  key?: string; // Musical key for Camelot mixing
  tags: string[];
  playCount: number;
  lastPlayedAt?: number;
};

type SetConfig = {
  setIndex: number;
  songsPerSet: number;
};

type Item = {
  _id: string;
  setlistId: string;
  songId: string;
  setIndex: number;
  position: number;
  isPinned: boolean;
  gigNotes?: string;
};

type SetlistBuilderProps = {
  setlistId: string;
  bandId: string;
  setsConfig: SetConfig[];
  songs: Song[];
  items: Item[];
};


function DraggableAvailableSong({
  song,
  onClick
}: {
  song: Song;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `song:${song._id}`,
      data: { type: "song", songId: song._id }
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform)
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-left hover:bg-muted transition-colors",
        isDragging && "opacity-0"
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{song.title}</div>
        <div className="truncate text-xs text-muted-foreground">{song.artist}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", VOCAL_INTENSITY_COLORS[song.vocalIntensity])}>
          {VOCAL_INTENSITY_SHORT[song.vocalIntensity]}
        </Badge>
        <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", ENERGY_LEVEL_COLORS[song.energyLevel])}>
          {ENERGY_LEVEL_SHORT[song.energyLevel]}
        </Badge>
      </div>
    </button>
  );
}

function SortableSongItem({
  item,
  song,
  position,
  onRemove,
  onSwap,
  hasWarning
}: {
  item: Item;
  song: Song | undefined;
  position: number;
  onRemove: () => void;
  onSwap: () => void;
  hasWarning: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: item._id,
      data: { type: "item", itemId: item._id, setIndex: item.setIndex, position },
      animateLayoutChanges: (args) =>
        defaultAnimateLayoutChanges({ ...args, wasDragging: true })
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded-md border bg-card px-1.5 py-1 overflow-hidden",
        isDragging && "opacity-0",
        hasWarning && "ring-1 ring-orange-400",
        item.isPinned && "border-ring"
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 cursor-grab p-0.5 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <span className="shrink-0 w-5 text-xs text-muted-foreground text-right font-mono">
        {position + 1}.
      </span>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">
          {song?.title ?? "Unknown"}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {item.isPinned && <Pin className="h-3 w-3 text-ring" />}
        {hasWarning && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        <Badge variant="outline" className={cn("h-5 px-1 text-[10px]", VOCAL_INTENSITY_COLORS[song?.vocalIntensity ?? 1])}>
          {VOCAL_INTENSITY_SHORT[song?.vocalIntensity ?? 1]}
        </Badge>
        <Badge variant="outline" className={cn("h-5 px-1 text-[10px]", ENERGY_LEVEL_COLORS[song?.energyLevel ?? 1])}>
          {ENERGY_LEVEL_SHORT[song?.energyLevel ?? 1]}
        </Badge>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-ring"
        onClick={onSwap}
      >
        <ArrowLeftRight className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function SetColumn({
  config,
  items,
  songs,
  warnings,
  isCollapsed,
  onToggleCollapse,
  onRemoveItem,
  onSwapItem,
  onClearSet,
  onUpdateSongsPerSet,
  onRemoveSet,
  canRemove
}: {
  config: SetConfig;
  items: Item[];
  songs: Map<string, Song>;
  warnings: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRemoveItem: (itemId: string) => void;
  onSwapItem: (itemId: string) => void;
  onClearSet: () => void;
  onUpdateSongsPerSet: (n: number) => void;
  onRemoveSet: () => void;
  canRemove: boolean;
}) {
  const [localSongsPerSet, setLocalSongsPerSet] = React.useState(String(config.songsPerSet));

  // Sync local state when config changes externally
  React.useEffect(() => {
    setLocalSongsPerSet(String(config.songsPerSet));
  }, [config.songsPerSet]);

  const commitSongsPerSet = () => {
    const n = parseInt(localSongsPerSet, 10);
    if (!isNaN(n) && n >= 1 && n <= 50 && n !== config.songsPerSet) {
      onUpdateSongsPerSet(n);
    } else {
      setLocalSongsPerSet(String(config.songsPerSet));
    }
  };

  const droppable = useDroppable({
    id: `set:${config.setIndex}`,
    data: { type: "set", setIndex: config.setIndex }
  });

  const isFull = items.length >= config.songsPerSet;
  const isOver = items.length > config.songsPerSet;

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        "rounded-lg border p-3 transition-colors bg-card overflow-hidden",
        droppable.isOver && "bg-muted/50 ring-1 ring-ring/30",
        isFull && !isOver && "ring-1 ring-emerald-400/50",
        isOver && "ring-1 ring-orange-400/50"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm font-semibold hover:text-ring"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Set {config.setIndex}
        </button>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-mono",
              isFull && !isOver && "text-emerald-600",
              isOver && "text-orange-600",
              !isFull && "text-muted-foreground"
            )}
          >
            {items.length} /
          </span>
          <Input
            type="number"
            min={1}
            max={50}
            value={localSongsPerSet}
            onChange={(e) => setLocalSongsPerSet(e.target.value)}
            onBlur={commitSongsPerSet}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-12 h-6 text-xs text-center font-mono px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {items.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onClearSet}
            >
              Clear
            </Button>
          )}
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={onRemoveSet}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <SortableContext
          items={items.map((i) => i._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5 min-h-[80px]">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <SortableSongItem
                  key={item._id}
                  item={item}
                  song={songs.get(item.songId)}
                  position={idx}
                  hasWarning={warnings.has(item._id)}
                  onRemove={() => onRemoveItem(item._id)}
                  onSwap={() => onSwapItem(item._id)}
                />
              ))
            ) : (
              <div
                className={cn(
                  "flex items-center justify-center h-20 rounded-md border border-dashed text-sm text-muted-foreground",
                  droppable.isOver && "border-ring bg-ring/5"
                )}
              >
                Drop songs here
              </div>
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

function SwapSongDialog({
  open,
  onOpenChange,
  currentSongId,
  availableSongs,
  songsById,
  onSwap
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSongId: string;
  availableSongs: Song[];
  songsById: Map<string, Song>;
  onSwap: (newSongId: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [swapping, setSwapping] = React.useState(false);
  const [swapVocalFilter, setSwapVocalFilter] = React.useState<number | null>(null);
  const [swapEnergyFilter, setSwapEnergyFilter] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSearch("");
      setSwapVocalFilter(null);
      setSwapEnergyFilter(null);
    }
  }, [open]);

  const currentSong = songsById.get(currentSongId);

  const filtered = React.useMemo(() => {
    let result = availableSongs;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q)
      );
    }
    if (swapVocalFilter !== null) {
      result = result.filter((s) => s.vocalIntensity === swapVocalFilter);
    }
    if (swapEnergyFilter !== null) {
      result = result.filter((s) => s.energyLevel === swapEnergyFilter);
    }
    return result;
  }, [availableSongs, search, swapVocalFilter, swapEnergyFilter]);

  const handleSwap = async () => {
    if (!selectedId) return;
    setSwapping(true);
    try {
      await onSwap(selectedId);
      onOpenChange(false);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Swap Song</DialogTitle>
          <DialogDescription>
            Swapping: <span className="font-medium text-foreground">{currentSong?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={swapVocalFilter?.toString() ?? "all"}
            onValueChange={(v) => setSwapVocalFilter(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue placeholder="Vocal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vocal</SelectItem>
              {[1, 2, 3, 4, 5].map((v) => (
                <SelectItem key={v} value={v.toString()}>{VOCAL_INTENSITY_LABELS[v]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={swapEnergyFilter?.toString() ?? "all"}
            onValueChange={(v) => setSwapEnergyFilter(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue placeholder="Energy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Energy</SelectItem>
              {[1, 2, 3, 4, 5].map((v) => (
                <SelectItem key={v} value={v.toString()}>{ENERGY_LEVEL_LABELS[v]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(swapVocalFilter !== null || swapEnergyFilter !== null) && (
            <Button
              variant="ghost"
              size="xs"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => { setSwapVocalFilter(null); setSwapEnergyFilter(null); }}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="max-h-[280px] overflow-auto rounded-md border">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No available songs
            </div>
          ) : (
            <div className="p-1.5 space-y-1">
              {filtered.map((song) => (
                <button
                  key={song._id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
                    selectedId === song._id
                      ? "bg-ring/10 ring-1 ring-ring"
                      : "hover:bg-muted"
                  )}
                  onClick={() => setSelectedId(song._id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{song.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {song.artist}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", VOCAL_INTENSITY_COLORS[song.vocalIntensity])}>
                      {VOCAL_INTENSITY_SHORT[song.vocalIntensity]}
                    </Badge>
                    <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", ENERGY_LEVEL_COLORS[song.energyLevel])}>
                      {ENERGY_LEVEL_SHORT[song.energyLevel]}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSwap} disabled={!selectedId || swapping}>
            {swapping ? "Swapping..." : "Swap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TemplateConfig = {
  setIndex: number;
  songsPerSet: number;
  pinnedSlots: { position: number; songId?: string }[];
};

function ApplyTemplateDialog({
  open,
  onOpenChange,
  bandId,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bandId: string;
  onApply: (template: { _id: string; name: string; setsConfig: TemplateConfig[] }) => Promise<void>;
}) {
  const templates = useTemplatesList({ bandId });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setConfirmed(false);
    }
  }, [open]);

  const selectedTemplate = templates?.find((t: any) => t._id === selectedId);

  const handleApply = async () => {
    if (!selectedTemplate) return;
    setApplying(true);
    try {
      await onApply(selectedTemplate as any);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply Template</DialogTitle>
          <DialogDescription>
            Apply a template to this setlist. This will clear all current songs and replace the set structure.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[280px] overflow-auto rounded-md border">
          {!templates ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No templates found. Create one from an existing setlist first.
            </div>
          ) : (
            <div className="p-1.5 space-y-1">
              {templates.map((template: any) => {
                const totalSongs = template.setsConfig.reduce(
                  (sum: number, s: any) => sum + s.songsPerSet,
                  0
                );
                const pinnedCount = template.setsConfig.reduce(
                  (sum: number, s: any) => sum + (s.pinnedSlots?.length ?? 0),
                  0
                );
                return (
                  <button
                    key={template._id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                      selectedId === template._id
                        ? "bg-ring/10 ring-1 ring-ring"
                        : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedId(template._id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.setsConfig.length} set{template.setsConfig.length !== 1 ? "s" : ""} · {totalSongs} songs
                        {pinnedCount > 0 && ` · ${pinnedCount} pinned`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedTemplate && (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(c) => setConfirmed(c === true)}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              I understand this will clear all current songs and replace the set structure
            </span>
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplate || !confirmed || applying}
          >
            {applying ? "Applying..." : "Apply Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SortField = "title" | "vocalIntensity" | "energyLevel";
type SortDir = "asc" | "desc";

export function SetlistBuilder({
  setlistId,
  bandId,
  setsConfig,
  songs,
  items
}: SetlistBuilderProps) {
  const [search, setSearch] = React.useState("");
  const [collapsedSets, setCollapsedSets] = React.useState<Set<number>>(new Set());
  const [swapItem, setSwapItem] = React.useState<string | null>(null);
  const [activeDrag, setActiveDrag] = React.useState<
    { type: "song"; songId: string } | { type: "item"; itemId: string } | null
  >(null);

  // Track songs being added to prevent double-clicks
  const [pendingAdds, setPendingAdds] = React.useState<Set<string>>(new Set());

  // Filters and sorting for available songs
  const [vocalFilter, setVocalFilter] = React.useState<number | null>(null);
  const [energyFilter, setEnergyFilter] = React.useState<number | null>(null);
  const [sortField, setSortField] = React.useState<SortField>("title");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [useCamelot, setUseCamelot] = React.useState(false); // Harmonic key ordering
  const [lastFlowPreset, setLastFlowPreset] = React.useState<FlowPreset | null>(null);

  const [showTemplateDialog, setShowTemplateDialog] = React.useState(false);
  const [confirmRemoveSet, setConfirmRemoveSet] = React.useState<number | null>(null);

  const addSong = useAddSetlistSong();
  const moveItem = useMoveSetlistItem();
  const removeItem = useRemoveSetlistItem();
  const swapSong = useSwapSetlistSong();
  const clearSet = useClearSet();
  const clearAll = useClearAllSets();
  const updateSetlist = useUpdateSetlist();
  const removeSetMutation = useRemoveSetFromSetlist();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const songsById = React.useMemo(() => {
    const map = new Map<string, Song>();
    for (const s of songs) map.set(s._id, s);
    return map;
  }, [songs]);

  const usedSongIds = React.useMemo(() => {
    return new Set(items.map((i) => i.songId));
  }, [items]);

  // Clear pending adds once songs appear in items
  React.useEffect(() => {
    if (pendingAdds.size > 0) {
      const stillPending = new Set<string>();
      for (const songId of pendingAdds) {
        if (!usedSongIds.has(songId)) {
          stillPending.add(songId);
        }
      }
      if (stillPending.size !== pendingAdds.size) {
        setPendingAdds(stillPending);
      }
    }
  }, [usedSongIds, pendingAdds]);

  const availableSongs = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = songs
      .filter((s) => !usedSongIds.has(s._id) && !pendingAdds.has(s._id))
      .filter((s) => {
        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q)
        );
      });

    // Apply vocal intensity filter
    if (vocalFilter !== null) {
      result = result.filter((s) => s.vocalIntensity === vocalFilter);
    }

    // Apply energy level filter
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
  }, [songs, usedSongIds, pendingAdds, search, vocalFilter, energyFilter, sortField, sortDir]);

  const hasActiveFilters = vocalFilter !== null || energyFilter !== null;

  const clearFilters = () => {
    setVocalFilter(null);
    setEnergyFilter(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const itemsBySet = React.useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const config of setsConfig) {
      map.set(config.setIndex, []);
    }
    for (const item of items) {
      const arr = map.get(item.setIndex) ?? [];
      arr.push(item);
      map.set(item.setIndex, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [items, setsConfig]);

  // Check for pacing warnings
  const pacingWarnings = React.useMemo(() => {
    const songsList = items.map((i) => {
      const song = songsById.get(i.songId);
      return song
        ? {
            _id: song._id,
            title: song.title,
            artist: song.artist,
            vocalIntensity: song.vocalIntensity,
            energyLevel: song.energyLevel,
            playCount: song.playCount,
            lastPlayedAt: song.lastPlayedAt
          }
        : null;
    }).filter(Boolean) as GenSong[];

    const warnings = checkSetlistPacing(items, songsList);
    const warningItemIds = new Set<string>();

    // Find items that trigger warnings (3rd+ consecutive high-intensity)
    for (const [setIndex, setItems] of itemsBySet) {
      const sorted = setItems.slice().sort((a, b) => a.position - b.position);
      for (let i = 2; i < sorted.length; i++) {
        const window = [sorted[i - 2], sorted[i - 1], sorted[i]];
        const intensities = window.map((item) => {
          const song = songsById.get(item.songId);
          return song?.vocalIntensity ?? 0;
        });
        if (intensities.every((v) => v >= 4)) {
          warningItemIds.add(sorted[i]._id);
        }
      }
    }

    return warningItemIds;
  }, [items, songsById, itemsBySet]);

  const handleAddToSet = async (songId: string, setIndex: number, position: number) => {
    // Prevent duplicate adds
    if (usedSongIds.has(songId) || pendingAdds.has(songId)) {
      return;
    }

    // Mark as pending immediately
    setPendingAdds((prev) => new Set(prev).add(songId));

    try {
      await addSong({
        setlistId: setlistId as any,
        songId: songId as any,
        setIndex,
        position
      });
    } catch (e: any) {
      // Remove from pending on error so user can retry
      setPendingAdds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
      toast.error("Failed to add song", { description: e?.message });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem({ itemId: itemId as any });
    } catch (e: any) {
      toast.error("Failed to remove", { description: e?.message });
    }
  };

  const handleSwapSong = async (newSongId: string) => {
    if (!swapItem) return;
    try {
      await swapSong({
        itemId: swapItem as any,
        newSongId: newSongId as any
      });
      toast.success("Song swapped");
    } catch (e: any) {
      toast.error("Failed to swap", { description: e?.message });
      throw e;
    }
  };

  const handleFixPacing = async () => {
    if (pacingWarnings.size === 0) return;

    // Get available songs with vocal intensity <= 3 (breaks the high-intensity streak)
    const availableReplacements = songs.filter(
      (s) => !usedSongIds.has(s._id) && s.vocalIntensity <= 3
    );

    if (availableReplacements.length === 0) {
      toast.error("No medium/low-intensity songs available", {
        description: "Add more songs with vocal intensity 1-3 to fix pacing."
      });
      return;
    }

    let fixedCount = 0;
    const usedReplacements = new Set<string>();

    // Process each warning item
    for (const itemId of pacingWarnings) {
      const item = items.find((i) => i._id === itemId);
      if (!item) continue;

      const currentSong = songsById.get(item.songId);
      if (!currentSong) continue;

      // Find best replacement: prioritize matching energy level, then prefer vocal intensity 3
      // This maintains the set's energy flow while giving the voice a break
      const candidates = availableReplacements
        .filter((s) => !usedReplacements.has(s._id))
        .map((s) => ({
          song: s,
          // Score: prefer same energy, then prefer vocal intensity 3 (medium, not jarring)
          score:
            (s.energyLevel === currentSong.energyLevel ? 10 : -Math.abs(s.energyLevel - currentSong.energyLevel)) +
            (s.vocalIntensity === 3 ? 5 : 0) // Prefer intensity 3 - it's a subtle break
        }))
        .sort((a, b) => b.score - a.score);

      if (candidates.length === 0) break;

      const replacement = candidates[0].song;
      try {
        await swapSong({
          itemId: itemId as any,
          newSongId: replacement._id as any
        });
        usedReplacements.add(replacement._id);
        fixedCount++;
      } catch {
        // Continue trying other items
      }
    }

    if (fixedCount > 0) {
      toast.success(`Fixed ${fixedCount} pacing issue${fixedCount > 1 ? "s" : ""}`);
    } else {
      toast.error("Could not fix pacing issues");
    }
  };

  const handleClearSet = async (setIndex: number) => {
    try {
      await clearSet({ setlistId: setlistId as any, setIndex });
      toast.success(`Set ${setIndex} cleared`);
    } catch (e: any) {
      toast.error("Failed to clear", { description: e?.message });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll({ setlistId: setlistId as any });
      setLastFlowPreset(null);
      toast.success("All sets cleared");
    } catch (e: any) {
      toast.error("Failed to clear", { description: e?.message });
    }
  };

  const handleUpdateSongsPerSet = async (setIndex: number, value: number) => {
    const newConfig = setsConfig.map((c) =>
      c.setIndex === setIndex ? { ...c, songsPerSet: value } : c
    );
    try {
      await updateSetlist({
        setlistId: setlistId as any,
        patch: { setsConfig: newConfig }
      });
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    }
  };

  const handleAddSet = async () => {
    const maxIndex = Math.max(...setsConfig.map((c) => c.setIndex), 0);
    const newConfig = [
      ...setsConfig,
      { setIndex: maxIndex + 1, songsPerSet: 12 }
    ];
    try {
      await updateSetlist({
        setlistId: setlistId as any,
        patch: { setsConfig: newConfig }
      });
      toast.success(`Set ${maxIndex + 1} added`);
    } catch (e: any) {
      toast.error("Failed to add set", { description: e?.message });
    }
  };

  const handleRemoveSet = async (setIndex: number) => {
    try {
      await removeSetMutation({
        setlistId: setlistId as any,
        setIndex
      });
      setConfirmRemoveSet(null);
      toast.success(`Set ${setIndex} removed`);
    } catch (e: any) {
      toast.error("Failed to remove set", { description: e?.message });
    }
  };

  const handleApplyTemplate = async (template: {
    _id: string;
    name: string;
    setsConfig: TemplateConfig[];
  }) => {
    // 1. Clear all songs
    await clearAll({ setlistId: setlistId as any });

    // 2. Update setsConfig from template (strip pinnedSlots for setlist config)
    const newSetsConfig = template.setsConfig.map((s) => ({
      setIndex: s.setIndex,
      songsPerSet: s.songsPerSet
    }));
    await updateSetlist({
      setlistId: setlistId as any,
      patch: { setsConfig: newSetsConfig }
    });

    // 3. Add pinned songs from template
    let addedCount = 0;
    for (const setConfig of template.setsConfig) {
      for (const slot of setConfig.pinnedSlots ?? []) {
        if (slot.songId) {
          try {
            await addSong({
              setlistId: setlistId as any,
              songId: slot.songId as any,
              setIndex: setConfig.setIndex,
              position: slot.position,
              isPinned: true
            });
            addedCount++;
          } catch {
            // Song may have been deleted — skip
          }
        }
      }
    }

    setLastFlowPreset(null);
    toast.success(`Template "${template.name}" applied`, {
      description: addedCount > 0
        ? `${addedCount} pinned song${addedCount !== 1 ? "s" : ""} added`
        : undefined
    });
  };

  const handleAutoGenerate = async (flowPreset: FlowPreset = "classic") => {
    // Clear first
    await handleClearAll();

    // Generate setlist
    const result = generateSetlist({
      songs: songs.map((s) => ({
        _id: s._id,
        title: s.title,
        artist: s.artist,
        vocalIntensity: s.vocalIntensity,
        energyLevel: s.energyLevel,
        key: s.key, // Include key for Camelot mixing
        tags: s.tags ?? [],
        playCount: s.playCount,
        lastPlayedAt: s.lastPlayedAt
      })),
      setsConfig,
      pinnedSlots: [],
      excludedSongIds: [],
      flowPreset,
      useCamelot
    });

    // Add songs
    for (const item of result.items) {
      try {
        await addSong({
          setlistId: setlistId as any,
          songId: item.songId as any,
          setIndex: item.setIndex,
          position: item.position,
          isPinned: item.isPinned
        });
      } catch {
        // Continue on error
      }
    }

    setLastFlowPreset(flowPreset);
    const presetName = FLOW_PRESETS[flowPreset].name;
    if (result.warnings.length > 0) {
      toast.warning(`Generated with ${presetName}`, {
        description: result.warnings.join(", ")
      });
    } else {
      toast.success(`Generated with ${presetName}`);
    }
  };

  const handleQuickAdd = (songId: string) => {
    // Add to first set with available slots
    for (const config of setsConfig.slice().sort((a, b) => a.setIndex - b.setIndex)) {
      const setItems = itemsBySet.get(config.setIndex) ?? [];
      if (setItems.length < config.songsPerSet) {
        handleAddToSet(songId, config.setIndex, setItems.length);
        return;
      }
    }
    // All full, add to first set anyway
    const firstSet = setsConfig[0];
    if (firstSet) {
      const setItems = itemsBySet.get(firstSet.setIndex) ?? [];
      handleAddToSet(songId, firstSet.setIndex, setItems.length);
    }
  };

  const deriveTarget = (
    over: DragOverEvent["over"] | DragEndEvent["over"]
  ): { setIndex: number; position: number } | null => {
    if (!over) return null;
    const data = over.data.current as any;
    if (!data) return null;

    if (data.type === "item") {
      const setIndex = data.setIndex;
      const arr = itemsBySet.get(setIndex) ?? [];
      const overId = String(over.id);
      const idx = arr.findIndex((x) => x._id === overId);
      return { setIndex, position: idx >= 0 ? idx : arr.length };
    }

    if (data.type === "set") {
      const setIndex = data.setIndex;
      const arr = itemsBySet.get(setIndex) ?? [];
      return { setIndex, position: arr.length };
    }

    return null;
  };

  const onDragEnd = async (ev: DragEndEvent) => {
    setActiveDrag(null);
    const active = ev.active.data.current as any;
    if (!active) return;

    const target = deriveTarget(ev.over);
    if (!target) return;

    if (active.type === "song") {
      await handleAddToSet(active.songId, target.setIndex, target.position);
      return;
    }

    if (active.type === "item") {
      try {
        await moveItem({
          itemId: active.itemId as any,
          toSetIndex: target.setIndex,
          toPosition: target.position
        });
      } catch (e: any) {
        toast.error("Failed to move", { description: e?.message });
      }
    }
  };

  const swapItemData = swapItem ? items.find((i) => i._id === swapItem) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={(ev) => {
        const d = ev.active.data.current as any;
        if (d?.type === "song") {
          setActiveDrag({ type: "song", songId: d.songId });
        } else if (d?.type === "item") {
          setActiveDrag({ type: "item", itemId: d.itemId });
        }
      }}
      onDragCancel={() => setActiveDrag(null)}
      onDragEnd={(ev) => void onDragEnd(ev)}
    >
      {/* Builder toolbar — full width */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Sets</h3>
          {lastFlowPreset && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {FLOW_PRESETS[lastFlowPreset].name}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateDialog(true)}
          >
            <FileStack className="h-3.5 w-3.5 mr-1.5" />
            Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleAddSet()}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Set
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="camelot"
                    checked={useCamelot}
                    onCheckedChange={(checked) => setUseCamelot(checked === true)}
                  />
                  <label htmlFor="camelot" className="cursor-pointer text-xs text-muted-foreground">
                    Camelot
                  </label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                Order songs by harmonic compatibility using the Camelot wheel. Songs need a &quot;key&quot; value set to benefit.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                Auto-generate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Select Flow Style
              </div>
              {(Object.keys(FLOW_PRESETS) as FlowPreset[]).map((preset) => (
                <DropdownMenuItem
                  key={preset}
                  onClick={() => void handleAutoGenerate(preset)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{FLOW_PRESETS[preset].name}</span>
                  <span className="text-xs text-muted-foreground">
                    {FLOW_PRESETS[preset].description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleClearAll()}
          >
            Clear All
          </Button>
        </div>
      </div>

      {pacingWarnings.size > 0 && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-orange-50 border border-orange-200 text-sm text-orange-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
            <span>
              Pacing warning: {pacingWarnings.size} song(s) have 3+ high-intensity songs in a row
            </span>
          </div>
          <Button
            variant="outline"
            size="xs"
            className="shrink-0 bg-white hover:bg-orange-100 border-orange-300 text-orange-700"
            onClick={() => void handleFixPacing()}
          >
            Fix
          </Button>
        </div>
      )}

      {/* Two-column layout: Available Songs + Sets */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Available Songs - Left column */}
        <div>
          <div className="lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5.5rem)] lg:flex lg:flex-col bg-card rounded-xl border border-border/60 shadow-sm p-4">
            <div className="space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Available Songs</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {availableSongs.length}
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search songs..."
                  className="pl-8 h-8"
                />
              </div>

              {/* Filters and Sort */}
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={vocalFilter?.toString() ?? "all"}
                  onValueChange={(v) => setVocalFilter(v === "all" ? null : Number(v))}
                >
                  <SelectTrigger className="h-7 w-[100px] text-xs">
                    <SelectValue placeholder="Vocal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vocal</SelectItem>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <SelectItem key={v} value={v.toString()}>{VOCAL_INTENSITY_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={energyFilter?.toString() ?? "all"}
                  onValueChange={(v) => setEnergyFilter(v === "all" ? null : Number(v))}
                >
                  <SelectTrigger className="h-7 w-[110px] text-xs">
                    <SelectValue placeholder="Energy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Energy</SelectItem>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <SelectItem key={v} value={v.toString()}>{ENERGY_LEVEL_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="xs" className="h-7 gap-1">
                      <ArrowUpDown className="h-3 w-3" />
                      <span className="text-xs">
                        {sortField === "title" ? "Title" : sortField === "vocalIntensity" ? "Vocal" : "Energy"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleSort("title")}>
                      Title {sortField === "title" && (sortDir === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort("vocalIntensity")}>
                      Vocal {sortField === "vocalIntensity" && (sortDir === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort("energyLevel")}>
                      Energy {sortField === "energyLevel" && (sortDir === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 mt-3 lg:overflow-y-auto lg:flex-1 lg:min-h-0 scrollbar-thin">
              {availableSongs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available songs
                </p>
              ) : (
                availableSongs.map((song) => (
                  <DraggableAvailableSong
                    key={song._id}
                    song={song}
                    onClick={() => handleQuickAdd(song._id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sets - Right column */}
        <div className="space-y-3 min-w-0 pr-1 pb-1">
          <div className="grid gap-3">
            {setsConfig
              .slice()
              .sort((a, b) => a.setIndex - b.setIndex)
              .map((config) => (
                <SetColumn
                  key={config.setIndex}
                  config={config}
                  items={itemsBySet.get(config.setIndex) ?? []}
                  songs={songsById}
                  warnings={pacingWarnings}
                  isCollapsed={collapsedSets.has(config.setIndex)}
                  onToggleCollapse={() => {
                    setCollapsedSets((prev) => {
                      const next = new Set(prev);
                      if (next.has(config.setIndex)) {
                        next.delete(config.setIndex);
                      } else {
                        next.add(config.setIndex);
                      }
                      return next;
                    });
                  }}
                  onRemoveItem={handleRemoveItem}
                  onSwapItem={setSwapItem}
                  onClearSet={() => void handleClearSet(config.setIndex)}
                  onUpdateSongsPerSet={(n) => void handleUpdateSongsPerSet(config.setIndex, n)}
                  onRemoveSet={() => {
                    const setItems = itemsBySet.get(config.setIndex) ?? [];
                    if (setItems.length > 0) {
                      setConfirmRemoveSet(config.setIndex);
                    } else {
                      void handleRemoveSet(config.setIndex);
                    }
                  }}
                  canRemove={setsConfig.length > 1}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDrag?.type === "song" ? (
          (() => {
            const song = songsById.get(activeDrag.songId);
            if (!song) return null;
            return (
              <div className="w-[260px] rounded-md border bg-card p-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">
                    {song.title}
                  </div>
                </div>
              </div>
            );
          })()
        ) : activeDrag?.type === "item" ? (
          (() => {
            const item = items.find((i) => i._id === activeDrag.itemId);
            const song = item ? songsById.get(item.songId) : undefined;
            if (!song) return null;
            return (
              <div className="w-[260px] rounded-md border bg-card p-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">
                    {song.title}
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}
      </DragOverlay>

      {/* Swap Dialog */}
      <SwapSongDialog
        open={!!swapItem}
        onOpenChange={(open) => !open && setSwapItem(null)}
        currentSongId={swapItemData?.songId ?? ""}
        availableSongs={availableSongs}
        songsById={songsById}
        onSwap={handleSwapSong}
      />

      {/* Apply Template Dialog */}
      <ApplyTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        bandId={bandId}
        onApply={handleApplyTemplate}
      />

      {/* Confirm Remove Set Dialog */}
      <Dialog
        open={confirmRemoveSet !== null}
        onOpenChange={(open) => !open && setConfirmRemoveSet(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Set {confirmRemoveSet}?</DialogTitle>
            <DialogDescription>
              This set has {confirmRemoveSet !== null
                ? (itemsBySet.get(confirmRemoveSet) ?? []).length
                : 0} song{(confirmRemoveSet !== null ? (itemsBySet.get(confirmRemoveSet) ?? []).length : 0) !== 1 ? "s" : ""} that will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveSet(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemoveSet !== null) {
                  void handleRemoveSet(confirmRemoveSet);
                }
              }}
            >
              Remove Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
