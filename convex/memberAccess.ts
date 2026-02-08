import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Read-only queries for band members.
 * Members authenticate via access token (not Convex Auth).
 * All queries verify the token and scope data to the member's band.
 */

async function validateMemberToken(ctx: any, token: string) {
  const member = await ctx.db
    .query("bandMembers")
    .withIndex("by_accessToken", (q: any) => q.eq("accessToken", token))
    .first();

  if (!member || member.archivedAt) return null;

  const band = await ctx.db.get(member.bandId);
  if (!band || band.archivedAt) return null;

  return { member, band };
}

// Get band info + member info for the authenticated member
export const getMemberSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return null;

    return {
      member: {
        _id: access.member._id,
        name: access.member.name,
        email: access.member.email,
        role: access.member.role,
      },
      band: {
        _id: access.band._id,
        name: access.band.name,
        slug: access.band.slug,
      },
    };
  },
});

// List songs for the member's band (read-only)
export const listSongs = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return [];

    const search = (args.search ?? "").trim().toLowerCase();

    const all = await ctx.db
      .query("songs")
      .withIndex("by_bandId_archivedAt", (q: any) =>
        q.eq("bandId", access.band._id).eq("archivedAt", undefined)
      )
      .collect();

    let songs = all;
    if (search) {
      songs = songs.filter(
        (s) =>
          s.title.toLowerCase().includes(search) ||
          s.artist.toLowerCase().includes(search)
      );
    }

    return songs.sort((a, b) => a.title.localeCompare(b.title));
  },
});

// Get a single song (read-only, scoped to member's band)
export const getSong = query({
  args: { token: v.string(), songId: v.id("songs") },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return null;

    const song = await ctx.db.get(args.songId);
    if (!song || song.bandId !== access.band._id || song.archivedAt) return null;

    return song;
  },
});

// List setlists for the member's band (read-only, only finalised)
export const listSetlists = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return [];

    const all = await ctx.db
      .query("setlists")
      .withIndex("by_bandId_archivedAt", (q: any) =>
        q.eq("bandId", access.band._id).eq("archivedAt", undefined)
      )
      .collect();

    // Members only see finalised setlists
    return all
      .filter((s) => s.status === "finalised")
      .sort((a, b) => {
        // Sort by gig date descending, then by name
        if (a.gigDate && b.gigDate) return b.gigDate - a.gigDate;
        if (a.gigDate) return -1;
        if (b.gigDate) return 1;
        return a.name.localeCompare(b.name);
      });
  },
});

// Get a single setlist (read-only, scoped to member's band)
export const getSetlist = query({
  args: { token: v.string(), setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return null;

    const setlist = await ctx.db.get(args.setlistId);
    if (!setlist || setlist.bandId !== access.band._id || setlist.archivedAt) {
      return null;
    }

    return setlist;
  },
});

// Get setlist items with song details (read-only)
export const getSetlistItems = query({
  args: { token: v.string(), setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return [];

    const setlist = await ctx.db.get(args.setlistId);
    if (!setlist || setlist.bandId !== access.band._id) return [];

    const items = await ctx.db
      .query("setlistItems")
      .withIndex("by_setlistId", (q: any) => q.eq("setlistId", args.setlistId))
      .collect();

    return items.sort((a, b) => {
      if (a.setIndex !== b.setIndex) return a.setIndex - b.setIndex;
      return a.position - b.position;
    });
  },
});
