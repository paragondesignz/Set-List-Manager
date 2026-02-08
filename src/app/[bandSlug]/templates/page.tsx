"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useBandBySlug,
  useTemplatesList,
  useCreateTemplate,
  useUpdateTemplate,
  useRemoveTemplate,
  useCreateSetlistFromTemplate
} from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileStack,
  Play,
  Minus,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

// Preset templates based on common gig formats
const PRESET_TEMPLATES = [
  {
    id: "flare-bar",
    name: "Flare Bar (Clo's Format)",
    description: "3 sets: Jazz opener → Soul groove → Party finale",
    setsConfig: [
      { setIndex: 1, songsPerSet: 12, pinnedSlots: [] },
      { setIndex: 2, songsPerSet: 10, pinnedSlots: [] },
      { setIndex: 3, songsPerSet: 10, pinnedSlots: [] }
    ]
  },
  {
    id: "standard-2set",
    name: "Standard 2-Set",
    description: "Classic two-set format for shorter gigs",
    setsConfig: [
      { setIndex: 1, songsPerSet: 12, pinnedSlots: [] },
      { setIndex: 2, songsPerSet: 12, pinnedSlots: [] }
    ]
  },
  {
    id: "corporate-3set",
    name: "Corporate / Wedding",
    description: "Background → Dinner → Dance floor",
    setsConfig: [
      { setIndex: 1, songsPerSet: 10, pinnedSlots: [] },
      { setIndex: 2, songsPerSet: 10, pinnedSlots: [] },
      { setIndex: 3, songsPerSet: 12, pinnedSlots: [] }
    ]
  },
  {
    id: "long-gig",
    name: "Long Gig (4 Sets)",
    description: "Extended format for all-night events",
    setsConfig: [
      { setIndex: 1, songsPerSet: 10, pinnedSlots: [] },
      { setIndex: 2, songsPerSet: 10, pinnedSlots: [] },
      { setIndex: 3, songsPerSet: 10, pinnedSlots: [] },
      { setIndex: 4, songsPerSet: 10, pinnedSlots: [] }
    ]
  },
  {
    id: "short-gig",
    name: "Short Set",
    description: "Single set for opening acts or short bookings",
    setsConfig: [
      { setIndex: 1, songsPerSet: 10, pinnedSlots: [] }
    ]
  }
];

type SetConfig = {
  setIndex: number;
  songsPerSet: number;
  pinnedSlots: Array<{ position: number; songId?: string }>;
};

type Template = {
  _id: string;
  name: string;
  setsConfig: SetConfig[];
};

