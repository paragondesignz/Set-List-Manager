"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useBandBySlug,
  useSetlistsList,
  useMemberSetlistsList,
  useArchiveSetlist,
  useDuplicateSetlist
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
  Copy,
  Archive,
  ArchiveRestore,
  Calendar,
  ListMusic,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

export default function SetlistsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bandSlug = params.bandSlug as string;
  const { isMember, token: memberToken } = useMemberAuth();
  const band = useBandBySlug(isMember ? null : bandSlug);

  // Read initial tab from URL param if present
  const statusParam = searchParams.get("status");
  const initialTab = statusParam === "draft" || statusParam === "finalised" ? statusParam : "all";
  const [tab, setTab] = useState<"draft" | "finalised" | "all">(initialTab);
  const [page, setPage] = useState(0);

  // Use member query or admin query depending on auth mode
  const adminSetlists = useSetlistsList(
    !isMember && band
      ? {
          bandId: band._id,
          includeArchived: tab === "all",
          status: tab === "all" ? undefined : tab
        }
      : { bandId: "" }
  );
  const memberSetlists = useMemberSetlistsList(
    isMember ? memberToken : null
  );
  // Members only see finalised setlists (no tabs)
  const setlists = isMember ? memberSetlists : adminSetlists;

  const archiveSetlist = useArchiveSetlist();
  const duplicateSetlist = useDuplicateSetlist();

  if (!isMember && !band) return null;

  // Pagination
  const totalSetlists = setlists?.length ?? 0;
  const totalPages = Math.ceil(totalSetlists / PAGE_SIZE);
  const paginatedSetlists = setlists?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];

  // Reset page when tab changes
  const handleTabChange = (value: string) => {
    setTab(value as any);
    setPage(0);
  };

  const handleArchive = async (setlistId: string, archived: boolean) => {
    try {
      await archiveSetlist({ setlistId: setlistId as any, archived });
      toast.success(archived ? "Setlist archived" : "Setlist restored");
    } catch (e: any) {
      toast.error("Failed to update setlist", { description: e?.message });
    }
  };

  const handleDuplicate = async (setlistId: string) => {
    try {
      await duplicateSetlist({ setlistId: setlistId as any });
      toast.success("Setlist duplicated");
    } catch (e: any) {
      toast.error("Failed to duplicate setlist", { description: e?.message });
    }
  };

  const statusBadge = (status: string, archivedAt?: number) => {
    if (archivedAt) {
      return <Badge variant="outline">Archived</Badge>;
    }
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "finalised":
        return <Badge variant="default">Finalised</Badge>;
      default:
        return null;
    }
  };

  const renderSetlists = () => {
    if (setlists === undefined) {
      return (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      );
    }

    if (setlists.length === 0) {
      return (
        <div className="rounded-lg border border-white/50 glass-subtle p-12 text-center">
          <ListMusic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No setlists yet</p>
          <Button asChild>
            <Link href={`/${bandSlug}/setlists/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first setlist
            </Link>
          </Button>
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
              <TableHead className="w-20 text-center">Sets</TableHead>
              <TableHead className="w-24">Status</TableHead>
              {!isMember && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSetlists.map((setlist) => (
              <TableRow
                key={setlist._id}
                className={setlist.archivedAt ? "opacity-50" : ""}
              >
                <TableCell>
                  <Link
                    href={`/${bandSlug}/setlists/${setlist._id}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {setlist.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {setlist.gigDate ? (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(setlist.gigDate).toLocaleDateString()}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {setlist.setsConfig.length}
                </TableCell>
                <TableCell>
                  {statusBadge(setlist.status, setlist.archivedAt)}
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
                          <Link href={`/${bandSlug}/setlists/${setlist._id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            View / Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/${bandSlug}/setlists/${setlist._id}/builder`}>
                            <ListMusic className="h-4 w-4 mr-2" />
                            Open Builder
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(setlist._id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleArchive(setlist._id, !setlist.archivedAt)
                          }
                        >
                          {setlist.archivedAt ? (
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
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalSetlists)} of {totalSetlists}
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
          <h1 className="text-xl font-semibold tracking-tight">
            Setlists
          </h1>
          <p className="text-muted-foreground text-sm">
            {totalSetlists} setlist{totalSetlists !== 1 ? "s" : ""}
          </p>
        </div>
        {!isMember && (
          <Button asChild size="sm">
            <Link href={`/${bandSlug}/setlists/new`}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Setlist
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs (admin only — members only see finalised) */}
      {isMember ? (
        <div>{renderSetlists()}</div>
      ) : (
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="finalised">Finalised</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {renderSetlists()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
