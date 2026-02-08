import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const setlistStatus = v.union(
  v.literal("draft"),
  v.literal("finalised"),
  v.literal("archived")
);

const setsConfigSchema = v.array(
  v.object({
    setIndex: v.number(),
    songsPerSet: v.number()
  })
);

async function assertBandOwner(ctx: any, bandId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const band = await ctx.db.get(bandId);
  if (!band || band.userId !== userId) throw new Error("Not authorized");
  return userId;
}

export const get = query({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const setlist = await ctx.db.get(args.setlistId);
    if (!setlist) return null;
    const band = await ctx.db.get(setlist.bandId);
    if (!band || band.userId !== userId) return null;
    return setlist;
  }
});

export const list = query({
  args: {
    bandId: v.id("bands"),
    includeArchived: v.optional(v.boolean()),
    status: v.optional(setlistStatus)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== userId) return [];

    const includeArchived = args.includeArchived ?? false;

    let results = await ctx.db
      .query("setlists")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    results = results
      .filter((s) => (includeArchived ? true : s.archivedAt === undefined))
      .filter((s) => (args.status ? s.status === args.status : true));

    // Sort by gig date descending, then by createdAt descending
    return results.sort((a, b) => {
      if (a.gigDate && b.gigDate) return b.gigDate - a.gigDate;
      if (a.gigDate) return -1;
      if (b.gigDate) return 1;
      return b.createdAt - a.createdAt;
    });
  }
});

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string(),
    gigDate: v.optional(v.number()),
    setsConfig: setsConfigSchema,
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await assertBandOwner(ctx, args.bandId);

    const now = Date.now();
    return await ctx.db.insert("setlists", {
      bandId: args.bandId,
      name: args.name.trim(),
      gigDate: args.gigDate,
      status: "draft",
      setsConfig: args.setsConfig,
      notes: args.notes,
      createdAt: now,
      updatedAt: now
    });
  }
});

export const update = mutation({
  args: {
    setlistId: v.id("setlists"),
    patch: v.object({
      name: v.optional(v.string()),
      gigDate: v.optional(v.number()),
      setsConfig: v.optional(setsConfigSchema),
      notes: v.optional(v.string()),
      status: v.optional(setlistStatus)
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.setlistId);
    if (!existing) throw new Error("Setlist not found.");
    await assertBandOwner(ctx, existing.bandId);

    const update: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.patch.name !== undefined) update.name = args.patch.name.trim();
    if (args.patch.gigDate !== undefined) update.gigDate = args.patch.gigDate;
    if (args.patch.setsConfig !== undefined) update.setsConfig = args.patch.setsConfig;
    if (args.patch.notes !== undefined) update.notes = args.patch.notes;
    if (args.patch.status !== undefined) update.status = args.patch.status;

    await ctx.db.patch(args.setlistId, update);
  }
});

export const archive = mutation({
  args: { setlistId: v.id("setlists"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.setlistId);
    if (!existing) throw new Error("Setlist not found.");
    await assertBandOwner(ctx, existing.bandId);
    await ctx.db.patch(args.setlistId, {
      archivedAt: args.archived ? Date.now() : undefined,
      status: args.archived ? "archived" : "draft",
      updatedAt: Date.now()
    });
  }
});

export const finalise = mutation({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.setlistId);
    if (!existing) throw new Error("Setlist not found.");
    await assertBandOwner(ctx, existing.bandId);
    await ctx.db.patch(args.setlistId, {
      status: "finalised",
      updatedAt: Date.now()
    });

    // Increment play count for all songs in this setlist
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    const now = Date.now();
    for (const item of items) {
      const song = await ctx.db.get(item.songId);
      if (song) {
        await ctx.db.patch(item.songId, {
          playCount: song.playCount + 1,
          lastPlayedAt: now,
          updatedAt: now
        });
      }
    }
  }
});

export const duplicate = mutation({
  args: { setlistId: v.id("setlists"), newName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.setlistId);
    if (!existing) throw new Error("Setlist not found.");
    await assertBandOwner(ctx, existing.bandId);

    const now = Date.now();
    const name = args.newName?.trim() || `${existing.name} (copy)`;

    const newSetlistId = await ctx.db.insert("setlists", {
      bandId: existing.bandId,
      name,
      gigDate: undefined, // Clear date for copy
      status: "draft",
      setsConfig: existing.setsConfig,
      notes: existing.notes,
      createdAt: now,
      updatedAt: now
    });

    // Copy all items
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    for (const item of items) {
      await ctx.db.insert("setlistItems", {
        setlistId: newSetlistId,
        songId: item.songId,
        setIndex: item.setIndex,
        position: item.position,
        gigNotes: item.gigNotes,
        isPinned: item.isPinned,
        createdAt: now
      });
    }

    return newSetlistId;
  }
});

export const remove = mutation({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.setlistId);
    if (!existing) throw new Error("Setlist not found.");
    await assertBandOwner(ctx, existing.bandId);

    // Delete all items first
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.setlistId);
  }
});

export const removeSet = mutation({
  args: {
    setlistId: v.id("setlists"),
    setIndex: v.number()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.setlistId);
    if (!existing) throw new Error("Setlist not found.");
    await assertBandOwner(ctx, existing.bandId);

    if (existing.setsConfig.length <= 1) {
      throw new Error("Cannot remove the last set.");
    }

    // 1. Delete all items in the removed set
    const allItems = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    const removedSetItems = allItems.filter((i) => i.setIndex === args.setIndex);
    for (const item of removedSetItems) {
      await ctx.db.delete(item._id);
    }

    // 2. Decrement setIndex on items in higher-numbered sets
    const higherItems = allItems.filter((i) => i.setIndex > args.setIndex);
    for (const item of higherItems) {
      await ctx.db.patch(item._id, { setIndex: item.setIndex - 1 });
    }

    // 3. Update setsConfig: remove the set, re-index remaining
    const newConfig = existing.setsConfig
      .filter((c: { setIndex: number; songsPerSet: number }) => c.setIndex !== args.setIndex)
      .map((c: { setIndex: number; songsPerSet: number }, idx: number) => ({
        setIndex: idx + 1,
        songsPerSet: c.songsPerSet
      }));

    await ctx.db.patch(args.setlistId, {
      setsConfig: newConfig,
      updatedAt: Date.now()
    });
  }
});

export const createFromTemplate = mutation({
  args: {
    bandId: v.id("bands"),
    templateId: v.id("templates"),
    name: v.string(),
    gigDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    await assertBandOwner(ctx, args.bandId);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found.");
    if (template.bandId !== args.bandId) throw new Error("Template doesn't belong to this band.");

    const now = Date.now();
    const setlistId = await ctx.db.insert("setlists", {
      bandId: args.bandId,
      name: args.name.trim(),
      gigDate: args.gigDate,
      status: "draft",
      setsConfig: template.setsConfig.map((s: { setIndex: number; songsPerSet: number }) => ({
        setIndex: s.setIndex,
        songsPerSet: s.songsPerSet
      })),
      createdAt: now,
      updatedAt: now
    });

    // Add pinned songs from template
    for (const setConfig of template.setsConfig) {
      for (const pinnedSlot of setConfig.pinnedSlots) {
        if (pinnedSlot.songId) {
          await ctx.db.insert("setlistItems", {
            setlistId,
            songId: pinnedSlot.songId,
            setIndex: setConfig.setIndex,
            position: pinnedSlot.position,
            isPinned: true,
            createdAt: now
          });
        }
      }
    }

    return setlistId;
  }
});
