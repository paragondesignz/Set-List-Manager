"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useSetlist,
  useSetlistItems,
  useSongsList,
  useUpdateSetlist,
  useFinaliseSetlist,
  useRemoveSetlist
} from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Pencil,
  ListMusic,
  FileDown,
  Mail,
  Trash2,
  Check,
  Calendar,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

export default function SetlistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const setlistId = params.setlistId as string;

  const band = useBandBySlug(bandSlug);
  const setlist = useSetlist(setlistId);
  const items = useSetlistItems(setlistId);
  const songs = useSongsList(band ? { bandId: band._id } : { bandId: "" });

  const updateSetlist = useUpdateSetlist();
  const finaliseSetlist = useFinaliseSetlist();
  const removeSetlist = useRemoveSetlist();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [finaliseOpen, setFinaliseOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!band) return null;

  if (setlist === undefined || items === undefined || songs === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (setlist === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Setlist not found</div>
      </div>
    );
  }

  type Song = { _id: string; title: string; artist: string };
  const songsById = new Map<string, Song>(songs.map((s: Song) => [s._id, s]));

  const openEdit = () => {
    setEditName(setlist.name);
    setEditDate(
      setlist.gigDate
        ? new Date(setlist.gigDate).toISOString().split("T")[0]
        : ""
    );
    setEditNotes(setlist.notes ?? "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateSetlist({
        setlistId: setlistId as any,
        patch: {
          name: editName.trim(),
          gigDate: editDate ? new Date(editDate).getTime() : undefined,
          notes: editNotes.trim() || undefined
        }
      });
      setEditOpen(false);
      toast.success("Setlist updated");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalise = async () => {
    try {
      await finaliseSetlist({ setlistId: setlistId as any });
      setFinaliseOpen(false);
      toast.success("Setlist finalised - play counts updated");
    } catch (e: any) {
      toast.error("Failed to finalise", { description: e?.message });
    }
  };

  const handleDelete = async () => {
    try {
      await removeSetlist({ setlistId: setlistId as any });
      toast.success("Setlist deleted");
      router.push(`/${bandSlug}/setlists`);
    } catch (e: any) {
      toast.error("Failed to delete", { description: e?.message });
    }
  };

  // Group items by set
  const itemsBySet = new Map<number, typeof items>();
  for (const item of items) {
    const arr = itemsBySet.get(item.setIndex) ?? [];
    arr.push(item);
    itemsBySet.set(item.setIndex, arr);
  }
  for (const arr of itemsBySet.values()) {
    arr.sort((a, b) => a.position - b.position);
  }

  const statusBadge = () => {
    switch (setlist.status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "finalised":
        return <Badge variant="default">Finalised</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${bandSlug}/setlists`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {setlist.name}
            </h1>
            {statusBadge()}
          </div>
          {setlist.gigDate && (
            <p className="flex items-center gap-1 text-muted-foreground text-sm">
              <Calendar className="h-3 w-3" />
              {new Date(setlist.gigDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button asChild size="sm">
            <Link href={`/${bandSlug}/setlists/${setlistId}/builder`}>
              <ListMusic className="h-4 w-4 mr-2" />
              Builder
            </Link>
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {setlist.status === "draft" && (
          <Button variant="outline" onClick={() => setFinaliseOpen(true)}>
            <Check className="h-4 w-4 mr-2" />
            Mark as Finalised
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/${bandSlug}/setlists/${setlistId}/export`}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Link>
        </Button>
        <Button
          variant="outline"
          className="text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Notes */}
      {setlist.notes && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent className="py-3 pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {setlist.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sets */}
      <div className="grid gap-4">
        {setlist.setsConfig
          .slice()
          .sort((a, b) => a.setIndex - b.setIndex)
          .map((config) => {
            const setItems = itemsBySet.get(config.setIndex) ?? [];
            return (
              <Card key={config.setIndex}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Set {config.setIndex}</span>
                    <span className="font-normal text-muted-foreground">
                      {setItems.length} / {config.songsPerSet} songs
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3 pt-0">
                  {setItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No songs yet</p>
                  ) : (
                    <ol className="space-y-1">
                      {setItems.map((item, idx) => {
                        const song = songsById.get(item.songId);
                        return (
                          <li
                            key={item._id}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="w-6 text-muted-foreground text-right">
                              {idx + 1}.
                            </span>
                            <span className="flex-1">
                              {song?.title ?? "Unknown"}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {song?.artist}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Setlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gig Date</label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalise Dialog */}
      <Dialog open={finaliseOpen} onOpenChange={setFinaliseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalise Setlist</DialogTitle>
            <DialogDescription>
              Marking as finalised will update play counts for all songs in this
              setlist. This indicates the gig has been performed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinaliseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalise}>Finalise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Setlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{setlist.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
