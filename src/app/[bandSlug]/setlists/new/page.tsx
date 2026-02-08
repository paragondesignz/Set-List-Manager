"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBandBySlug, useCreateSetlist, useCreateSetlistFromTemplate, useTemplatesList } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus } from "lucide-react";
import { toast } from "sonner";

type SetConfig = {
  setIndex: number;
  songsPerSet: number;
};

export default function NewSetlistPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);
  const templates = useTemplatesList(band ? { bandId: band._id } : { bandId: "" });
  const createSetlist = useCreateSetlist();
  const createFromTemplate = useCreateSetlistFromTemplate();

  const [name, setName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [gigDate, setGigDate] = useState("");
  const [notes, setNotes] = useState("");
  const [setsConfig, setSetsConfig] = useState<SetConfig[]>([
    { setIndex: 1, songsPerSet: 12 },
    { setIndex: 2, songsPerSet: 12 }
  ]);
  const [loading, setLoading] = useState(false);

  if (!band) return null;

  const defaultConfig: SetConfig[] = [
    { setIndex: 1, songsPerSet: 12 },
    { setIndex: 2, songsPerSet: 12 }
  ];

  const handleTemplateChange = (value: string) => {
    if (value === "none") {
      setSelectedTemplateId("");
      setSetsConfig(defaultConfig);
      return;
    }
    setSelectedTemplateId(value);
    const tmpl = templates?.find((t: any) => t._id === value);
    if (tmpl) {
      setSetsConfig(
        tmpl.setsConfig.map((s: any) => ({
          setIndex: s.setIndex,
          songsPerSet: s.songsPerSet
        }))
      );
    }
  };

  const addSet = () => {
    const nextIndex = setsConfig.length + 1;
    setSetsConfig([...setsConfig, { setIndex: nextIndex, songsPerSet: 12 }]);
  };

  const removeSet = (index: number) => {
    if (setsConfig.length <= 1) return;
    const next = setsConfig
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, setIndex: i + 1 }));
    setSetsConfig(next);
  };

  const updateSetSongs = (index: number, songsPerSet: number) => {
    const next = [...setsConfig];
    next[index] = { ...next[index], songsPerSet };
    setSetsConfig(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const setlistId = selectedTemplateId
        ? await createFromTemplate({
            bandId: band._id as any,
            templateId: selectedTemplateId as any,
            name: name.trim(),
            gigDate: gigDate ? new Date(gigDate).getTime() : undefined
          })
        : await createSetlist({
            bandId: band._id as any,
            name: name.trim(),
            gigDate: gigDate ? new Date(gigDate).getTime() : undefined,
            setsConfig,
            notes: notes.trim() || undefined
          });
      toast.success("Setlist created");
      router.push(`/${bandSlug}/setlists/${setlistId}/builder`);
    } catch (e: any) {
      toast.error("Failed to create setlist", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Create Setlist
        </h1>
        <p className="text-muted-foreground text-sm">
          Start a new setlist for your gig
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <Input
            placeholder="e.g., Friday Night at The Venue"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Gig Date (optional)</label>
          <Input
            type="date"
            value={gigDate}
            onChange={(e) => setGigDate(e.target.value)}
          />
        </div>

        {templates && templates.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Template (optional)</label>
            <Select value={selectedTemplateId || "none"} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Start from scratch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Start from scratch</SelectItem>
                {templates.map((tmpl: any) => {
                  const setCount = tmpl.setsConfig.length;
                  const songCounts = tmpl.setsConfig
                    .map((s: any) => s.songsPerSet)
                    .join("/");
                  return (
                    <SelectItem key={tmpl._id} value={tmpl._id}>
                      {tmpl.name} — {setCount} {setCount === 1 ? "set" : "sets"}, {songCounts} songs
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Sets Configuration</label>
            {!selectedTemplateId && (
              <Button type="button" variant="outline" size="xs" onClick={addSet}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Set
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {setsConfig.map((config, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-card"
              >
                <span className="text-sm font-medium">Set {config.setIndex}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Songs:</span>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={config.songsPerSet}
                    onChange={(e) =>
                      updateSetSongs(index, parseInt(e.target.value) || 12)
                    }
                    className="w-16 h-8"
                    disabled={!!selectedTemplateId}
                  />
                  {setsConfig.length > 1 && !selectedTemplateId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeSet(index)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {selectedTemplateId && (
            <p className="text-xs text-muted-foreground">
              Sets configuration is defined by the template. Pinned songs will carry over to the builder.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes (optional)</label>
          <Textarea
            placeholder="Any notes about this gig..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Creating..." : "Create & Open Builder"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/${bandSlug}/setlists`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
