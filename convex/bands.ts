import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const includeArchived = args.includeArchived ?? false;
    const all = await ctx.db.query("bands").collect();
    return all
      .filter((b) => (includeArchived ? true : b.archivedAt === undefined))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
});

export const get = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bandId);
  }
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  }
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) throw new Error("Band name is required");

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (true) {
      const existing = await ctx.db
        .query("bands")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const now = Date.now();
    return await ctx.db.insert("bands", {
      name,
      slug,
      createdAt: now,
      updatedAt: now
    });
  }
});

export const update = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.bandId);
    if (!existing) throw new Error("Band not found");

    const name = args.name.trim();
    if (!name) throw new Error("Band name is required");

    // If name changed significantly, update slug
    const baseSlug = slugify(name);
    let slug = existing.slug;

    if (baseSlug !== slugify(existing.name)) {
      slug = baseSlug;
      let counter = 1;
      while (true) {
        const dup = await ctx.db
          .query("bands")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (!dup || dup._id === args.bandId) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    await ctx.db.patch(args.bandId, {
      name,
      slug,
      updatedAt: Date.now()
    });
  }
});

export const archive = mutation({
  args: { bandId: v.id("bands"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.bandId);
    if (!existing) throw new Error("Band not found");
    await ctx.db.patch(args.bandId, {
      archivedAt: args.archived ? Date.now() : undefined,
      updatedAt: Date.now()
    });
  }
});

export const remove = mutation({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    // Delete all related data
    const songs = await ctx.db
      .query("songs")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    for (const song of songs) {
      await ctx.db.delete(song._id);
    }

    const setlists = await ctx.db
      .query("setlists")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    for (const setlist of setlists) {
      const items = await ctx.db
        .query("setlistItems")
        .withIndex("by_setlistId", (q) => q.eq("setlistId", setlist._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      await ctx.db.delete(setlist._id);
    }

    const members = await ctx.db
      .query("bandMembers")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const templates = await ctx.db
      .query("templates")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    for (const template of templates) {
      await ctx.db.delete(template._id);
    }

    await ctx.db.delete(args.bandId);
  }
});
