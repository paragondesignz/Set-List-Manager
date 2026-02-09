"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useBandMembersList,
  useCreateBandMember,
  useArchiveBandMember,
  useSongsList,
  useSetlistsList,
  useSetlistItems,
  useCurrentUser,
  useMultipleStorageUrls
} from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Plus,
  Archive,
  ArchiveRestore,
  Mail,
  Users,
  Send,
  FileText,
  ListMusic,
  Music
} from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { SongListPDF } from "@/components/export/song-list-pdf";
import JSZip from "jszip";

type Member = {
  _id: string;
  name: string;
  email: string;
  role: string;
  archivedAt?: number;
};

type EmailContentType = "setlist" | "song-list" | "charts";

export default function MembersPage() {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);

  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const members = useBandMembersList(
    band ? { bandId: band._id, includeArchived: showArchived } : null
  );
  const createMember = useCreateBandMember();
  const archiveMember = useArchiveBandMember();

  if (!band) return null;

  const activeMembers = members?.filter((m: Member) => !m.archivedAt) ?? [];

  const handleCreate = async (data: { name: string; email: string; role: string }) => {
    try {
      await createMember({
        bandId: band._id as any,
        ...data
      });
      setCreateOpen(false);
      toast.success("Member added");
    } catch (e: any) {
      toast.error("Failed to add member", { description: e?.message });
    }
  };

  const handleArchive = async (memberId: string, archived: boolean) => {
    try {
      await archiveMember({ memberId: memberId as any, archived });
      toast.success(archived ? "Member archived" : "Member restored");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    const next = new Set(selectedMembers);
    if (next.has(memberId)) {
      next.delete(memberId);
    } else {
      next.add(memberId);
    }
    setSelectedMembers(next);
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === activeMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(activeMembers.map((m: Member) => m._id)));
    }
  };

  const openEmailDialog = () => {
    if (selectedMembers.size === 0) {
      setSelectedMembers(new Set(activeMembers.map((m: Member) => m._id)));
    }
    setEmailDialogOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Band Members
          </h1>
          <p className="text-muted-foreground text-sm">
            {activeMembers.length} active member{activeMembers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openEmailDialog}
            disabled={activeMembers.length === 0}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Send Email
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border shadow-sm">
        <Switch checked={showArchived} onCheckedChange={setShowArchived} />
        <span className="text-sm text-muted-foreground">Show archived</span>
      </div>

      {/* Selection Actions */}
      {selectedMembers.size > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm animate-slide-up">
          <span className="text-sm font-medium">
            {selectedMembers.size} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={openEmailDialog}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Email Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMembers(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Members Table */}
      {members === undefined ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No band members yet</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first member
          </Button>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={activeMembers.length > 0 && selectedMembers.size === activeMembers.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member: Member) => (
                <TableRow
                  key={member._id}
                  className={member.archivedAt ? "opacity-50" : ""}
                >
                  <TableCell>
                    {!member.archivedAt && (
                      <Checkbox
                        checked={selectedMembers.has(member._id)}
                        onCheckedChange={() => toggleMemberSelection(member._id)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/${bandSlug}/members/${member._id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {member.name}
                    </Link>
                    {member.archivedAt && (
                      <Badge variant="outline" className="text-xs mt-1 ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.role}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleArchive(member._id, !member.archivedAt)}
                      title={member.archivedAt ? "Restore" : "Archive"}
                    >
                      {member.archivedAt ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <MemberFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      {/* Email Dialog */}
      {band && (
        <EmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          bandId={band._id}
          bandName={band.name}
          bandSlug={bandSlug}
          recipients={activeMembers.filter((m: Member) => selectedMembers.has(m._id))}
        />
      )}
    </div>
  );
}

function MemberFormDialog({
  open,
  onOpenChange,
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; email: string; role: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName("");
      setEmail("");
      setRole("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        role: role.trim()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Add a new band member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input
                placeholder="Lead vocals, guitar, drums..."
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
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
            <Button
              type="submit"
              disabled={!name.trim() || !email.trim() || !role.trim() || loading}
            >
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmailDialog({
  open,
  onOpenChange,
  bandId,
  bandName,
  bandSlug,
  recipients
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bandId: string;
  bandName: string;
  bandSlug: string;
  recipients: Member[];
}) {
  const [contentType, setContentType] = useState<EmailContentType>("setlist");
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>("");
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const user = useCurrentUser();
  const songs = useSongsList({ bandId: bandId as any, includeArchived: false });
  const setlists = useSetlistsList({ bandId: bandId as any, includeArchived: false });
  const setlistItems = useSetlistItems(selectedSetlistId || null);

  // Collect chart storage IDs from both selected songs (charts mode) and setlist songs
  const setlistSongIds = new Set(
    (setlistItems ?? []).map((item: any) => item.songId as string)
  );
  const chartStorageIds = songs
    ?.filter((s: any) =>
      (selectedSongIds.has(s._id) || setlistSongIds.has(s._id)) && s.chartFileId
    )
    .map((s: any) => s.chartFileId as string) ?? [];
  const chartUrls = useMultipleStorageUrls(chartStorageIds);

  const selectedSetlist = setlists?.find((s: any) => s._id === selectedSetlistId);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setContentType("setlist");
      setSelectedSetlistId("");
      setSelectedSongIds(new Set());
      setSubject("");
      setMessage("");
    }
    onOpenChange(newOpen);
  };

  const toggleSongSelection = (songId: string) => {
    const next = new Set(selectedSongIds);
    if (next.has(songId)) {
      next.delete(songId);
    } else {
      next.add(songId);
    }
    setSelectedSongIds(next);
  };

  const selectAllSongs = () => {
    if (songs) {
      setSelectedSongIds(new Set(songs.map((s: any) => s._id)));
    }
  };

  const selectSongsWithCharts = () => {
    if (songs) {
      setSelectedSongIds(new Set(songs.filter((s: any) => s.chartFileId).map((s: any) => s._id)));
    }
  };

  const generateEmailContent = () => {
    let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">`;
    html += `<h2 style="color: #1a1a1a; margin-bottom: 16px;">${bandName}</h2>`;

    if (message) {
      html += `<p style="color: #374151; margin-bottom: 24px; white-space: pre-wrap;">${message}</p>`;
    }

    if (contentType === "setlist" && selectedSetlist && setlistItems) {
      const gigDate = selectedSetlist.gigDate
        ? new Date(selectedSetlist.gigDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })
        : null;

      html += `<div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">`;
      html += `<h3 style="color: #1a1a1a; margin: 0 0 8px;">${selectedSetlist.name}</h3>`;
      if (gigDate) {
        html += `<p style="color: #6b7280; margin: 0 0 16px; font-size: 14px;">${gigDate}</p>`;
      }

      const sets: Record<number, any[]> = {};
      for (const item of setlistItems) {
        if (!sets[item.setIndex]) sets[item.setIndex] = [];
        sets[item.setIndex].push(item);
      }

      for (const [setIndex, items] of Object.entries(sets)) {
        const sortedItems = items.sort((a: any, b: any) => a.position - b.position);
        html += `<div style="margin-bottom: 16px;">`;
        html += `<h4 style="color: #374151; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Set ${Number(setIndex) + 1}</h4>`;
        html += `<ol style="margin: 0; padding-left: 20px; color: #4b5563;">`;
        for (const item of sortedItems) {
          const song = songs?.find((s: any) => s._id === item.songId);
          if (song) {
            html += `<li style="margin-bottom: 4px;">${song.title} <span style="color: #9ca3af;">— ${song.artist}</span></li>`;
          }
        }
        html += `</ol></div>`;
      }
      html += `</div>`;

      if (selectedSetlist.notes) {
        html += `<div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">`;
        html += `<p style="color: #92400e; margin: 0; font-size: 14px;"><strong>Notes:</strong> ${selectedSetlist.notes}</p>`;
        html += `</div>`;
      }

      // Setlist link
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://setlistcreator.co.nz";
      html += `<div style="text-align: center; margin-bottom: 24px;">`;
      html += `<a href="${siteUrl}/${bandSlug}/setlists/${selectedSetlistId}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">View Setlist Online</a>`;
      html += `</div>`;
    }

    if (contentType === "song-list" && songs) {
      html += `<div style="background: #f9fafb; border-radius: 8px; padding: 20px;">`;
      html += `<h3 style="color: #1a1a1a; margin: 0 0 8px;">Master Song List</h3>`;
      html += `<p style="color: #6b7280; margin: 0; font-size: 14px;">${songs.length} songs — see the attached PDF for the full list.</p>`;
      html += `</div>`;
    }

    if (contentType === "charts" && songs) {
      const selectedSongs = songs.filter((s: any) => selectedSongIds.has(s._id));
      const songsWithCharts = selectedSongs.filter((s: any) => s.chartFileId);
      html += `<div style="background: #f9fafb; border-radius: 8px; padding: 20px;">`;
      html += `<h3 style="color: #1a1a1a; margin: 0 0 16px;">Charts Package</h3>`;
      html += `<p style="color: #6b7280; margin: 0 0 16px; font-size: 14px;">${songsWithCharts.length} charts included</p>`;
      html += `<ul style="margin: 0; padding-left: 20px; color: #4b5563;">`;
      for (const song of songsWithCharts) {
        html += `<li style="margin-bottom: 4px;">${song.title} — ${song.artist}</li>`;
      }
      html += `</ul>`;
      html += `<p style="color: #9ca3af; margin: 16px 0 0; font-size: 12px; font-style: italic;">${songsWithCharts.length} chart${songsWithCharts.length !== 1 ? "s" : ""} attached as ZIP.</p>`;
      html += `</div>`;
    }

    // Member login instructions
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://setlistcreator.co.nz";
    html += `<div style="background: #f0f4ff; border-radius: 8px; padding: 16px; margin-top: 24px;">`;
    html += `<h4 style="color: #1a1a1a; margin: 0 0 8px; font-size: 14px;">Access Your Band Account</h4>`;
    html += `<p style="color: #4b5563; margin: 0 0 8px; font-size: 13px;">You can view setlists, songs, and charts online by logging in to your band member account:</p>`;
    html += `<ol style="color: #4b5563; margin: 0; padding-left: 20px; font-size: 13px;">`;
    html += `<li style="margin-bottom: 4px;">Go to <a href="${siteUrl}/member-login" style="color: #4f46e5; text-decoration: underline;">${siteUrl}/member-login</a></li>`;
    html += `<li style="margin-bottom: 4px;">Enter your access token (provided by your band leader)</li>`;
    html += `<li style="margin-bottom: 0;">Browse songs, setlists, and charts for ${bandName}</li>`;
    html += `</ol>`;
    html += `</div>`;

    html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`;
    const senderLabel = user?.name || user?.email || "Unknown";
    html += `<p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent by ${senderLabel} via Set List Creator</p>`;
    html += `</div>`;

    return html;
  };

  const generateSubject = () => {
    if (subject) return subject;
    switch (contentType) {
      case "setlist":
        return selectedSetlist
          ? `${bandName} - Setlist: ${selectedSetlist.name}`
          : `${bandName} - Setlist`;
      case "song-list":
        return `${bandName} - Master Song List`;
      case "charts":
        return `${bandName} - Charts Package`;
      default:
        return bandName;
    }
  };

  const canSend = () => {
    if (recipients.length === 0) return false;
    switch (contentType) {
      case "setlist":
        return !!selectedSetlistId;
      case "song-list":
        return true;
      case "charts":
        return selectedSongIds.size > 0;
      default:
        return false;
    }
  };

  const handleSend = async () => {
    if (!canSend()) return;

    try {
      let attachments: { filename: string; content: string }[] | undefined;

      // Generate chart ZIP attachment for setlist emails
      if (contentType === "setlist" && selectedSetlistId && setlistItems && songs && chartUrls) {
        const setlistSongs = songs.filter(
          (s: any) => setlistSongIds.has(s._id) && s.chartFileId
        );
        if (setlistSongs.length > 0) {
          setPreparing(true);
          const zip = new JSZip();
          const fetchPromises: Promise<void>[] = [];

          for (const song of setlistSongs) {
            const chartUrl = chartUrls[song.chartFileId];
            if (!chartUrl) continue;

            const promise = (async () => {
              try {
                const response = await fetch(chartUrl);
                if (!response.ok) return;
                const ct = response.headers.get("content-type") || "";
                let ext = "pdf";
                if (ct.includes("image/png")) ext = "png";
                else if (ct.includes("image/jpeg") || ct.includes("image/jpg")) ext = "jpg";
                else if (ct.includes("image/gif")) ext = "gif";
                else if (ct.includes("image/webp")) ext = "webp";
                const blob = await response.blob();
                const filename = `${song.title.replace(/[^a-z0-9\s\-_]/gi, "").replace(/\s+/g, "-")}-${song.artist.replace(/[^a-z0-9\s\-_]/gi, "").replace(/\s+/g, "-")}.${ext}`;
                zip.file(filename, blob);
              } catch (e) {
                console.error(`Failed to fetch chart for ${song.title}:`, e);
              }
            })();
            fetchPromises.push(promise);
          }

          await Promise.all(fetchPromises);
          const base64 = await zip.generateAsync({ type: "base64" });

          if (base64.length <= 27_000_000) {
            attachments = [
              {
                filename: `${(selectedSetlist?.name ?? bandName).replace(/[^a-zA-Z0-9]/g, "-")}-Charts.zip`,
                content: base64
              }
            ];
          }
        }
      }

      // Generate PDF attachment for song list
      if (contentType === "song-list" && songs) {
        setPreparing(true);
        const doc = <SongListPDF bandName={bandName} songs={songs} />;
        const blob = await pdf(doc).toBlob();
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        attachments = [
          {
            filename: `${bandName.replace(/[^a-zA-Z0-9]/g, "-")}-Song-List.pdf`,
            content: base64
          }
        ];
      }

      // Generate ZIP attachment for charts
      if (contentType === "charts" && songs && chartUrls) {
        setPreparing(true);
        const zip = new JSZip();
        const selectedSongs = songs.filter(
          (s: any) => selectedSongIds.has(s._id) && s.chartFileId
        );

        const fetchPromises: Promise<void>[] = [];
        for (const song of selectedSongs) {
          const chartUrl = chartUrls[song.chartFileId];
          if (!chartUrl) continue;

          const promise = (async () => {
            try {
              const response = await fetch(chartUrl);
              if (!response.ok) return;

              const contentTypeHeader = response.headers.get("content-type") || "";
              let extension = "pdf";
              if (contentTypeHeader.includes("image/png")) extension = "png";
              else if (contentTypeHeader.includes("image/jpeg") || contentTypeHeader.includes("image/jpg")) extension = "jpg";
              else if (contentTypeHeader.includes("image/gif")) extension = "gif";
              else if (contentTypeHeader.includes("image/webp")) extension = "webp";

              const blob = await response.blob();
              const filename = `${song.title.replace(/[^a-z0-9\s\-_]/gi, "").replace(/\s+/g, "-")}-${song.artist.replace(/[^a-z0-9\s\-_]/gi, "").replace(/\s+/g, "-")}.${extension}`;
              zip.file(filename, blob);
            } catch (e) {
              console.error(`Failed to fetch chart for ${song.title}:`, e);
            }
          })();
          fetchPromises.push(promise);
        }

        await Promise.all(fetchPromises);
        const base64 = await zip.generateAsync({ type: "base64" });

        // ~27MB base64 ≈ 20MB decoded
        if (base64.length > 27_000_000) {
          toast.error("Charts package is too large to email", {
            description: "Try using the Gig Pack download instead."
          });
          setPreparing(false);
          return;
        }

        attachments = [
          {
            filename: `${bandName.replace(/[^a-zA-Z0-9]/g, "-")}-Charts.zip`,
            content: base64
          }
        ];
      }

      setPreparing(false);
      setSending(true);

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients.map((r) => r.email),
          subject: generateSubject(),
          html: generateEmailContent(),
          senderName: bandName,
          ...(attachments ? { attachments } : {})
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send email");
      }

      toast.success(`Email sent to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to send email", { description: e?.message });
    } finally {
      setPreparing(false);
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email
          </DialogTitle>
          <DialogDescription>
            Send to {recipients.length} band member{recipients.length !== 1 ? "s" : ""}:{" "}
            {recipients.map((r) => r.name).join(", ")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-2">
          {/* Content Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">What to send</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setContentType("setlist")}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                  contentType === "setlist"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <ListMusic className="h-5 w-5" />
                Setlist
              </button>
              <button
                type="button"
                onClick={() => setContentType("song-list")}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                  contentType === "song-list"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Music className="h-5 w-5" />
                Song List
              </button>
              <button
                type="button"
                onClick={() => setContentType("charts")}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                  contentType === "charts"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <FileText className="h-5 w-5" />
                Charts
              </button>
            </div>
          </div>

          {/* Setlist Selection */}
          {contentType === "setlist" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Setlist</label>
              <Select value={selectedSetlistId} onValueChange={setSelectedSetlistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a setlist..." />
                </SelectTrigger>
                <SelectContent>
                  {setlists?.map((setlist: any) => (
                    <SelectItem key={setlist._id} value={setlist._id}>
                      {setlist.name}
                      {setlist.gigDate && (
                        <span className="text-muted-foreground ml-2">
                          ({new Date(setlist.gigDate).toLocaleDateString()})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Charts Selection */}
          {contentType === "charts" && songs && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Songs</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllSongs}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectSongsWithCharts}
                  >
                    With Charts Only
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSongIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-48 overflow-auto rounded-lg border border-border">
                {songs.map((song: any) => (
                  <label
                    key={song._id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                  >
                    <Checkbox
                      checked={selectedSongIds.has(song._id)}
                      onCheckedChange={() => toggleSongSelection(song._id)}
                    />
                    <span className="flex-1 text-sm">{song.title}</span>
                    <span className="text-sm text-muted-foreground">{song.artist}</span>
                    {song.chartFileId && (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Chart
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedSongIds.size} songs selected
                {songs.filter((s: any) => selectedSongIds.has(s._id) && s.chartFileId).length > 0 && (
                  <> ({songs.filter((s: any) => selectedSongIds.has(s._id) && s.chartFileId).length} with charts)</>
                )}
              </p>
            </div>
          )}

          {/* Subject Override */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject (optional)</label>
            <Input
              placeholder={generateSubject()}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message (optional)</label>
            <Textarea
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend() || sending || preparing}>
            {preparing ? (
              "Preparing attachments..."
            ) : sending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
