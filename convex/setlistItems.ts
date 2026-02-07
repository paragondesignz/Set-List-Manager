import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listBySetlist = query({
  args: { setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    return items.sort((a, b) => {
      if (a.setIndex !== b.setIndex) return a.setIndex - b.setIndex;
      return a.position - b.position;
    });
  }
});

export const addSong = mutation({
  args: {
    setlistId: v.id("setlists"),
    songId: v.id("songs"),
    setIndex: v.number(),
    position: v.number(),
    gigNotes: v.optional(v.string()),
    isPinned: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing items in this setlist
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    // Check if song already exists in this setlist (any set)
    const existingSong = items.find((i) => i.songId === args.songId);
    if (existingSong) {
      throw new Error("Song is already in this setlist");
    }

    const setItems = items.filter((i) => i.setIndex === args.setIndex);

    // Shift positions for items at or after the insert position
    for (const item of setItems) {
      if (item.position >= args.position) {
        await ctx.db.patch(item._id, {
          position: item.position + 1
        });
      }
    }

    return await ctx.db.insert("setlistItems", {
      setlistId: args.setlistId,
      songId: args.songId,
      setIndex: args.setIndex,
      position: args.position,
      gigNotes: args.gigNotes,
      isPinned: args.isPinned ?? false,
      createdAt: now
    });
  }
});

export const updateItem = mutation({
  args: {
    itemId: v.id("setlistItems"),
    patch: v.object({
      gigNotes: v.optional(v.string()),
      isPinned: v.optional(v.boolean())
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.itemId);
    if (!existing) throw new Error("Item not found.");

    const update: Record<string, unknown> = {};
    if (args.patch.gigNotes !== undefined) update.gigNotes = args.patch.gigNotes;
    if (args.patch.isPinned !== undefined) update.isPinned = args.patch.isPinned;

    if (Object.keys(update).length > 0) {
      await ctx.db.patch(args.itemId, update);
    }
  }
});

export const moveItem = mutation({
  args: {
    itemId: v.id("setlistItems"),
    toSetIndex: v.number(),
    toPosition: v.number()
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found.");

    const fromSetIndex = item.setIndex;
    const fromPosition = item.position;

    // Get all items in this setlist
    const allItems = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", item.setlistId))
      .collect();

    // Moving within same set
    if (fromSetIndex === args.toSetIndex) {
      const setItems = allItems.filter((i) => i.setIndex === fromSetIndex);

      if (fromPosition < args.toPosition) {
        // Moving down: shift items in between up
        for (const i of setItems) {
          if (i._id !== args.itemId && i.position > fromPosition && i.position <= args.toPosition) {
            await ctx.db.patch(i._id, { position: i.position - 1 });
          }
        }
      } else if (fromPosition > args.toPosition) {
        // Moving up: shift items in between down
        for (const i of setItems) {
          if (i._id !== args.itemId && i.position >= args.toPosition && i.position < fromPosition) {
            await ctx.db.patch(i._id, { position: i.position + 1 });
          }
        }
      }

      await ctx.db.patch(args.itemId, { position: args.toPosition });
    } else {
      // Moving between sets
      const fromSetItems = allItems.filter((i) => i.setIndex === fromSetIndex);
      const toSetItems = allItems.filter((i) => i.setIndex === args.toSetIndex);

      // Close gap in source set
      for (const i of fromSetItems) {
        if (i._id !== args.itemId && i.position > fromPosition) {
          await ctx.db.patch(i._id, { position: i.position - 1 });
        }
      }

      // Open gap in target set
      for (const i of toSetItems) {
        if (i.position >= args.toPosition) {
          await ctx.db.patch(i._id, { position: i.position + 1 });
        }
      }

      await ctx.db.patch(args.itemId, {
        setIndex: args.toSetIndex,
        position: args.toPosition
      });
    }
  }
});

export const removeItem = mutation({
  args: { itemId: v.id("setlistItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found.");

    // Get items in same set
    const allItems = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", item.setlistId))
      .collect();

    const setItems = allItems.filter((i) => i.setIndex === item.setIndex);

    // Close gap
    for (const i of setItems) {
      if (i._id !== args.itemId && i.position > item.position) {
        await ctx.db.patch(i._id, { position: i.position - 1 });
      }
    }

    await ctx.db.delete(args.itemId);
  }
});

export const clearSet = mutation({
  args: {
    setlistId: v.id("setlists"),
    setIndex: v.number(),
    keepPinned: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const keepPinned = args.keepPinned ?? false;

    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    const setItems = items.filter((i) => i.setIndex === args.setIndex);

    for (const item of setItems) {
      if (keepPinned && item.isPinned) continue;
      await ctx.db.delete(item._id);
    }

    // Re-number remaining items if keeping pinned
    if (keepPinned) {
      const remaining = setItems
        .filter((i) => i.isPinned)
        .sort((a, b) => a.position - b.position);

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].position !== i) {
          await ctx.db.patch(remaining[i]._id, { position: i });
        }
      }
    }
  }
});

export const clearAll = mutation({
  args: {
    setlistId: v.id("setlists"),
    keepPinned: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const keepPinned = args.keepPinned ?? false;

    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    for (const item of items) {
      if (keepPinned && item.isPinned) continue;
      await ctx.db.delete(item._id);
    }

    // Re-number remaining items if keeping pinned
    if (keepPinned) {
      const remaining = items.filter((i) => i.isPinned);
      const bySet = new Map<number, typeof remaining>();

      for (const item of remaining) {
        const arr = bySet.get(item.setIndex) ?? [];
        arr.push(item);
        bySet.set(item.setIndex, arr);
      }

      for (const setItems of bySet.values()) {
        setItems.sort((a, b) => a.position - b.position);
        for (let i = 0; i < setItems.length; i++) {
          if (setItems[i].position !== i) {
            await ctx.db.patch(setItems[i]._id, { position: i });
          }
        }
      }
    }
  }
});

export const swapSong = mutation({
  args: {
    itemId: v.id("setlistItems"),
    newSongId: v.id("songs")
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.itemId);
    if (!existing) throw new Error("Item not found.");

    // Check if the new song is already in this setlist
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", existing.setlistId))
      .collect();

    const duplicate = items.find(
      (i) => i.songId === args.newSongId && i._id !== args.itemId
    );
    if (duplicate) {
      throw new Error("Song is already in this setlist");
    }

    await ctx.db.patch(args.itemId, {
      songId: args.newSongId
    });
  }
});
