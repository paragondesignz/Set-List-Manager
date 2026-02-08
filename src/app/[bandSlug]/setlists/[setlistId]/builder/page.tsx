"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  useBandBySlug,
  useSetlist,
  useSetlistItems,
  useSongsList,
  useUpdateSetlist
} from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { SetlistBuilder } from "@/components/builder/setlist-builder";
import { ArrowLeft, FileDown, Eye, CalendarIcon } from "lucide-react";
import { toast } from "sonner";

export default function BuilderPage() {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const setlistId = params.setlistId as string;

  const band = useBandBySlug(bandSlug);
  const setlist = useSetlist(setlistId);
  const items = useSetlistItems(setlistId);
  const songs = useSongsList(band ? { bandId: band._id } : null);
  const updateSetlist = useUpdateSetlist();

  const handleDateChange = async (date: Date | undefined) => {
    try {
      await updateSetlist({
        setlistId: setlistId as any,
        patch: {
          gigDate: date ? date.getTime() : undefined
        }
      });
      toast.success(date ? "Gig date updated" : "Gig date cleared");
    } catch (e: any) {
      toast.error("Failed to update date", { description: e?.message });
    }
  };

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

  return (
    <div className="w-full px-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/${bandSlug}/setlists/${setlistId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {setlist.name}
            </h1>
            <p className="text-muted-foreground text-sm">Setlist Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`min-w-[140px] justify-start text-left font-normal ${
                  !setlist.gigDate && "text-muted-foreground"
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {setlist.gigDate
                  ? format(new Date(setlist.gigDate), "MMM d, yyyy")
                  : "Set gig date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={setlist.gigDate ? new Date(setlist.gigDate) : undefined}
                onSelect={handleDateChange}
                initialFocus
              />
              {setlist.gigDate && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => handleDateChange(undefined)}
                  >
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/${bandSlug}/setlists/${setlistId}`}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${bandSlug}/setlists/${setlistId}/export`}>
              <FileDown className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Link>
          </Button>
        </div>
      </div>

      {/* Builder */}
      <SetlistBuilder
        setlistId={setlistId}
        bandId={band._id}
        setsConfig={setlist.setsConfig}
        songs={songs}
        items={items}
      />
    </div>
  );
}
