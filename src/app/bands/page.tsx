"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useBandsList,
  useCreateBand,
  useUpdateBand,
  useArchiveBand,
  useRemoveBand
} from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

export default function BandsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editBand, setEditBand] = useState<{
    _id: string;
    name: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    _id: string;
    name: string;
  } | null>(null);

  const bands = useBandsList({ includeArchived: showArchived });
  const createBand = useCreateBand();
  const updateBand = useUpdateBand();
  const archiveBand = useArchiveBand();
  const removeBand = useRemoveBand();

  const handleCreate = async (name: string) => {
    try {
      await createBand({ name });
      setCreateOpen(false);
      toast.success("Band created");
    } catch (e: any) {
      toast.error("Failed to create band", { description: e?.message });
    }
  };

  const handleUpdate = async (bandId: string, name: string) => {
    try {
      await updateBand({ bandId: bandId as any, name });
      setEditBand(null);
      toast.success("Band updated");
    } catch (e: any) {
      toast.error("Failed to update band", { description: e?.message });
    }
  };

  const handleArchive = async (bandId: string, archived: boolean) => {
    try {
      await archiveBand({ bandId: bandId as any, archived });
      toast.success(archived ? "Band archived" : "Band restored");
    } catch (e: any) {
      toast.error("Failed to update band", { description: e?.message });
    }
  };

  const handleDelete = async (bandId: string) => {
    try {
      await removeBand({ bandId: bandId as any });
      setDeleteConfirm(null);
      toast.success("Band deleted");
    } catch (e: any) {
      toast.error("Failed to delete band", { description: e?.message });
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight font-[var(--font-playfair)]">
              Manage Bands
            </h1>
            <p className="text-muted-foreground text-sm">
              Create and manage your bands
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Band
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          <span className="text-sm text-muted-foreground">Show archived</span>
        </div>

        {bands === undefined ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading...
          </div>
        ) : bands.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No bands yet</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first band
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {bands.map((band) => (
              <Card
                key={band._id}
                className={band.archivedAt ? "opacity-60" : ""}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <CardTitle className="flex-1">
                    <Link
                      href={`/${band.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {band.name}
                    </Link>
                    {band.archivedAt && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (archived)
                      </span>
                    )}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          setEditBand({ _id: band._id, name: band.name })
                        }
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleArchive(band._id, !band.archivedAt)
                        }
                      >
                        {band.archivedAt ? (
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setDeleteConfirm({ _id: band._id, name: band.name })
                        }
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <BandFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Band"
        description="Enter a name for your new band"
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      <BandFormDialog
        open={!!editBand}
        onOpenChange={(open) => !open && setEditBand(null)}
        title="Edit Band"
        description="Update the band name"
        initialValue={editBand?.name ?? ""}
        onSubmit={(name) => editBand && handleUpdate(editBand._id, name)}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Band</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;?
              This will permanently delete all songs, setlists, and data
              associated with this band. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm._id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BandFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue = "",
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialValue?: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  // Reset on open
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(initialValue);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Band name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
