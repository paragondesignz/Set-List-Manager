"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Music,
  ListMusic,
  Users,
  FileStack
} from "lucide-react";

type NavProps = {
  bandSlug: string;
};

export function Nav({ bandSlug }: NavProps) {
  const pathname = usePathname();

  const links = [
    {
      href: `/${bandSlug}/songs`,
      label: "Songs",
      icon: Music
    },
    {
      href: `/${bandSlug}/setlists`,
      label: "Setlists",
      icon: ListMusic
    },
    {
      href: `/${bandSlug}/members`,
      label: "Members",
      icon: Users
    },
    {
      href: `/${bandSlug}/templates`,
      label: "Templates",
      icon: FileStack
    }
  ];

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">{link.label}</span>
            {isActive && (
              <span className="absolute bottom-[-0.6875rem] left-3 right-3 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
