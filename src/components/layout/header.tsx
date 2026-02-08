"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Nav } from "./nav";
import { UserMenu } from "./user-menu";

type Band = {
  _id: string;
  name: string;
  slug: string;
};

type HeaderProps = {
  band?: Band | null;
  bands?: Band[];
};

export function Header({ band, bands }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center"
          >
            <Image src="/logo.webp" alt="Set List Creator" width={120} height={32} />
          </Link>

          {band && (
            <>
              <span className="text-border text-lg select-none">/</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-sm h-8">
                    {band.name}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {bands && bands.length > 1 && (
                    <>
                      {bands.map((b) => (
                        <DropdownMenuItem
                          key={b._id}
                          asChild
                          className={b._id === band._id ? "bg-muted" : ""}
                        >
                          <Link href={`/${b.slug}`}>{b.name}</Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/bands">Manage Bands</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {band && <Nav bandSlug={band.slug} />}

        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
