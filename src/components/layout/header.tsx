"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Nav } from "./nav";

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
  const router = useRouter();
  const { signOut } = useAuthActions();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto px-4 h-12 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center"
          >
            <Image src="/logo.webp" alt="Set List Creator" width={120} height={32} />
          </Link>

          {band && (
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
          )}
        </div>

        {band && <Nav bandSlug={band.slug} />}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
