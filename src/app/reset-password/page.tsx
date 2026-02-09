"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const q = (name: string) => name as any;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const resetPassword = useAction(q("users:resetPasswordWithToken"));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in bg-card rounded-2xl p-8 border border-border shadow-lg text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Image src="/logo.webp" alt="Set List Creator" width={200} height={56} />
          </div>
          <p className="text-sm text-muted-foreground">
            Invalid reset link. Please request a new one.
          </p>
          <Button asChild className="w-full h-12">
            <Link href="/forgot-password">Request New Link</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, email, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in bg-card rounded-2xl p-8 border border-border shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo.webp" alt="Set List Creator" width={200} height={56} />
          </div>
          <p className="text-muted-foreground text-sm">Set a new password</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Your password has been reset successfully.
            </p>
            <Button asChild className="w-full h-12 font-medium">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="h-12"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12"
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
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-primary hover:underline"
              >
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
