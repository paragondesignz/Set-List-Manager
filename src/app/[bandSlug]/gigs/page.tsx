"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useGigsList,
  useMemberGigsList,
  useArchiveGig,
  useGigMembersList
} from "@/lib/convex";
import { useMemberAuth } from "@/hooks/useMemberAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Archive,
  ArchiveRestore,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

type GigTab = "upcoming" | "past" | "all";

export default function GigsPage() {
  const params = useParams();
  const bandSlug = params.bandSlug as string;
  const { isMember, token: memberToken } = useMemberAuth();
  const band = useBandBySlug(isMember ? null : bandSlug);

  const [tab, setTab] = useState<GigTab>("upcoming");
  const [page, setPage] = useState(0);

  const adminGigs = useGigsList(
    !isMember && band
      ? { bandId: band._id, includeArchived: tab === "all" }
      : null
  );
  const memberGigs = useMemberGigsList(isMember ? memberToken : null);

  const archiveGig = useArchiveGig();

  if (!isMember && !band) return null;

  const rawGigs = isMember ? memberGigs : adminGigs;

  // Filter by tab
  const now = Date.now();
  const filteredGigs = rawGigs?.filter((gig: any) => {
    if (tab === "upcoming") return gig.date >= now && gig.status !== "cancelled" && gig.status !== "completed";
    if (tab === "past") return gig.date < now || gig.status === "completed" || gig.status === "cancelled";
    return true; // all
  }) ?? [];

  // Pagination
  const totalGigs = filteredGigs.length;
  const totalPages = Math.ceil(totalGigs / PAGE_SIZE);
  const paginatedGigs = filteredGigs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleTabChange = (value: string) => {
    setTab(value as GigTab);
    setPage(0);
  };

  const handleArchive = async (gigId: string, archived: boolean) => {
    try {
      await archiveGig({ gigId: gigId as any, archived });
      toast.success(archived ? "Gig archived" : "Gig restored");
    } catch (e: any) {
      toast.error("Failed to update gig", { description: e?.message });
    }
  };

  const statusBadge = (status: string) => {
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
  };

  const renderGigs = () => {
    if (rawGigs === undefined) {
      return (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      );
    }

    if (filteredGigs.length === 0) {
      return (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No gigs yet</p>
          {!isMember && (
            <Button asChild>
              <Link href={`/${bandSlug}/gigs/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first gig
              </Link>
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="hidden sm:table-cell">Venue</TableHead>
              <TableHead className="w-24">Status</TableHead>
              {!isMember && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGigs.map((gig: any) => (
              <TableRow
                key={gig._id}
                className={gig.archivedAt ? "opacity-50" : ""}
              >
                <TableCell>
                  <Link
                    href={`/${bandSlug}/gigs/${gig._id}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {gig.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(gig.date).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {gig.venueName || "—"}
                </TableCell>
                <TableCell>
                  {gig.archivedAt ? (
                    <Badge variant="outline">Archived</Badge>
                  ) : (
                    statusBadge(gig.status)
                  )}
                </TableCell>
                {!isMember && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/${bandSlug}/gigs/${gig._id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            View / Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleArchive(gig._id, !gig.archivedAt)
                          }
                        >
                          {gig.archivedAt ? (
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalGigs)} of {totalGigs}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gigs</h1>
          <p className="text-muted-foreground text-sm">
            {totalGigs} gig{totalGigs !== 1 ? "s" : ""}
          </p>
        </div>
        {!isMember && (
          <Button asChild size="sm">
            <Link href={`/${bandSlug}/gigs/new`}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Gig
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      {isMember ? (
        <div>{renderGigs()}</div>
      ) : (
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {renderGigs()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
