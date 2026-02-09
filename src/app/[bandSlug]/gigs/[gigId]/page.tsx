"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useGig,
  useGigMembersList,
  useBandMembersList,
  useSetlist,
  useSetlistsList,
  useSetlistItems,
  useSongsList,
  useMultipleStorageUrls,
  useUpdateGig,
  useUpdateGigStatus,
  useArchiveGig,
  useRemoveGig,
  useAdminUpdateGigMember,
  useAddGigMember,
  useRemoveGigMember,
  useMemberGig,
  useMemberRespondToGig,
  useCurrentUser
} from "@/lib/convex";
import { useMemberAuth } from "@/hooks/useMemberAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ListMusic,
  Pencil,
  Trash2,
  Check,
  X,
  HelpCircle,
  UserPlus,
  Send,
  UserMinus,
  Package,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

type GigStatus = "enquiry" | "confirmed" | "completed" | "cancelled";

function statusBadge(status: string) {
  switch (status) {
    case "enquiry":
      return <Badge variant="secondary">Enquiry</Badge>;
    case "confirmed":
      return <Badge variant="default">Confirmed</Badge>;
    case "completed":
      return <Badge variant="outline">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return null;
  }
}

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${ampm}`;
}

function memberStatusIcon(status: string) {
  switch (status) {
    case "confirmed":
      return <Check className="h-4 w-4 text-green-600" />;
    case "declined":
      return <X className="h-4 w-4 text-red-500" />;
    default:
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function GigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const gigId = params.gigId as string;
  const { isMember, token: memberToken } = useMemberAuth();

  // Admin queries
  const band = useBandBySlug(isMember ? null : bandSlug);
  const adminGig = useGig(isMember ? null : gigId);
  const gigMembers = useGigMembersList(isMember ? null : gigId);
  const adminSetlists = useSetlistsList(
    !isMember && band ? { bandId: band._id } : null
  );
  const bandMembers = useBandMembersList(
    !isMember && band ? { bandId: band._id } : null
  );

  // Member queries
  const memberGig = useMemberGig(
    isMember ? memberToken : null,
    isMember ? gigId : null
  );

  const gig = isMember ? memberGig : adminGig;
  const linkedSetlist = useSetlist(
    !isMember && gig?.setlistId ? (gig.setlistId as string) : null
  );

  // Gig pack data (for sending to confirmed members)
  const setlistItems = useSetlistItems(
    !isMember && gig?.setlistId ? (gig.setlistId as string) : null
  );
  const allSongs = useSongsList(
    !isMember && band && gig?.setlistId ? { bandId: band._id } : null
  );
  const chartStorageIds = useMemo(() => {
    if (!setlistItems || !allSongs) return [];
    const songMap = new Map((allSongs as any[]).map((s) => [s._id, s]));
    const ids: string[] = [];
    for (const item of setlistItems as any[]) {
      const song = songMap.get(item.songId);
      if (song?.chartFileId) ids.push(song.chartFileId);
    }
    return ids;
  }, [setlistItems, allSongs]);
  const chartUrls = useMultipleStorageUrls(chartStorageIds);

  // Mutations
  const updateGig = useUpdateGig();
  const updateStatus = useUpdateGigStatus();
  const archiveGig = useArchiveGig();
  const removeGig = useRemoveGig();
  const adminUpdateMember = useAdminUpdateGigMember();
  const addGigMember = useAddGigMember();
  const removeGigMember = useRemoveGigMember();
  const memberRespond = useMemberRespondToGig();
  const currentUser = useCurrentUser();

  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoadIn, setEditLoadIn] = useState("");
  const [editSoundcheck, setEditSoundcheck] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editVenueName, setEditVenueName] = useState("");
  const [editVenueAddress, setEditVenueAddress] = useState("");
  const [editVenuePhone, setEditVenuePhone] = useState("");
  const [editVenueEmail, setEditVenueEmail] = useState("");
  const [editVenueNotes, setEditVenueNotes] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editDressCode, setEditDressCode] = useState("");
  const [editSetlistId, setEditSetlistId] = useState("");

  // Gig pack
  const [sendingGigPack, setSendingGigPack] = useState(false);

  // Member response
  const [respondNote, setRespondNote] = useState("");
  const [responding, setResponding] = useState(false);

  if (!isMember && !band) return null;

  if (gig === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (gig === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Gig not found</div>
      </div>
    );
  }

  const openEdit = () => {
    setEditName(gig.name);
    setEditDate(new Date(gig.date).toISOString().split("T")[0]);
    setEditDescription(gig.description ?? "");
    setEditLoadIn(gig.loadInTime ?? "");
    setEditSoundcheck(gig.soundcheckTime ?? "");
    setEditStart(gig.startTime ?? "");
    setEditEnd(gig.endTime ?? "");
    setEditVenueName(gig.venueName ?? "");
    setEditVenueAddress(gig.venueAddress ?? "");
    setEditVenuePhone(gig.venuePhone ?? "");
    setEditVenueEmail(gig.venueEmail ?? "");
    setEditVenueNotes(gig.venueNotes ?? "");
    setEditContactName(gig.contactName ?? "");
    setEditContactPhone(gig.contactPhone ?? "");
    setEditContactEmail(gig.contactEmail ?? "");
    setEditDressCode(gig.dressCode ?? "");
    setEditSetlistId(gig.setlistId ?? "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateGig({
        gigId: gigId as any,
        patch: {
          name: editName.trim(),
          date: new Date(editDate).getTime(),
          description: editDescription.trim() || undefined,
          loadInTime: editLoadIn || undefined,
          soundcheckTime: editSoundcheck || undefined,
          startTime: editStart || undefined,
          endTime: editEnd || undefined,
          venueName: editVenueName.trim() || undefined,
          venueAddress: editVenueAddress.trim() || undefined,
          venuePhone: editVenuePhone.trim() || undefined,
          venueEmail: editVenueEmail.trim() || undefined,
          venueNotes: editVenueNotes.trim() || undefined,
          contactName: editContactName.trim() || undefined,
          contactPhone: editContactPhone.trim() || undefined,
          contactEmail: editContactEmail.trim() || undefined,
          dressCode: editDressCode.trim() || undefined,
          setlistId: editSetlistId ? (editSetlistId as any) : undefined
        }
      });
      setEditOpen(false);
      toast.success("Gig updated");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: GigStatus) => {
    try {
      await updateStatus({ gigId: gigId as any, status: newStatus });
      toast.success(`Gig marked as ${newStatus}`);
    } catch (e: any) {
      toast.error("Failed to update status", { description: e?.message });
    }
  };

  const handleDelete = async () => {
    try {
      await removeGig({ gigId: gigId as any });
      toast.success("Gig deleted");
      router.push(`/${bandSlug}/gigs`);
    } catch (e: any) {
      toast.error("Failed to delete", { description: e?.message });
    }
  };

  const handleAdminMemberUpdate = async (
    memberId: string,
    status: "pending" | "confirmed" | "declined"
  ) => {
    try {
      await adminUpdateMember({
        gigId: gigId as any,
        memberId: memberId as any,
        status
      });
      toast.success("Member status updated");
    } catch (e: any) {
      toast.error("Failed to update", { description: e?.message });
    }
  };

  const handleMemberRespond = async (status: "confirmed" | "declined") => {
    setResponding(true);
    try {
      await memberRespond({
        token: memberToken!,
        gigId: gigId as any,
        status,
        note: respondNote.trim() || undefined
      });
      toast.success(
        status === "confirmed" ? "You confirmed!" : "Response recorded"
      );
    } catch (e: any) {
      toast.error("Failed to respond", { description: e?.message });
    } finally {
      setResponding(false);
    }
  };

  // Compute which band members are NOT yet on this gig
  const gigMemberIds = new Set(
    (gigMembers ?? []).map((gm: any) => gm.memberId as string)
  );
  const availableToInvite = (bandMembers ?? []).filter(
    (m: any) => !m.archivedAt && !gigMemberIds.has(m._id)
  );

  const handleInviteMembers = async () => {
    if (selectedInvitees.size === 0) return;
    setInviting(true);

    try {
      // Add each member to the gig
      const membersToInvite = (bandMembers ?? []).filter((m: any) =>
        selectedInvitees.has(m._id)
      );

      for (const member of membersToInvite) {
        await addGigMember({
          gigId: gigId as any,
          memberId: member._id as any
        });
      }

      // Send email invites
      const dateStr = new Date(gig.date).toLocaleDateString("en-NZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://setlistcreator.co.nz";
      const senderLabel = currentUser?.name || currentUser?.email || "Your band leader";

      let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">`;
      html += `<h2 style="color: #1a1a1a; margin-bottom: 16px;">You've been invited to a gig!</h2>`;
      html += `<div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">`;
      html += `<h3 style="color: #1a1a1a; margin: 0 0 8px;">${gig.name}</h3>`;
      html += `<p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">${dateStr}</p>`;
      if (gig.venueName) {
        html += `<p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">${gig.venueName}${gig.venueAddress ? ` — ${gig.venueAddress}` : ""}</p>`;
      }
      if (gig.startTime) {
        html += `<p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">Start: ${gig.startTime}${gig.endTime ? ` — End: ${gig.endTime}` : ""}</p>`;
      }
      if (gig.dressCode) {
        html += `<p style="color: #6b7280; margin: 0; font-size: 14px;">Dress code: ${gig.dressCode}</p>`;
      }
      if (gig.description) {
        html += `<p style="color: #6b7280; margin: 8px 0 0; font-size: 14px; white-space: pre-wrap;">${gig.description}</p>`;
      }
      html += `</div>`;

      html += `<p style="color: #374151; margin-bottom: 24px; font-size: 14px;">Log in to your band member account to confirm your availability.</p>`;
      html += `<div style="text-align: center; margin-bottom: 24px;">`;
      html += `<a href="${siteUrl}/member-login" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">Log In to Respond</a>`;
      html += `</div>`;

      html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`;
      html += `<p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent by ${senderLabel} via Set List Creator</p>`;
      html += `</div>`;

      const recipients = membersToInvite.map((m: any) => m.email);

      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          subject: `${band?.name ?? "Band"} — Gig Invite: ${gig.name}`,
          html
        })
      });

      toast.success(
        `Invited ${membersToInvite.length} member${membersToInvite.length !== 1 ? "s" : ""}`
      );
      setInviteOpen(false);
      setSelectedInvitees(new Set());
    } catch (e: any) {
      toast.error("Failed to invite members", { description: e?.message });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveGigMember = async (memberId: string) => {
    try {
      await removeGigMember({
        gigId: gigId as any,
        memberId: memberId as any
      });
      toast.success("Member removed from gig");
    } catch (e: any) {
      toast.error("Failed to remove member", { description: e?.message });
    }
  };

  const sanitizeFilename = (name: string) =>
    name.replace(/[^a-z0-9\s\-_]/gi, "").replace(/\s+/g, "-");

  const handleSendGigPack = async () => {
    if (!linkedSetlist || !setlistItems || !allSongs || !gigMembers) return;

    const confirmedMembers = gigMembers.filter(
      (gm: any) => gm.status === "confirmed" && gm.memberEmail
    );
    if (confirmedMembers.length === 0) {
      toast.error("No confirmed members to send to");
      return;
    }

    setSendingGigPack(true);
    try {
      // Dynamic imports to avoid loading @react-pdf/renderer at page level
      const [{ pdf }, { SetlistPDF }, JSZip] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/export/setlist-pdf"),
        import("jszip").then((m) => m.default)
      ]);

      // Build songs map
      const songsById = new Map(allSongs.map((s: any) => [s._id, s])) as Map<string, any>;

      // Generate setlist PDF
      const doc = (
        <SetlistPDF
          setlist={linkedSetlist as any}
          items={setlistItems as any}
          songsById={songsById}
          options={{ showArtist: true, showIntensity: false, showEnergy: false }}
        />
      );
      const pdfBlob = await pdf(doc).toBlob();

      // Build ZIP
      const zip = new JSZip();
      zip.file(`${sanitizeFilename(linkedSetlist.name)}-setlist.pdf`, pdfBlob);

      // Add charts
      const chartsFolder = zip.folder("charts");
      if (chartUrls && chartsFolder) {
        const fetchPromises: Promise<void>[] = [];
        for (const item of setlistItems) {
          const song = songsById.get(item.songId);
          if (!song?.chartFileId) continue;
          const url = chartUrls[song.chartFileId];
          if (!url) continue;
          fetchPromises.push(
            (async () => {
              try {
                const resp = await fetch(url);
                if (!resp.ok) return;
                const ct = resp.headers.get("content-type") || "";
                let ext = "pdf";
                if (ct.includes("image/png")) ext = "png";
                else if (ct.includes("image/jpeg") || ct.includes("image/jpg")) ext = "jpg";
                else if (ct.includes("image/gif")) ext = "gif";
                const blob = await resp.blob();
                chartsFolder.file(
                  `${sanitizeFilename(song.title)}-${sanitizeFilename(song.artist)}.${ext}`,
                  blob
                );
              } catch {}
            })()
          );
        }
        await Promise.all(fetchPromises);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Convert to base64
      const arrayBuffer = await zipBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Build email
      const dateStr = new Date(gig.date).toLocaleDateString("en-NZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const senderLabel = currentUser?.name || currentUser?.email || "Your band leader";

      let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">`;
      html += `<h2 style="color: #1a1a1a; margin-bottom: 16px;">Gig Pack: ${gig.name}</h2>`;
      html += `<div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">`;
      html += `<p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">${dateStr}</p>`;
      if (gig.venueName) {
        html += `<p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">${gig.venueName}${gig.venueAddress ? ` — ${gig.venueAddress}` : ""}</p>`;
      }
      if (gig.startTime) {
        html += `<p style="color: #6b7280; margin: 0 0 4px; font-size: 14px;">Start: ${formatTime(gig.startTime)}${gig.endTime ? ` — End: ${formatTime(gig.endTime)}` : ""}</p>`;
      }
      html += `</div>`;
      html += `<p style="color: #374151; margin-bottom: 16px; font-size: 14px;">Your gig pack is attached as a ZIP file containing the setlist and any available charts.</p>`;
      html += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`;
      html += `<p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent by ${senderLabel} via Set List Creator</p>`;
      html += `</div>`;

      const recipients = confirmedMembers.map((m: any) => m.memberEmail);
      const gigDate = new Date(gig.date).toISOString().split("T")[0];
      const zipFileName = `${sanitizeFilename(gig.name)}-${gigDate}-gig-pack.zip`;

      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          subject: `${band?.name ?? "Band"} — Gig Pack: ${gig.name}`,
          html,
          attachments: [{ filename: zipFileName, content: base64 }]
        })
      });

      toast.success(
        `Gig pack sent to ${confirmedMembers.length} confirmed member${confirmedMembers.length !== 1 ? "s" : ""}`
      );
    } catch (e: any) {
      console.error("Failed to send gig pack:", e);
      toast.error("Failed to send gig pack", { description: e?.message });
    } finally {
      setSendingGigPack(false);
    }
  };

  const dateFormatted = new Date(gig.date).toLocaleDateString("en-NZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // For member view, members come from memberGig
  const displayMembers = isMember ? (gig as any).members ?? [] : gigMembers ?? [];
  const confirmedCount = displayMembers.filter(
    (m: any) => m.status === "confirmed"
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${bandSlug}/gigs`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {gig.name}
            </h1>
            {statusBadge(gig.status)}
          </div>
          <p className="flex items-center gap-1 text-muted-foreground text-sm">
            <Calendar className="h-3 w-3" />
            {dateFormatted}
          </p>
        </div>
        {!isMember && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Status Actions (admin) */}
      {!isMember && (
        <div className="flex flex-wrap gap-2">
          {gig.status === "enquiry" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("confirmed")}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirm Gig
            </Button>
          )}
          {gig.status === "confirmed" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("completed")}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark Completed
            </Button>
          )}
          {(gig.status === "enquiry" || gig.status === "confirmed") && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("cancelled")}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Gig
            </Button>
          )}
          {gig.status === "cancelled" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("enquiry")}
            >
              Reopen as Enquiry
            </Button>
          )}
          {gig.setlistId && confirmedCount > 0 && (
            <Button
              variant="outline"
              onClick={handleSendGigPack}
              disabled={sendingGigPack}
            >
              {sendingGigPack ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Send Gig Pack
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      )}

      {/* Member Response Card */}
      {isMember && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Your Response</CardTitle>
          </CardHeader>
          <CardContent className="py-3 pt-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {(gig as any).myStatus === "confirmed" && (
                <Badge variant="default">Confirmed</Badge>
              )}
              {(gig as any).myStatus === "declined" && (
                <Badge variant="destructive">Declined</Badge>
              )}
              {(gig as any).myStatus === "pending" && (
                <Badge variant="secondary">Pending</Badge>
              )}
              {!(gig as any).myStatus && (
                <Badge variant="outline">Not invited</Badge>
              )}
            </div>
            {(gig as any).myStatus && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Note (optional)</label>
                  <Input
                    placeholder="Add a note..."
                    value={respondNote}
                    onChange={(e) => setRespondNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleMemberRespond("confirmed")}
                    disabled={responding}
                    variant={
                      (gig as any).myStatus === "confirmed"
                        ? "default"
                        : "outline"
                    }
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      (gig as any).myStatus === "declined"
                        ? "destructive"
                        : "outline"
                    }
                    onClick={() => handleMemberRespond("declined")}
                    disabled={responding}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Gig Info (schedule + details + linked setlist) */}
        {(gig.loadInTime || gig.soundcheckTime || gig.startTime || gig.endTime || gig.dressCode || gig.description || gig.setlistId) ? (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Gig Info
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0 space-y-1">
              {gig.loadInTime && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Load-in:</span>{" "}
                  {formatTime(gig.loadInTime)}
                </p>
              )}
              {gig.soundcheckTime && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Soundcheck:</span>{" "}
                  {formatTime(gig.soundcheckTime)}
                </p>
              )}
              {gig.startTime && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Start:</span>{" "}
                  {formatTime(gig.startTime)}
                </p>
              )}
              {gig.endTime && (
                <p className="text-sm">
                  <span className="text-muted-foreground">End:</span>{" "}
                  {formatTime(gig.endTime)}
                </p>
              )}
              {(gig.dressCode || gig.description) && (gig.loadInTime || gig.soundcheckTime || gig.startTime || gig.endTime) && (
                <div className="border-t border-border my-2 !mt-3" />
              )}
              {gig.dressCode && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Dress code:</span>{" "}
                  {gig.dressCode}
                </p>
              )}
              {gig.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {gig.description}
                </p>
              )}
              {gig.setlistId && (gig.loadInTime || gig.soundcheckTime || gig.startTime || gig.endTime || gig.dressCode || gig.description) && (
                <div className="border-t border-border my-2 !mt-3" />
              )}
              {gig.setlistId ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {linkedSetlist?.name ?? (isMember ? "Setlist linked" : "Loading...")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/${bandSlug}/setlists/${gig.setlistId}`}>
                      View Setlist
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No setlist linked
                    {!isMember && " — click Edit to link one"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListMusic className="h-4 w-4" />
                Linked Setlist
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <p className="text-sm text-muted-foreground">
                No setlist linked to this gig
                {!isMember && " — click Edit to link one"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Venue + Contact */}
        {(gig.venueName || gig.venueAddress || gig.contactName || gig.contactPhone || gig.contactEmail) && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Venue
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0 space-y-1">
              {gig.venueName && (
                <p className="text-sm font-medium">{gig.venueName}</p>
              )}
              {gig.venueAddress && (
                <p className="text-sm text-muted-foreground">
                  {gig.venueAddress}
                </p>
              )}
              {gig.venuePhone && (
                <p className="text-sm flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {gig.venuePhone}
                </p>
              )}
              {gig.venueEmail && (
                <p className="text-sm flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  {gig.venueEmail}
                </p>
              )}
              {gig.venueNotes && (
                <p className="text-sm text-muted-foreground mt-2">
                  {gig.venueNotes}
                </p>
              )}
              {(gig.contactName || gig.contactPhone || gig.contactEmail) && (
                <>
                  <div className="border-t border-border my-2 !mt-3" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</p>
                  {gig.contactName && (
                    <p className="text-sm font-medium">{gig.contactName}</p>
                  )}
                  {gig.contactPhone && (
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {gig.contactPhone}
                    </p>
                  )}
                  {gig.contactEmail && (
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {gig.contactEmail}
                    </p>
                  )}
                </>
              )}
              {gig.venueAddress && (
                <div className="mt-3 aspect-[4/3]">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(gig.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    className="rounded-md"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Member Availability */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Member Availability</span>
            <div className="flex items-center gap-2">
              <span className="font-normal text-muted-foreground">
                {confirmedCount} of {displayMembers.length} confirmed
              </span>
              {!isMember && availableToInvite.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setSelectedInvitees(new Set());
                    setInviteOpen(true);
                  }}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Invite
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 pt-0">
          {displayMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members</p>
          ) : (
            <div className="space-y-2">
              {displayMembers.map((gm: any) => (
                <div
                  key={gm._id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {memberStatusIcon(gm.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {gm.memberName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {gm.memberRole}
                      </p>
                    </div>
                  </div>
                  {gm.note && (
                    <p className="text-xs text-muted-foreground italic hidden sm:block max-w-[200px] truncate">
                      {gm.note}
                    </p>
                  )}
                  {!isMember && (
                    <div className="flex items-center gap-1">
                      <Select
                        value={gm.status}
                        onValueChange={(v) =>
                          handleAdminMemberUpdate(gm.memberId, v as any)
                        }
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveGigMember(gm.memberId)}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Dialogs */}
      {!isMember && (
        <>
          {/* Edit Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Edit Gig</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dress Code</label>
                    <Input
                      value={editDressCode}
                      onChange={(e) => setEditDressCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                  Schedule
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Load-in</label>
                    <Input
                      type="time"
                      value={editLoadIn}
                      onChange={(e) => setEditLoadIn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Soundcheck</label>
                    <Input
                      type="time"
                      value={editSoundcheck}
                      onChange={(e) => setEditSoundcheck(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start</label>
                    <Input
                      type="time"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End</label>
                    <Input
                      type="time"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                    />
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                  Venue
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Venue Name</label>
                    <Input
                      value={editVenueName}
                      onChange={(e) => setEditVenueName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={editVenueAddress}
                      onChange={(e) => setEditVenueAddress(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editVenuePhone}
                        onChange={(e) => setEditVenuePhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        value={editVenueEmail}
                        onChange={(e) => setEditVenueEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={editVenueNotes}
                      onChange={(e) => setEditVenueNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                  Contact
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editContactName}
                      onChange={(e) => setEditContactName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editContactPhone}
                        onChange={(e) => setEditContactPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        value={editContactEmail}
                        onChange={(e) => setEditContactEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                  Linked Setlist
                </h3>
                <div className="space-y-2">
                  <Select
                    value={editSetlistId || "none"}
                    onValueChange={(v) =>
                      setEditSetlistId(v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No setlist linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No setlist linked</SelectItem>
                      {adminSetlists?.map((sl: any) => (
                        <SelectItem key={sl._id} value={sl._id}>
                          {sl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

          {/* Delete Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Gig</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &quot;{gig.name}&quot;? This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Invite Members Dialog */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Members</DialogTitle>
                <DialogDescription>
                  Select band members to invite to this gig. They will receive
                  an email notification.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                {availableToInvite.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All band members have already been invited.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        checked={
                          selectedInvitees.size === availableToInvite.length &&
                          availableToInvite.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedInvitees(
                              new Set(availableToInvite.map((m: any) => m._id))
                            );
                          } else {
                            setSelectedInvitees(new Set());
                          }
                        }}
                      />
                      <span className="text-sm font-medium">Select all</span>
                    </div>
                    {availableToInvite.map((member: any) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3"
                      >
                        <Checkbox
                          checked={selectedInvitees.has(member._id)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedInvitees);
                            if (checked) {
                              next.add(member._id);
                            } else {
                              next.delete(member._id);
                            }
                            setSelectedInvitees(next);
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.role} — {member.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteMembers}
                  disabled={inviting || selectedInvitees.size === 0}
                >
                  {inviting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Invite {selectedInvitees.size > 0
                        ? `(${selectedInvitees.size})`
                        : ""}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
