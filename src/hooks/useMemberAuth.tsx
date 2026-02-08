"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";

const q = (name: string) => name as any;

type MemberSession = {
  member: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  band: {
    _id: string;
    name: string;
    slug: string;
  };
};

type MemberAuthContextValue = {
  isMember: boolean;
  isLoading: boolean;
  token: string | null;
  session: MemberSession | null;
  logout: () => void;
};

const MemberAuthContext = createContext<MemberAuthContextValue>({
  isMember: false,
  isLoading: true,
  token: null,
  session: null,
  logout: () => {},
});

function getMemberToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("clo_member_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

async function clearMemberCookies() {
  // Clear the client-readable cookie immediately
  document.cookie =
    "clo_member_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  // Clear the httpOnly cookie via server endpoint
  try {
    await fetch("/api/auth/member-logout", { method: "POST" });
  } catch {
    // Best-effort
  }
}

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setToken(getMemberToken());
    setMounted(true);
  }, []);

  const session = useQuery(
    q("memberAccess:getMemberSession"),
    token ? { token } : "skip"
  ) as MemberSession | null | undefined;

  const logout = async () => {
    await clearMemberCookies();
    setToken(null);
    window.location.href = "/member-login";
  };

  // If token exists but session came back null, token is invalid
  const isInvalidToken = mounted && token !== null && session === null;

  useEffect(() => {
    if (isInvalidToken) {
      clearMemberCookies().then(() => {
        setToken(null);
        window.location.href = "/member-login";
      });
    }
  }, [isInvalidToken]);

  const value: MemberAuthContextValue = {
    isMember: mounted && token !== null && session !== undefined && session !== null,
    isLoading: !mounted || (token !== null && session === undefined),
    token,
    session: session ?? null,
    logout,
  };

  return (
    <MemberAuthContext.Provider value={value}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  return useContext(MemberAuthContext);
}
