import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const setsConfigSchema = v.array(
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
);

async function assertBandOwner(ctx: any, bandId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const band = await ctx.db.get(bandId);
  if (!band || band.userId !== userId) throw new Error("Not authorized");
  return userId;
}

export const list = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== userId) return [];

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }
});

export const get = query({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;
    const band = await ctx.db.get(template.bandId);
    if (!band || band.userId !== userId) return null;
    return template;
  }
});

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string(),
    setsConfig: setsConfigSchema
  },
  handler: async (ctx, args) => {
    await assertBandOwner(ctx, args.bandId);

    const now = Date.now();
    return await ctx.db.insert("templates", {
      bandId: args.bandId,
      name: args.name.trim(),
      setsConfig: args.setsConfig,
      createdAt: now
    });
  }
});

export const update = mutation({
  args: {
    templateId: v.id("templates"),
    patch: v.object({
      name: v.optional(v.string()),
      setsConfig: v.optional(setsConfigSchema)
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing) throw new Error("Template not found.");
    await assertBandOwner(ctx, existing.bandId);

    const update: Record<string, unknown> = {};
    if (args.patch.name !== undefined) update.name = args.patch.name.trim();
    if (args.patch.setsConfig !== undefined) update.setsConfig = args.patch.setsConfig;

    if (Object.keys(update).length > 0) {
      await ctx.db.patch(args.templateId, update);
    }
  }
});

export const remove = mutation({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing) throw new Error("Template not found.");
    await assertBandOwner(ctx, existing.bandId);
    await ctx.db.delete(args.templateId);
  }
});

export const createFromSetlist = mutation({
  args: {
    setlistId: v.id("setlists"),
    name: v.string()
  },
  handler: async (ctx, args) => {
    const setlist = await ctx.db.get(args.setlistId);
    if (!setlist) throw new Error("Setlist not found.");
    await assertBandOwner(ctx, setlist.bandId);

    // Get items to capture pinned slots
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q) => q.eq("setlistId", args.setlistId))
      .collect();

    const now = Date.now();
    const setsConfig = setlist.setsConfig.map((config: { setIndex: number; songsPerSet: number }) => {
      const setItems = items.filter((i: { setIndex: number; isPinned: boolean; position: number; songId: string }) => i.setIndex === config.setIndex && i.isPinned);
      return {
        setIndex: config.setIndex,
        songsPerSet: config.songsPerSet,
        pinnedSlots: setItems.map((i) => ({
          position: i.position,
          songId: i.songId
        }))
      };
    });

    return await ctx.db.insert("templates", {
      bandId: setlist.bandId,
      name: args.name.trim(),
      setsConfig,
      createdAt: now
    });
  }
});
