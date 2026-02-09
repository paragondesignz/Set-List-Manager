"use client";

import Link from "next/link";
import Image from "next/image";
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

export function Header({ band }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Link
            href={band ? `/${band.slug}` : "/dashboard"}
            className="flex items-center"
          >
            <Image src="/logo.webp" alt="Set List Creator" width={120} height={32} />
          </Link>

          {band && (
            <>
              <span className="text-border text-lg select-none">/</span>
              <span className="text-sm font-medium text-muted-foreground">
                {band.name}
              </span>
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
