import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeForDedup, normalizeForDedupTight } from "./_utils/normalize";

const tagValues = v.array(v.string());

export const get = query({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.songId);
  }
});

export const list = query({
  args: {
    bandId: v.id("bands"),
    includeArchived: v.optional(v.boolean()),
    search: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    minVocalIntensity: v.optional(v.number()),
    maxVocalIntensity: v.optional(v.number()),
    minEnergyLevel: v.optional(v.number()),
    maxEnergyLevel: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const includeArchived = args.includeArchived ?? false;
    const search = (args.search ?? "").trim().toLowerCase();
    const filterTags = args.tags ?? [];

    const all = await ctx.db
      .query("songs")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    return all
      .filter((s) => (includeArchived ? true : s.archivedAt === undefined))
      .filter((s) => {
        if (!search) return true;
        return (
          s.title.toLowerCase().includes(search) ||
          s.artist.toLowerCase().includes(search)
        );
      })
      .filter((s) => {
        if (filterTags.length === 0) return true;
        return filterTags.some((tag: string) => s.tags.includes(tag));
      })
      .filter((s) => {
        if (args.minVocalIntensity !== undefined && s.vocalIntensity < args.minVocalIntensity) return false;
        if (args.maxVocalIntensity !== undefined && s.vocalIntensity > args.maxVocalIntensity) return false;
        return true;
      })
      .filter((s) => {
        if (args.minEnergyLevel !== undefined && s.energyLevel < args.minEnergyLevel) return false;
        if (args.maxEnergyLevel !== undefined && s.energyLevel > args.maxEnergyLevel) return false;
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }
});

export const create = mutation({
  args: {
    bandId: v.id("bands"),
    title: v.string(),
    artist: v.string(),
    vocalIntensity: v.number(),
    energyLevel: v.number(),
    tags: tagValues,
    notes: v.optional(v.string()),
    chartFileId: v.optional(v.id("_storage")),
    youtubeUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedTitle = normalizeForDedup(args.title);
    const normalizedArtist = normalizeForDedup(args.artist);
    const tightKey = `${normalizeForDedupTight(args.title)}|${normalizeForDedupTight(args.artist)}`;

    // Check for duplicates within this band
    const existing = await ctx.db
      .query("songs")
      .withIndex("by_normalizedTitle_normalizedArtist", (q) =>
        q.eq("normalizedTitle", normalizedTitle).eq("normalizedArtist", normalizedArtist)
      )
      .first();
    if (existing && existing.bandId === args.bandId && existing.archivedAt === undefined) {
      throw new Error("A song with the same title and artist already exists.");
    }

    // Fuzzy duplicate check within this band
    const bandSongs = await ctx.db
      .query("songs")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    const fuzzyDup = bandSongs.find(
      (s) =>
        s.archivedAt === undefined &&
        `${normalizeForDedupTight(s.title)}|${normalizeForDedupTight(s.artist)}` === tightKey
    );
    if (fuzzyDup) {
      throw new Error("A song with the same title and artist already exists.");
    }

    return await ctx.db.insert("songs", {
      bandId: args.bandId,
      title: args.title.trim(),
      artist: args.artist.trim(),
      vocalIntensity: Math.min(5, Math.max(1, args.vocalIntensity)),
      energyLevel: Math.min(5, Math.max(1, args.energyLevel)),
      tags: args.tags,
      notes: args.notes,
      chartFileId: args.chartFileId,
      youtubeUrl: args.youtubeUrl,
      playCount: 0,
      normalizedTitle,
      normalizedArtist,
      createdAt: now,
      updatedAt: now
    });
  }
});

export const update = mutation({
  args: {
    songId: v.id("songs"),
    patch: v.object({
      title: v.optional(v.string()),
      artist: v.optional(v.string()),
      vocalIntensity: v.optional(v.number()),
      energyLevel: v.optional(v.number()),
      tags: v.optional(tagValues),
      notes: v.optional(v.string()),
      chartFileId: v.optional(v.id("_storage")),
      youtubeUrl: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.songId);
    if (!existing) throw new Error("Song not found.");

    const title = (args.patch.title ?? existing.title).trim();
    const artist = (args.patch.artist ?? existing.artist).trim();
    const normalizedTitle = normalizeForDedup(title);
    const normalizedArtist = normalizeForDedup(artist);
    const tightKey = `${normalizeForDedupTight(title)}|${normalizeForDedupTight(artist)}`;

    const dup = await ctx.db
      .query("songs")
      .withIndex("by_normalizedTitle_normalizedArtist", (q) =>
        q.eq("normalizedTitle", normalizedTitle).eq("normalizedArtist", normalizedArtist)
      )
      .first();
    if (dup && dup._id !== args.songId && dup.bandId === existing.bandId && dup.archivedAt === undefined) {
      throw new Error("Updating would create a duplicate (same title and artist).");
    }

    // Fuzzy duplicate check within this band
    const bandSongs = await ctx.db
      .query("songs")
      .withIndex("by_bandId", (q) => q.eq("bandId", existing.bandId))
      .collect();

    const fuzzyDup = bandSongs.find(
      (s) =>
        s._id !== args.songId &&
        s.archivedAt === undefined &&
        `${normalizeForDedupTight(s.title)}|${normalizeForDedupTight(s.artist)}` === tightKey
    );
    if (fuzzyDup) {
      throw new Error("Updating would create a duplicate (same title and artist).");
    }

    const update: Record<string, unknown> = {
      normalizedTitle,
      normalizedArtist,
      updatedAt: Date.now()
    };

    if (args.patch.title !== undefined) update.title = title;
    if (args.patch.artist !== undefined) update.artist = artist;
    if (args.patch.vocalIntensity !== undefined) {
      update.vocalIntensity = Math.min(5, Math.max(1, args.patch.vocalIntensity));
    }
    if (args.patch.energyLevel !== undefined) {
      update.energyLevel = Math.min(5, Math.max(1, args.patch.energyLevel));
    }
    if (args.patch.tags !== undefined) update.tags = args.patch.tags;
    if (args.patch.notes !== undefined) update.notes = args.patch.notes;
    if (args.patch.chartFileId !== undefined) update.chartFileId = args.patch.chartFileId;
    if (args.patch.youtubeUrl !== undefined) update.youtubeUrl = args.patch.youtubeUrl;

    await ctx.db.patch(args.songId, update);
  }
});

export const archive = mutation({
  args: { songId: v.id("songs"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.songId);
    if (!existing) throw new Error("Song not found.");
    await ctx.db.patch(args.songId, {
      archivedAt: args.archived ? Date.now() : undefined,
      updatedAt: Date.now()
    });
  }
});

export const bulkArchive = mutation({
  args: {
    songIds: v.array(v.id("songs")),
    archived: v.boolean()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const songId of args.songIds) {
      const existing = await ctx.db.get(songId);
      if (existing) {
        await ctx.db.patch(songId, {
          archivedAt: args.archived ? now : undefined,
          updatedAt: now
        });
      }
    }
  }
});

export const bulkUpdateTags = mutation({
  args: {
    songIds: v.array(v.id("songs")),
    addTags: v.optional(v.array(v.string())),
    removeTags: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const songId of args.songIds) {
      const existing = await ctx.db.get(songId);
      if (existing) {
        let tags = [...existing.tags];
        if (args.addTags) {
          for (const tag of args.addTags) {
            if (!tags.includes(tag)) tags.push(tag);
          }
        }
        if (args.removeTags) {
          tags = tags.filter((t) => !args.removeTags!.includes(t));
        }
        await ctx.db.patch(songId, {
          tags,
          updatedAt: now
        });
      }
    }
  }
});

export const remove = mutation({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    // Remove from any setlists first
    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_songId", (q) => q.eq("songId", args.songId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.songId);
  }
});

