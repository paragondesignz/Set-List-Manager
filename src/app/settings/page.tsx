"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  useCurrentUser,
  useAuthProvider,
  useUpdateProfile,
  useDeleteAccount,
  useChangePassword,
} from "@/lib/convex";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, LogOut, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { UserMenu } from "@/components/layout/user-menu";

// ============================================================================
// Profile Section
// ============================================================================

function ProfileSection() {
  const user = useCurrentUser();
  const providers = useAuthProvider();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const currentName = name ?? user.name ?? "";
  const hasChanged = currentName !== (user.name ?? "");

  const providerLabel = providers?.includes("google")
    ? "Google"
    : providers?.includes("password")
      ? "Email & Password"
      : "Unknown";

  const handleSave = async () => {
    if (!hasChanged || !currentName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: currentName });
      setName(null);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your personal information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="h-16 w-16 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
              {(user.name || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{user.name || "No name set"}</div>
            <div className="text-sm text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <div className="flex gap-2">
            <Input
              id="name"
              value={currentName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <Button onClick={handleSave} disabled={!hasChanged || saving || !currentName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user.email || ""} disabled />
          <p className="text-xs text-muted-foreground">
            Signed in via {providerLabel}. Email cannot be changed here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Subscription Section
// ============================================================================

function SubscriptionSection() {
  const { user, isActive, isTrial, isExpired, daysLeft } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (user === undefined) return null;
  if (user === null) return null;

  const status = user.subscriptionStatus || "none";

  const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" }> = {
    active: { label: "Active", variant: "success" },
    trialing: { label: `Trial (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`, variant: "default" },
    past_due: { label: "Past Due", variant: "warning" },
    canceled: { label: "Canceled", variant: "destructive" },
    none: { label: "No Subscription", variant: "destructive" },
  };

  const config = statusConfig[status] || statusConfig.none;
  if (isExpired && status !== "canceled") {
    config.label = "Expired";
    config.variant = "destructive";
  }

  const handleManageBilling = async () => {
    if (!user.stripeCustomerId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripeCustomerId: user.stripeCustomerId,
          returnUrl: "/settings",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/stripe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, email: user.email }),
      });
      const data = await res.json();
      if (data.status === "active") {
        toast.success("Subscription status updated to active!");
      } else if (data.status === "none") {
        toast.info("No active Stripe subscription found for this email.");
      } else {
        toast.info(`Subscription status: ${data.status}`);
      }
    } catch {
      toast.error("Failed to refresh subscription status");
    } finally {
      setRefreshing(false);
    }
  };

  const periodEnd = user.currentPeriodEnd
    ? new Date(user.currentPeriodEnd).toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription & Billing</CardTitle>
        <CardDescription>Manage your plan and payment details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>

        {isTrial && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Subscribe now to keep your setlists, songs, and templates when your trial ends.
            </p>
            <p className="text-xs text-muted-foreground">
              Already subscribed?{" "}
              <button
                onClick={handleRefreshStatus}
                disabled={refreshing}
                className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                {refreshing ? "Checking..." : "Refresh status"}
              </button>
            </p>
          </div>
        )}

        {periodEnd && (isActive || status === "canceled") && !isTrial && (
          <p className="text-sm text-muted-foreground">
            {status === "canceled"
              ? `Access until ${periodEnd}`
              : `Current billing period ends ${periodEnd}`}
          </p>
        )}

        {user.stripeCustomerId ? (
          <Button onClick={handleManageBilling} disabled={loading} variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            {loading ? "Opening..." : "Manage Subscription"}
          </Button>
        ) : (
          <Button asChild variant={isTrial ? "default" : "outline"} className={isTrial ? "brand-gradient text-white hover:opacity-90" : ""}>
            <Link href="/subscribe">Subscribe</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Password Section
// ============================================================================

function PasswordSection() {
  const providers = useAuthProvider();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (providers === undefined) return null;

  const hasPassword = providers?.includes("password");

  if (!hasPassword) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You signed in with Google. Password management is not available for Google accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleChangePassword = async () => {
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e.data || e.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your account password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current Password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleChangePassword}
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        >
          {saving ? "Changing..." : "Change Password"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Account Section
// ============================================================================

function AccountSection() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useCurrentUser();
  const deleteAccount = useDeleteAccount();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    window.location.href = "/";
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Cancel Stripe subscription if active
      if (user.stripeCustomerId && user.stripeSubscriptionId) {
        try {
          await fetch("/api/stripe/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stripeSubscriptionId: user.stripeSubscriptionId }),
          });
        } catch {
          // Continue with deletion even if Stripe cancel fails
        }
      }

      await deleteAccount();
      await signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  const emailMatches = confirmEmail.toLowerCase() === (user.email || "").toLowerCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Sign out or permanently delete your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-destructive mb-1">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account, all bands, songs, setlists, and members.
                  If you have an active subscription, it will be canceled. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-2">
                <Label htmlFor="confirm-email">
                  Type <span className="font-mono font-semibold">{user.email}</span> to confirm
                </Label>
                <Input
                  id="confirm-email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!emailMatches || deleting}
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Settings Page
// ============================================================================

export default function SettingsPage() {
  const user = useCurrentUser();

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center">
              <Image src="/logo.webp" alt="Set List Creator" width={120} height={32} />
            </Link>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>

        <div className="space-y-6">
          <ProfileSection />
          <SubscriptionSection />
          <PasswordSection />
          <AccountSection />
        </div>
      </div>
    </div>
  );
}
