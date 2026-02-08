import { useMutation, useQuery } from "convex/react";

// We intentionally use string UDF names so the app works even before codegen
// creates `convex/_generated/api`.
const q = (name: string) => name as any;

// ============================================================================
// Users
// ============================================================================

export function useCurrentUser() {
  return useQuery(q("users:currentUser"));
}

// ============================================================================
// Bands
// ============================================================================

export function useBandsList(args?: { includeArchived?: boolean }) {
  return useQuery(q("bands:list"), args ?? {});
}

export function useBand(bandId: string | null) {
  if (!bandId) return useQuery(q("bands:get"), "skip");
  return useQuery(q("bands:get"), { bandId } as any);
}

export function useBandBySlug(slug: string | null) {
  if (!slug) return useQuery(q("bands:getBySlug"), "skip");
  return useQuery(q("bands:getBySlug"), { slug } as any);
}

export function useCreateBand() {
  return useMutation(q("bands:create"));
}

export function useUpdateBand() {
  return useMutation(q("bands:update"));
}

export function useArchiveBand() {
  return useMutation(q("bands:archive"));
}

export function useRemoveBand() {
  return useMutation(q("bands:remove"));
}

// ============================================================================
// Songs
// ============================================================================

export function useSongsList(args: {
  bandId: string;
  includeArchived?: boolean;
  search?: string;
  minVocalIntensity?: number;
  maxVocalIntensity?: number;
  minEnergyLevel?: number;
  maxEnergyLevel?: number;
}) {
  return useQuery(q("songs:list"), args as any);
}

export function useSong(songId: string | null) {
  if (!songId) return useQuery(q("songs:get"), "skip");
  return useQuery(q("songs:get"), { songId } as any);
}

export function useCreateSong() {
  return useMutation(q("songs:create"));
}

export function useUpdateSong() {
  return useMutation(q("songs:update"));
}

export function useArchiveSong() {
  return useMutation(q("songs:archive"));
}

export function useBulkArchiveSongs() {
  return useMutation(q("songs:bulkArchive"));
}

export function useRemoveSong() {
  return useMutation(q("songs:remove"));
}

export function useBulkImportSongs() {
  return useMutation(q("songs:bulkImport"));
}

export function useIncrementPlayCount() {
  return useMutation(q("songs:incrementPlayCount"));
}

// ============================================================================
// Setlists
// ============================================================================

export function useSetlistsList(args: {
  bandId: string;
  includeArchived?: boolean;
  status?: "draft" | "finalised" | "archived";
}) {
  return useQuery(q("setlists:list"), args as any);
}

export function useSetlist(setlistId: string | null) {
  if (!setlistId) return useQuery(q("setlists:get"), "skip");
  return useQuery(q("setlists:get"), { setlistId } as any);
}

export function useCreateSetlist() {
  return useMutation(q("setlists:create"));
}

export function useUpdateSetlist() {
  return useMutation(q("setlists:update"));
}

export function useArchiveSetlist() {
  return useMutation(q("setlists:archive"));
}

export function useFinaliseSetlist() {
  return useMutation(q("setlists:finalise"));
}

export function useDuplicateSetlist() {
  return useMutation(q("setlists:duplicate"));
}

export function useRemoveSetlist() {
  return useMutation(q("setlists:remove"));
}

export function useCreateSetlistFromTemplate() {
  return useMutation(q("setlists:createFromTemplate"));
}

// ============================================================================
// Setlist Items
// ============================================================================

export function useSetlistItems(setlistId: string | null) {
  if (!setlistId) return useQuery(q("setlistItems:listBySetlist"), "skip");
  return useQuery(q("setlistItems:listBySetlist"), { setlistId } as any);
}

export function useAddSetlistSong() {
  return useMutation(q("setlistItems:addSong"));
}

export function useUpdateSetlistItem() {
  return useMutation(q("setlistItems:updateItem"));
}

export function useMoveSetlistItem() {
  return useMutation(q("setlistItems:moveItem"));
}

export function useRemoveSetlistItem() {
  return useMutation(q("setlistItems:removeItem"));
}

export function useClearSet() {
  return useMutation(q("setlistItems:clearSet"));
}

export function useClearAllSets() {
  return useMutation(q("setlistItems:clearAll"));
}

export function useSwapSetlistSong() {
  return useMutation(q("setlistItems:swapSong"));
}

// ============================================================================
// Band Members
// ============================================================================

export function useBandMembersList(args: {
  bandId: string;
  includeArchived?: boolean;
}) {
  return useQuery(q("bandMembers:list"), args as any);
}

export function useBandMember(memberId: string | null) {
  if (!memberId) return useQuery(q("bandMembers:get"), "skip");
  return useQuery(q("bandMembers:get"), { memberId } as any);
}

export function useCreateBandMember() {
  return useMutation(q("bandMembers:create"));
}

export function useUpdateBandMember() {
  return useMutation(q("bandMembers:update"));
}

export function useArchiveBandMember() {
  return useMutation(q("bandMembers:archive"));
}

export function useRemoveBandMember() {
  return useMutation(q("bandMembers:remove"));
}

export function useGenerateMemberAccessToken() {
  return useMutation(q("bandMembers:generateAccessToken"));
}

export function useRevokeMemberAccessToken() {
  return useMutation(q("bandMembers:revokeAccessToken"));
}

export function useMemberByAccessToken(token: string | null) {
  if (!token) return useQuery(q("bandMembers:getByAccessToken"), "skip");
  return useQuery(q("bandMembers:getByAccessToken"), { token } as any);
}

// ============================================================================
// Templates
// ============================================================================

export function useTemplatesList(args: { bandId: string }) {
  return useQuery(q("templates:list"), args as any);
}

export function useTemplate(templateId: string | null) {
  if (!templateId) return useQuery(q("templates:get"), "skip");
  return useQuery(q("templates:get"), { templateId } as any);
}

export function useCreateTemplate() {
  return useMutation(q("templates:create"));
}

export function useUpdateTemplate() {
  return useMutation(q("templates:update"));
}

export function useRemoveTemplate() {
  return useMutation(q("templates:remove"));
}

export function useCreateTemplateFromSetlist() {
  return useMutation(q("templates:createFromSetlist"));
}

// ============================================================================
// Storage
// ============================================================================

export function useGenerateUploadUrl() {
  return useMutation(q("storage:generateUploadUrl"));
}

export function useStorageUrl(storageId: string | null) {
  if (!storageId) return useQuery(q("storage:getUrl"), "skip");
  return useQuery(q("storage:getUrl"), { storageId } as any);
}

export function useDeleteFile() {
  return useMutation(q("storage:deleteFile"));
}

export function useMultipleStorageUrls(storageIds: string[]) {
  if (storageIds.length === 0) return useQuery(q("storage:getMultipleUrls"), "skip");
  return useQuery(q("storage:getMultipleUrls"), { storageIds } as any);
}
