"use client";

import { useQuery } from "convex/react";

const q = (name: string) => name as any;

export function useSubscription() {
  const user = useQuery(q("users:currentUser"));

  if (user === undefined) {
    return { isLoading: true, isActive: false, isTrial: false, isExpired: false, daysLeft: 0, user: undefined };
  }

  if (user === null) {
    return { isLoading: false, isActive: false, isTrial: false, isExpired: true, daysLeft: 0, user: null };
  }

  const now = Date.now();
  const status = user.subscriptionStatus || "none";
  const trialEndsAt = user.trialEndsAt || 0;
  const currentPeriodEnd = user.currentPeriodEnd || 0;

  const isTrial = status === "trialing" && trialEndsAt > now;
  const isActive = status === "active" || isTrial;
  const isExpired = !isActive;

  let daysLeft = 0;
  if (isTrial) {
    daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));
  } else if (status === "active" && currentPeriodEnd > now) {
    daysLeft = Math.max(0, Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
  }

  return { isLoading: false, isActive, isTrial, isExpired, daysLeft, user };
}
