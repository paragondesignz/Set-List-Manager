"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = searchParams.get("next") ?? "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Please enter an access token");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
          className="h-12 bg-card border-border"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive animate-fade-in">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full h-12 font-medium"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-[var(--font-playfair)]">
            Set List Manager
          </h1>
          <p className="text-muted-foreground text-sm">
            Professional setlist management
          </p>
        </div>

        <Suspense fallback={<div className="h-32 animate-pulse" />}>
          <LoginForm />
        </Suspense>

        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-muted-foreground">
            Contact your administrator for access credentials
          </p>
          <p className="text-sm text-muted-foreground">
            Band member?{" "}
            <Link href="/member-login" className="text-primary hover:underline">
              Member login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