export default function TemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null);
  const [useTemplate, setUseTemplate] = useState<Template | null>(null);

  const templates = useTemplatesList(band ? { bandId: band._id } : null);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const removeTemplate = useRemoveTemplate();
  const createFromTemplate = useCreateSetlistFromTemplate();

  if (!band) return null;

  const handleCreate = async (name: string, setsConfig: SetConfig[]) => {
    try {
      await createTemplate({
        bandId: band._id as any,
        name,
        setsConfig
      });
      setCreateOpen(false);
      toast.success("Template created");
    } catch (e: any) {
      toast.error("Failed to create template", { description: e?.message });
    }
  };

  const handleUpdate = async (templateId: string, name: string, setsConfig: SetConfig[]) => {
    try {
      await updateTemplate({
        templateId: templateId as any,
        patch: { name, setsConfig }
      });
      setEditTemplate(null);
      toast.success("Template updated");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await removeTemplate({ templateId: templateId as any });
      setDeleteConfirm(null);
      toast.success("Template deleted");
    } catch (e: any) {
      toast.error("Failed to delete", { description: e?.message });
    }
  };

  const handleUseTemplate = async (templateId: string, name: string, gigDate?: string) => {
    try {
      const setlistId = await createFromTemplate({
        bandId: band._id as any,
        templateId: templateId as any,
        name,
        gigDate: gigDate ? new Date(gigDate).getTime() : undefined
      });
      setUseTemplate(null);
      toast.success("Setlist created from template");
      router.push(`/${bandSlug}/setlists/${setlistId}/builder`);
    } catch (e: any) {
      toast.error("Failed to create setlist", { description: e?.message });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Templates
          </h1>
          <p className="text-muted-foreground text-sm">
            Reusable setlist structures
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Preset Templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-sm">Quick Start Presets</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_TEMPLATES.map((preset) => {
            const exists = templates?.some(t => t.name === preset.name);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => !exists && handleCreate(preset.name, preset.setsConfig)}
                disabled={exists}
                className={`text-left p-4 rounded-lg border transition-all ${
                  exists
                    ? "bg-muted/50 opacity-60 cursor-not-allowed"
                    : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                }`}
              >
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {preset.description}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {preset.setsConfig.length} set{preset.setsConfig.length !== 1 ? "s" : ""} ({preset.setsConfig.map(s => s.songsPerSet).join(", ")} songs)
                </div>
                {exists && (
                  <div className="text-xs text-primary mt-2">Already added</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates List */}
      {templates === undefined ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No custom templates yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click a preset above or create your own
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="font-medium text-sm">Your Templates</h2>
          <div className="grid gap-4">
            {templates.map((template) => (
            <Card key={template._id}>
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {template.setsConfig.length} set
                    {template.setsConfig.length !== 1 ? "s" : ""} (
                    {template.setsConfig.map((s) => s.songsPerSet).join(", ")}{" "}
                    songs)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUseTemplate(template)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Use
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditTemplate(template)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(template)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <TemplateFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Template"
        description="Define a reusable setlist structure"
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      <TemplateFormDialog
        open={!!editTemplate}
        onOpenChange={(open) => !open && setEditTemplate(null)}
        title="Edit Template"
        description="Update template configuration"
        initialData={editTemplate ?? undefined}
        onSubmit={(name, setsConfig) =>
          editTemplate && handleUpdate(editTemplate._id, name, setsConfig)
        }
      />

      {/* Use Template Dialog */}
      <UseTemplateDialog
        open={!!useTemplate}
        onOpenChange={(open) => !open && setUseTemplate(null)}
        template={useTemplate}
        onSubmit={(name, gigDate) =>
          useTemplate && handleUseTemplate(useTemplate._id, name, gigDate)
        }
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;?
              This action cannot be undone.
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

function TemplateFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialData,
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialData?: { name: string; setsConfig: SetConfig[] };
  onSubmit: (name: string, setsConfig: SetConfig[]) => void;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [setsConfig, setSetsConfig] = useState<SetConfig[]>(
    initialData?.setsConfig ?? [
      { setIndex: 1, songsPerSet: 12, pinnedSlots: [] },
      { setIndex: 2, songsPerSet: 12, pinnedSlots: [] }
    ]
  );
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(initialData?.name ?? "");
      setSetsConfig(
        initialData?.setsConfig ?? [
          { setIndex: 1, songsPerSet: 12, pinnedSlots: [] },
          { setIndex: 2, songsPerSet: 12, pinnedSlots: [] }
        ]
      );
    }
    onOpenChange(newOpen);
  };

  const addSet = () => {
    const nextIndex = setsConfig.length + 1;
    setSetsConfig([
      ...setsConfig,
      { setIndex: nextIndex, songsPerSet: 12, pinnedSlots: [] }
    ]);
  };

  const removeSet = (index: number) => {
    if (setsConfig.length <= 1) return;
    setSetsConfig(
      setsConfig
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, setIndex: i + 1 }))
    );
  };

  const updateSongs = (index: number, songsPerSet: number) => {
    const next = [...setsConfig];
    next[index] = { ...next[index], songsPerSet };
    setSetsConfig(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim(), setsConfig);
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Standard 2-set gig"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sets</label>
                <Button type="button" variant="outline" size="sm" onClick={addSet}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Set
                </Button>
              </div>
              {setsConfig.map((config, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <span className="text-sm font-medium">Set {config.setIndex}</span>
                  <div className="flex-1" />
                  <span className="text-sm text-muted-foreground">Songs:</span>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={config.songsPerSet}
                    onChange={(e) =>
                      updateSongs(index, parseInt(e.target.value) || 12)
                    }
                    className="w-20"
                  />
                  {setsConfig.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeSet(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
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

function UseTemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onSubmit: (name: string, gigDate?: string) => void;
}) {
  const [name, setName] = useState("");
  const [gigDate, setGigDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName("");
      setGigDate("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim(), gigDate || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create from Template</DialogTitle>
            <DialogDescription>
              Using template: {template?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Setlist Name</label>
              <Input
                placeholder="Friday at The Venue"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gig Date (optional)</label>
              <Input
                type="date"
                value={gigDate}
                onChange={(e) => setGigDate(e.target.value)}
              />
            </div>
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
              {loading ? "Creating..." : "Create Setlist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
