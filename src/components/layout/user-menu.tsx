"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUser } from "@/lib/convex";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Settings, LogOut, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function UserAvatar({ name, image }: { name?: string; image?: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name || "User"}
        className="h-7 w-7 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
      {initials}
    </div>
  );
}

export function UserMenu() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useCurrentUser();
  const { isTrial } = useSubscription();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    router.push("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
          <UserAvatar name={user.name} image={user.image} />
          <span className="text-sm max-w-[120px] truncate hidden sm:inline">
            {user.name || user.email || "User"}
          </span>
          {isTrial && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">
              Trial
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isTrial && (
          <DropdownMenuItem asChild>
            <Link href="/subscribe" className="gap-2">
              <Zap className="h-4 w-4" />
              Subscribe
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
