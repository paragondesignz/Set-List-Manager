"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function MemberLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/member-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Redirect to the band's songs page
      router.push(`/${data.band.slug}/songs`);
      router.refresh();
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Image src="/logo.webp" alt="Set List Creator" width={160} height={44} />
          </div>
          <CardTitle className="text-xl">Band Member Access</CardTitle>
          <CardDescription>
            Enter your access token to view songs and setlists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter your access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoFocus
                autoComplete="off"
                className="text-center font-mono tracking-wider"
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!token.trim() || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Band manager?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Admin login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
