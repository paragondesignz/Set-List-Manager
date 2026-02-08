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
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <link.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
