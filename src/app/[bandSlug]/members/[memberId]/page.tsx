"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useBandMember,
  useUpdateBandMember,
  useArchiveBandMember,
  useRemoveBandMember,
  useGenerateMemberAccessToken,
  useRevokeMemberAccessToken,
  useSongsList,
  useSetlistsList,
  useSetlistItems
} from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Mail,
  Trash2,
  Archive,
  ArchiveRestore,
  Send,
  FileText,
  ListMusic,
  Music,
  Key,
  Copy,
  RefreshCw,
  X as XIcon
} from "lucide-react";
import { toast } from "sonner";

type EmailContentType = "setlist" | "song-list" | "charts";

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const memberId = params.memberId as string;

  const band = useBandBySlug(bandSlug);
  const member = useBandMember(memberId);
  const updateMember = useUpdateBandMember();
  const archiveMember = useArchiveBandMember();
  const removeMember = useRemoveBandMember();
  const generateToken = useGenerateMemberAccessToken();
  const revokeToken = useRevokeMemberAccessToken();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [revokingToken, setRevokingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Initialize form when member loads
  if (member && !initialized) {
    setName(member.name);
    setEmail(member.email);
    setRole(member.role);
    setInitialized(true);
  }

  if (!band) return null;

  if (member === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (member === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Member not found</div>
      </div>
    );
  }

  const hasChanges =
    name !== member.name || email !== member.email || role !== member.role;

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !role.trim()) return;
    setSaving(true);
    try {
      await updateMember({
        memberId: memberId as any,
        patch: {
          name: name.trim(),
          email: email.trim(),
          role: role.trim()
        }
      });
      toast.success("Member updated");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveMember({
        memberId: memberId as any,
        archived: !member.archivedAt
      });
      toast.success(member.archivedAt ? "Member restored" : "Member archived");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeMember({ memberId: memberId as any });
      toast.success("Member deleted");
      router.push(`/${bandSlug}/members`);
    } catch (e: any) {
      toast.error("Failed to delete", { description: e?.message });
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      await generateToken({ memberId: memberId as any });
      setShowToken(true);
      toast.success("Access token generated");
    } catch (e: any) {
      toast.error("Failed to generate token", { description: e?.message });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeToken = async () => {
    setRevokingToken(true);
    try {
      await revokeToken({ memberId: memberId as any });
      setShowToken(false);
      toast.success("Access token revoked");
    } catch (e: any) {
      toast.error("Failed to revoke token", { description: e?.message });
    } finally {
      setRevokingToken(false);
    }
  };

  const copyToken = () => {
    if (member?.accessToken) {
      navigator.clipboard.writeText(member.accessToken);
      toast.success("Token copied to clipboard");
    }
  };

  const copyLoginUrl = () => {
    const url = `${window.location.origin}/member-login`;
    navigator.clipboard.writeText(url);
    toast.success("Login URL copied to clipboard");
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${bandSlug}/members`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {member.name}
          </h1>
          <p className="text-muted-foreground text-sm">{member.role}</p>
        </div>
        {member.archivedAt && (
          <Badge variant="outline">Archived</Badge>
        )}
      </div>

      {/* Form */}
      <div className="space-y-5 p-4 rounded-lg border border-border bg-card">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Role</label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Lead vocals, guitar, drums..."
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !name.trim() || !email.trim() || !role.trim() || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Access Token Section */}
      <div className="mt-6 p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Member Access</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate an access token to allow this member to view songs and setlists.
        </p>

        {member.accessToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-md bg-muted font-mono text-sm">
                {showToken ? member.accessToken : "••••••••••••••••••••••••"}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <XIcon className="h-4 w-4" /> : <Key className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToken}
                title="Copy token"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLoginUrl}
              >
                Copy Login URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateToken}
                disabled={generatingToken}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generatingToken ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={handleRevokeToken}
                disabled={revokingToken}
              >
                Revoke Access
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleGenerateToken}
            disabled={generatingToken}
          >
            {generatingToken ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-1.5" />
                Generate Access Token
              </>
            )}
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
        <Button variant="outline" onClick={handleArchive}>
          {member.archivedAt ? (
            <>
              <ArchiveRestore className="h-4 w-4 mr-1.5" />
              Restore
            </>
          ) : (
            <>
              <Archive className="h-4 w-4 mr-1.5" />
              Archive
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete
        </Button>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {member.name}? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      {band && (
        <SingleMemberEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          bandId={band._id}
          bandName={band.name}
          member={{ name: member.name, email: member.email }}
        />
      )}
    </div>
  );
}

function SingleMemberEmailDialog({
  open,
  onOpenChange,
  bandId,
  bandName,
  member
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bandId: string;
  bandName: string;
  member: { name: string; email: string };
}) {
  const [contentType, setContentType] = useState<EmailContentType>("setlist");
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const songs = useSongsList({ bandId: bandId as any, includeArchived: false });
  const setlists = useSetlistsList({ bandId: bandId as any, includeArchived: false });
  const setlistItems = useSetlistItems(selectedSetlistId || null);

  const selectedSetlist = setlists?.find((s: any) => s._id === selectedSetlistId);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setContentType("setlist");
      setSelectedSetlistId("");
      setSubject("");
      setMessage("");
    }
    onOpenChange(newOpen);
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
    }

    if (contentType === "song-list" && songs) {
      const sortedSongs = [...songs].sort((a: any, b: any) => a.title.localeCompare(b.title));
      html += `<div style="background: #f9fafb; border-radius: 8px; padding: 20px;">`;
      html += `<h3 style="color: #1a1a1a; margin: 0 0 16px;">Master Song List</h3>`;
      html += `<p style="color: #6b7280; margin: 0 0 16px; font-size: 14px;">${sortedSongs.length} songs</p>`;
      html += `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">`;
      html += `<thead><tr style="border-bottom: 1px solid #e5e7eb;">`;
      html += `<th style="text-align: left; padding: 8px 0; color: #6b7280;">Title</th>`;
      html += `<th style="text-align: left; padding: 8px 0; color: #6b7280;">Artist</th>`;
      html += `</tr></thead><tbody>`;
      for (const song of sortedSongs) {
        html += `<tr style="border-bottom: 1px solid #f3f4f6;">`;
        html += `<td style="padding: 8px 0; color: #1a1a1a;">${song.title}</td>`;
        html += `<td style="padding: 8px 0; color: #6b7280;">${song.artist}</td>`;
        html += `</tr>`;
      }
      html += `</tbody></table></div>`;
    }

    if (contentType === "charts" && songs) {
      const songsWithCharts = songs.filter((s: any) => s.chartFileId);
      html += `<div style="background: #f9fafb; border-radius: 8px; padding: 20px;">`;
      html += `<h3 style="color: #1a1a1a; margin: 0 0 16px;">Charts Package</h3>`;
      html += `<p style="color: #6b7280; margin: 0 0 16px; font-size: 14px;">${songsWithCharts.length} charts available</p>`;
      html += `<ul style="margin: 0; padding-left: 20px; color: #4b5563;">`;
      for (const song of songsWithCharts) {
        html += `<li style="margin-bottom: 4px;">${song.title} — ${song.artist}</li>`;
      }
      html += `</ul></div>`;
    }

    html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`;
    html += `<p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent via Set List Manager</p>`;
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
    switch (contentType) {
      case "setlist":
        return !!selectedSetlistId;
      case "song-list":
      case "charts":
        return true;
      default:
        return false;
    }
  };

  const handleSend = async () => {
    if (!canSend()) return;
    setSending(true);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [member.email],
          subject: generateSubject(),
          html: generateEmailContent()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send email");
      }

      toast.success(`Email sent to ${member.name}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to send email", { description: e?.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to {member.name}
          </DialogTitle>
          <DialogDescription>
            {member.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject (optional)</label>
            <Input
              placeholder={generateSubject()}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
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
          <Button onClick={handleSend} disabled={!canSend() || sending}>
            {sending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