export const incrementPlayCount = mutation({
  args: { songId: v.id("songs") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.songId);
    if (!existing) throw new Error("Song not found.");
    await ctx.db.patch(args.songId, {
      playCount: existing.playCount + 1,
      lastPlayedAt: Date.now(),
      updatedAt: Date.now()
    });
  }
});

export const bulkImport = mutation({
  args: {
    bandId: v.id("bands"),
    songs: v.array(
      v.object({
        title: v.string(),
        artist: v.optional(v.string()),
        vocalIntensity: v.optional(v.number()),
        energyLevel: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        notes: v.optional(v.string()),
        youtubeUrl: v.optional(v.string())
      })
    )
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: Array<{
      status: "inserted" | "duplicate" | "skipped";
      title: string;
      artist: string;
      id?: string;
      reason?: string;
    }> = [];

    // Build duplicate lookup sets once for this batch.
    const bandSongs = await ctx.db
      .query("songs")
      .withIndex("by_bandId", (q) => q.eq("bandId", args.bandId))
      .collect();

    const existingLoose = new Set<string>();
    const existingTight = new Set<string>();
    for (const s of bandSongs) {
      if (s.archivedAt !== undefined) continue;
      existingLoose.add(`${normalizeForDedup(s.title)}|${normalizeForDedup(s.artist)}`);
      existingTight.add(
        `${normalizeForDedupTight(s.title)}|${normalizeForDedupTight(s.artist)}`
      );
    }
    const batchTight = new Set<string>();

    for (const s of args.songs) {
      const title = s.title.trim();
      const artist = (s.artist ?? "").trim();
      if (!title) {
        results.push({
          status: "skipped",
          title: "",
          artist,
          reason: "Missing title"
        });
        continue;
      }

      const normalizedTitle = normalizeForDedup(title);
      const normalizedArtist = normalizeForDedup(artist);
      const looseKey = `${normalizedTitle}|${normalizedArtist}`;
      const tightKey = `${normalizeForDedupTight(title)}|${normalizeForDedupTight(artist)}`;

      if (existingLoose.has(looseKey) || existingTight.has(tightKey) || batchTight.has(tightKey)) {
        results.push({ status: "duplicate", title, artist });
        continue;
      }

      const insertedId = await ctx.db.insert("songs", {
        bandId: args.bandId,
        title,
        artist,
        vocalIntensity: s.vocalIntensity ?? 3,
        energyLevel: s.energyLevel ?? 3,
        tags: s.tags ?? [],
        notes: s.notes,
        youtubeUrl: s.youtubeUrl,
        playCount: 0,
        normalizedTitle,
        normalizedArtist,
        createdAt: now,
        updatedAt: now
      });

      results.push({
        status: "inserted",
        title,
        artist,
        id: insertedId
      });

      existingLoose.add(looseKey);
      existingTight.add(tightKey);
      batchTight.add(tightKey);
    }

    return results;
  }
});
