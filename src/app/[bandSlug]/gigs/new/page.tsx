"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBandBySlug, useCreateGig, useSetlistsList } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

export default function NewGigPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);
  const setlists = useSetlistsList(band ? { bandId: band._id } : null);
  const createGig = useCreateGig();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [loadInTime, setLoadInTime] = useState("");
  const [soundcheckTime, setSoundcheckTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venuePhone, setVenuePhone] = useState("");
  const [venueEmail, setVenueEmail] = useState("");
  const [venueNotes, setVenueNotes] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [selectedSetlistId, setSelectedSetlistId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!band) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;

    setLoading(true);
    try {
      const gigId = await createGig({
        bandId: band._id as any,
        name: name.trim(),
        date: new Date(date).getTime(),
        description: description.trim() || undefined,
        loadInTime: loadInTime || undefined,
        soundcheckTime: soundcheckTime || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        venueName: venueName.trim() || undefined,
        venueAddress: venueAddress.trim() || undefined,
        venuePhone: venuePhone.trim() || undefined,
        venueEmail: venueEmail.trim() || undefined,
        venueNotes: venueNotes.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        dressCode: dressCode.trim() || undefined,
        setlistId: selectedSetlistId ? (selectedSetlistId as any) : undefined
      });
      toast.success("Gig created");
      router.push(`/${bandSlug}/gigs/${gigId}`);
    } catch (e: any) {
      toast.error("Failed to create gig", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Create Gig</h1>
        <p className="text-muted-foreground text-sm">
          Add details for your upcoming gig
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-xl">
        {/* Event Details */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Event
          </h2>
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
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              placeholder="Any notes about this gig..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Schedule
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Load-in</label>
              <Input
                type="time"
                value={loadInTime}
                onChange={(e) => setLoadInTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Soundcheck</label>
              <Input
                type="time"
                value={soundcheckTime}
                onChange={(e) => setSoundcheckTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Venue */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Venue
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Venue Name</label>
            <Input
              placeholder="e.g., The Blue Note"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Address</label>
            <Input
              placeholder="123 Main St, Wellington"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone</label>
              <Input
                type="tel"
                placeholder="04 123 4567"
                value={venuePhone}
                onChange={(e) => setVenuePhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="venue@example.com"
                value={venueEmail}
                onChange={(e) => setVenueEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Venue Notes</label>
            <Textarea
              placeholder="Parking, stage access, equipment notes..."
              value={venueNotes}
              onChange={(e) => setVenueNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Contact
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contact Name</label>
            <Input
              placeholder="Event organiser name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone</label>
              <Input
                type="tel"
                placeholder="021 123 4567"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="contact@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Details
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Dress Code</label>
            <Input
              placeholder="e.g., Smart casual, All black"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
            />
          </div>
        </div>

        {/* Setlist */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Linked Setlist
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Setlist (optional)</label>
            <Select
              value={selectedSetlistId || "none"}
              onValueChange={(v) =>
                setSelectedSetlistId(v === "none" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No setlist linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No setlist linked</SelectItem>
                {setlists?.map((sl: any) => (
                  <SelectItem key={sl._id} value={sl._id}>
                    {sl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading || !name.trim() || !date}>
            {loading ? "Creating..." : "Create Gig"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/${bandSlug}/gigs`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
