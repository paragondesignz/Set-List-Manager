"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { MemberAuthProvider } from "@/hooks/useMemberAuth";

// Use a placeholder URL for build time when env var is not set
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";

export function Providers({ children }: { children: ReactNode }) {
  const [convex] = useState(() => new ConvexReactClient(CONVEX_URL));

  // Show warning in dev if URL is not configured
  if (!process.env.NEXT_PUBLIC_CONVEX_URL && typeof window !== "undefined") {
    console.warn(
      "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` and add the URL to .env.local"
    );
  }

  return (
    <ConvexAuthNextjsProvider client={convex}>
      <MemberAuthProvider>
        {children}
      </MemberAuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "oklch(0.12 0 0)",
            border: "1px solid oklch(0.25 0 0)",
            color: "oklch(0.98 0 0)"
          }
        }}
      />
    </ConvexAuthNextjsProvider>
  );
}
