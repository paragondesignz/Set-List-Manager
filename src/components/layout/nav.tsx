"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
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
      href: `/${bandSlug}`,
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true
    },
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
    <nav className="flex items-center gap-0.5">
      {links.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 backdrop-blur-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
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
