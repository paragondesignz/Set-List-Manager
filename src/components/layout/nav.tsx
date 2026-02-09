"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Music,
  ListMusic,
  Users,
  FileStack,
  Calendar,
  ChevronDown,
  Guitar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type NavProps = {
  bandSlug: string;
};

export function Nav({ bandSlug }: NavProps) {
  const pathname = usePathname();

  const isActive = (paths: string[]) =>
    paths.some((p) => pathname.startsWith(p));

  return (
    <nav className="flex items-center gap-1">
      {/* Bands */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "relative flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors outline-none",
            isActive(["/bands", `/${bandSlug}/members`])
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Guitar className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Bands</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:inline" />
          {isActive(["/bands", `/${bandSlug}/members`]) && (
            <span className="absolute bottom-[-0.6875rem] left-3 right-3 h-0.5 bg-primary rounded-full" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link href="/bands">Manage Bands</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${bandSlug}/members`}>
              <Users className="h-4 w-4 mr-2" />
              Members
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Songs */}
      <Link
        href={`/${bandSlug}/songs`}
        className={cn(
          "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          isActive([`/${bandSlug}/songs`])
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Music className="h-4 w-4 sm:hidden" />
        <span className="hidden sm:inline">Songs</span>
        {isActive([`/${bandSlug}/songs`]) && (
          <span className="absolute bottom-[-0.6875rem] left-3 right-3 h-0.5 bg-primary rounded-full" />
        )}
      </Link>

      {/* Set Lists */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "relative flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors outline-none",
            isActive([`/${bandSlug}/setlists`, `/${bandSlug}/templates`])
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListMusic className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Set Lists</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:inline" />
          {isActive([`/${bandSlug}/setlists`, `/${bandSlug}/templates`]) && (
            <span className="absolute bottom-[-0.6875rem] left-3 right-3 h-0.5 bg-primary rounded-full" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <Link href={`/${bandSlug}/setlists`}>
              <ListMusic className="h-4 w-4 mr-2" />
              Set Lists
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${bandSlug}/templates`}>
              <FileStack className="h-4 w-4 mr-2" />
              Templates
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Gigs */}
      <Link
        href={`/${bandSlug}/gigs`}
        className={cn(
          "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          isActive([`/${bandSlug}/gigs`])
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Calendar className="h-4 w-4 sm:hidden" />
        <span className="hidden sm:inline">Gigs</span>
        {isActive([`/${bandSlug}/gigs`]) && (
          <span className="absolute bottom-[-0.6875rem] left-3 right-3 h-0.5 bg-primary rounded-full" />
        )}
      </Link>
    </nav>
  );
}
