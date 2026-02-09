import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const setlistStatus = v.union(
  v.literal("draft"),
  v.literal("finalised"),
  v.literal("archived")
);

const gigStatus = v.union(
  v.literal("enquiry"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled")
);

const gigMemberStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("declined")
);

export default defineSchema({
  ...authTables,

  // Extend the users table with subscription fields
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // Stripe subscription fields
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()), // "trialing" | "active" | "past_due" | "canceled" | "none"
    trialEndsAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  bands: defineTable({
    name: v.string(),
    slug: v.string(),
    userId: v.optional(v.id("users")),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_slug", ["slug"])
    .index("by_archivedAt", ["archivedAt"])
    .index("by_userId", ["userId"]),

  songs: defineTable({
    bandId: v.id("bands"),
    title: v.string(),
    artist: v.string(),
    vocalIntensity: v.number(), // 1-5
    energyLevel: v.number(), // 1-5
    key: v.optional(v.string()), // Musical key (e.g., "Am", "C", "F#m") for Camelot mixing
    tags: v.array(v.string()), // ["opener", "closer", "ballad", etc.]
    notes: v.optional(v.string()),
    chartFileId: v.optional(v.id("_storage")), // PDF/image
    youtubeUrl: v.optional(v.string()),
    playCount: v.number(),
    lastPlayedAt: v.optional(v.number()),

    // Denormalized for search
    normalizedTitle: v.string(),
    normalizedArtist: v.string(),

    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_bandId", ["bandId"])
    .index("by_archivedAt", ["archivedAt"])
    .index("by_bandId_archivedAt", ["bandId", "archivedAt"])
    .index("by_normalizedTitle_normalizedArtist", [
      "normalizedTitle",
      "normalizedArtist"
    ])
    .index("by_lastPlayedAt", ["lastPlayedAt"]),

  setlists: defineTable({
    bandId: v.id("bands"),
    name: v.string(),
    gigDate: v.optional(v.number()),
    status: setlistStatus,
    setsConfig: v.array(
      v.object({
        setIndex: v.number(),
        songsPerSet: v.number()
      })
    ),
    notes: v.optional(v.string()),

    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_bandId", ["bandId"])
    .index("by_status", ["status"])
    .index("by_archivedAt", ["archivedAt"])
    .index("by_bandId_archivedAt", ["bandId", "archivedAt"])
    .index("by_gigDate", ["gigDate"]),

  setlistItems: defineTable({
    setlistId: v.id("setlists"),
    songId: v.id("songs"),
    setIndex: v.number(),
    position: v.number(),
    gigNotes: v.optional(v.string()), // Per-gig notes for this song
    isPinned: v.boolean(), // Pinned songs don't get regenerated
    createdAt: v.number()
  })
    .index("by_setlistId", ["setlistId"])
    .index("by_songId", ["songId"])
    .index("by_setlistId_setIndex_position", ["setlistId", "setIndex", "position"]),

  bandMembers: defineTable({
    bandId: v.id("bands"),
    name: v.string(),
    email: v.string(),
    role: v.string(), // "vocals", "guitar", "drums", etc.
    accessToken: v.optional(v.string()), // For member login access
    archivedAt: v.optional(v.number()),
    createdAt: v.number()
  })
    .index("by_bandId", ["bandId"])
    .index("by_archivedAt", ["archivedAt"])
    .index("by_bandId_archivedAt", ["bandId", "archivedAt"])
    .index("by_accessToken", ["accessToken"]),

  gigs: defineTable({
    bandId: v.id("bands"),
    name: v.string(),
    status: gigStatus,
    date: v.number(),
    loadInTime: v.optional(v.string()),
    soundcheckTime: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    setTimes: v.optional(v.array(v.object({
      setIndex: v.number(),
      time: v.string()
    }))),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    venuePhone: v.optional(v.string()),
    venueEmail: v.optional(v.string()),
    venueNotes: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    dressCode: v.optional(v.string()),
    description: v.optional(v.string()),
    setlistId: v.optional(v.id("setlists")),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_bandId", ["bandId"])
    .index("by_bandId_archivedAt", ["bandId", "archivedAt"])
    .index("by_date", ["date"])
    .index("by_status", ["status"]),

  gigMembers: defineTable({
    gigId: v.id("gigs"),
    memberId: v.id("bandMembers"),
    status: gigMemberStatus,
    note: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    createdAt: v.number()
  })
    .index("by_gigId", ["gigId"])
    .index("by_memberId", ["memberId"]),

  templates: defineTable({
    bandId: v.id("bands"),
    name: v.string(),
    setsConfig: v.array(
      v.object({
        setIndex: v.number(),
        songsPerSet: v.number(),
        pinnedSlots: v.array(
          v.object({
            position: v.number(),
            songId: v.optional(v.id("songs"))
          })
        )
      })
    ),
    createdAt: v.number()
  }).index("by_bandId", ["bandId"])
});
