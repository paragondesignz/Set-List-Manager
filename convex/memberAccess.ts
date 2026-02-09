import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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

// Dashboard data for member homepage
export const dashboard = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return null;

    const now = Date.now();

    // Upcoming gigs with member's own status
    const allGigs = await ctx.db
      .query("gigs")
      .withIndex("by_bandId", (q: any) => q.eq("bandId", access.band._id))
      .collect();

    const upcomingGigs = allGigs
      .filter(
        (g) =>
          g.date >= now &&
          g.archivedAt === undefined &&
          (g.status === "enquiry" || g.status === "confirmed")
      )
      .sort((a, b) => a.date - b.date);

    const gigsWithStatus = await Promise.all(
      upcomingGigs.map(async (gig) => {
        const gigMembers = await ctx.db
          .query("gigMembers")
          .withIndex("by_gigId", (q: any) => q.eq("gigId", gig._id))
          .collect();

        const myGigMember = gigMembers.find(
          (gm) => gm.memberId === access.member._id
        );

        return {
          _id: gig._id,
          name: gig.name,
          date: gig.date,
          status: gig.status,
          venueName: gig.venueName,
          startTime: gig.startTime,
          myStatus: myGigMember?.status ?? null,
          myGigMemberId: myGigMember?._id ?? null
        };
      })
    );

    // Recent finalized setlists (limit 5)
    const allSetlists = await ctx.db
      .query("setlists")
      .withIndex("by_bandId_archivedAt", (q: any) =>
        q.eq("bandId", access.band._id).eq("archivedAt", undefined)
      )
      .collect();

    const recentSetlists = allSetlists
      .filter((s) => s.status === "finalised")
      .sort((a, b) => {
        if (a.gigDate && b.gigDate) return b.gigDate - a.gigDate;
        if (a.gigDate) return -1;
        if (b.gigDate) return 1;
        return b.createdAt - a.createdAt;
      })
      .slice(0, 5)
      .map((s) => ({
        _id: s._id,
        name: s.name,
        gigDate: s.gigDate,
        status: s.status
      }));

    // Song count
    const allSongs = await ctx.db
      .query("songs")
      .withIndex("by_bandId_archivedAt", (q: any) =>
        q.eq("bandId", access.band._id).eq("archivedAt", undefined)
      )
      .collect();

    // Gigs needing response
    const needsResponse = gigsWithStatus.filter((g) => g.myStatus === "pending");

    return {
      upcomingGigs: gigsWithStatus,
      recentSetlists,
      songCount: allSongs.length,
      needsResponse
    };
  },
});

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

// Get a single setlist (read-only, scoped to member's band, finalised only)
export const getSetlist = query({
  args: { token: v.string(), setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return null;

    const setlist = await ctx.db.get(args.setlistId);
    if (
      !setlist ||
      setlist.bandId !== access.band._id ||
      setlist.archivedAt ||
      setlist.status !== "finalised"
    ) {
      return null;
    }

    return setlist;
  },
});

// Get setlist items with song details (read-only, finalised setlists only)
export const getSetlistItems = query({
  args: { token: v.string(), setlistId: v.id("setlists") },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return [];

    const setlist = await ctx.db.get(args.setlistId);
    if (
      !setlist ||
      setlist.bandId !== access.band._id ||
      setlist.status !== "finalised"
    ) {
      return [];
    }

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

// List gigs for the member's band
export const listGigs = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return [];

    const all = await ctx.db
      .query("gigs")
      .withIndex("by_bandId", (q: any) => q.eq("bandId", access.band._id))
      .collect();

    const gigs = all
      .filter((g) => g.archivedAt === undefined)
      .sort((a, b) => b.date - a.date);

    // Attach member's own status for each gig
    const result = await Promise.all(
      gigs.map(async (gig) => {
        const gigMembers = await ctx.db
          .query("gigMembers")
          .withIndex("by_gigId", (q: any) => q.eq("gigId", gig._id))
          .collect();

        const myGigMember = gigMembers.find(
          (gm) => gm.memberId === access.member._id
        );

        return {
          ...gig,
          myStatus: myGigMember?.status ?? null,
          myGigMemberId: myGigMember?._id ?? null
        };
      })
    );

    return result;
  },
});

// Get a single gig with member's own status
export const getGig = query({
  args: { token: v.string(), gigId: v.id("gigs") },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) return null;

    const gig = await ctx.db.get(args.gigId);
    if (!gig || gig.bandId !== access.band._id || gig.archivedAt) return null;

    const gigMembers = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q: any) => q.eq("gigId", args.gigId))
      .collect();

    const myGigMember = gigMembers.find(
      (gm) => gm.memberId === access.member._id
    );

    // Enrich all members for display
    const enrichedMembers = await Promise.all(
      gigMembers.map(async (gm) => {
        const member = await ctx.db.get(gm.memberId);
        return {
          ...gm,
          memberName: member?.name ?? "Unknown",
          memberRole: member?.role ?? ""
        };
      })
    );

    return {
      ...gig,
      myStatus: myGigMember?.status ?? null,
      myGigMemberId: myGigMember?._id ?? null,
      members: enrichedMembers.sort((a, b) =>
        a.memberName.localeCompare(b.memberName)
      )
    };
  },
});

// Member responds to a gig (confirm/decline)
export const respondToGig = mutation({
  args: {
    token: v.string(),
    gigId: v.id("gigs"),
    status: v.union(v.literal("confirmed"), v.literal("declined")),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const access = await validateMemberToken(ctx, args.token);
    if (!access) throw new Error("Invalid token");

    const gig = await ctx.db.get(args.gigId);
    if (!gig || gig.bandId !== access.band._id) {
      throw new Error("Gig not found");
    }

    const gigMembers = await ctx.db
      .query("gigMembers")
      .withIndex("by_gigId", (q: any) => q.eq("gigId", args.gigId))
      .collect();

    const myGigMember = gigMembers.find(
      (gm) => gm.memberId === access.member._id
    );

    if (!myGigMember) throw new Error("Not a member of this gig");

    await ctx.db.patch(myGigMember._id, {
      status: args.status,
      note: args.note,
      respondedAt: Date.now()
    });
  },
});
