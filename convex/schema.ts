import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const setlistStatus = v.union(
  v.literal("draft"),
  v.literal("finalised"),
  v.literal("archived")
);

export default defineSchema({
  bands: defineTable({
    name: v.string(),
    slug: v.string(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_slug", ["slug"])
    .index("by_archivedAt", ["archivedAt"]),

  songs: defineTable({
    bandId: v.id("bands"),
    title: v.string(),
    artist: v.string(),
    vocalIntensity: v.number(), // 1-5
    energyLevel: v.number(), // 1-5
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
