/**
 * Smart Setlist Generation Algorithm
 *
 * Rules:
 * - Vocal pacing: Max 2 high-intensity (4-5) songs in a row
 * - Energy curve: Set 1 builds (3→4), Set 2 grooves (4), Set 3 peaks (4→5→4)
 * - Freshness: Weight toward songs not played recently
 * - Pinned songs: Respect user-locked positions
 * - Excluded songs: Skip songs marked as excluded
 */

export type Song = {
  _id: string;
  title: string;
  artist: string;
  vocalIntensity: number; // 1-5
  energyLevel: number; // 1-5
  playCount: number;
  lastPlayedAt?: number;
};

export type SetConfig = {
  setIndex: number;
  songsPerSet: number;
};

export type PinnedSlot = {
  setIndex: number;
  position: number;
  songId: string;
};

export type GenerationOptions = {
  songs: Song[];
  setsConfig: SetConfig[];
  pinnedSlots: PinnedSlot[];
  excludedSongIds: string[];
};

export type GeneratedSetlist = {
  items: Array<{
    setIndex: number;
    position: number;
    songId: string;
    isPinned: boolean;
  }>;
  warnings: string[];
};

// Energy targets for each set position (normalized 0-1 through set)
function getTargetEnergy(setIndex: number, positionRatio: number): number {
  // Set 1: Build from 3 to 4
  if (setIndex === 1) {
    return 3 + positionRatio;
  }
  // Set 2: Groove at 4
  if (setIndex === 2) {
    return 4;
  }
  // Set 3+: Peak (4 → 5 → 4) - peak at 60%
  const peak = 0.6;
  if (positionRatio < peak) {
    return 4 + (positionRatio / peak);
  } else {
    return 5 - ((positionRatio - peak) / (1 - peak));
  }
}

// Calculate freshness score (higher = should be played more)
function getFreshnessScore(song: Song, now: number): number {
  if (!song.lastPlayedAt) {
    // Never played - high priority
    return 100;
  }

  const daysSincePlayed = (now - song.lastPlayedAt) / (1000 * 60 * 60 * 24);
  const playCountPenalty = Math.min(song.playCount * 2, 30);

  // Base freshness on days since played, penalize high play counts
  return Math.min(100, daysSincePlayed - playCountPenalty);
}

// Score a song for a specific position
function scoreSongForPosition(
  song: Song,
  setIndex: number,
  position: number,
  totalPositions: number,
  previousSongs: Song[],
  now: number
): number {
  const positionRatio = totalPositions > 1 ? position / (totalPositions - 1) : 0;
  const targetEnergy = getTargetEnergy(setIndex, positionRatio);

  let score = 100;

  // Energy match (0-40 points)
  const energyDiff = Math.abs(song.energyLevel - targetEnergy);
  score -= energyDiff * 10;

  // Vocal intensity pacing (0-30 penalty)
  const highIntensitySongs = previousSongs.slice(-2).filter((s) => s.vocalIntensity >= 4);
  if (song.vocalIntensity >= 4 && highIntensitySongs.length >= 2) {
    score -= 30;
  }

  // Freshness bonus (0-20 points)
  const freshnessScore = getFreshnessScore(song, now);
  score += Math.min(20, freshnessScore / 5);

  return score;
}

// Check for pacing violations
function checkPacingViolations(songs: Song[]): string[] {
  const warnings: string[] = [];

  for (let i = 2; i < songs.length; i++) {
    const window = [songs[i - 2], songs[i - 1], songs[i]];
    if (window.every((s) => s.vocalIntensity >= 4)) {
      warnings.push(
        `High vocal intensity: 3 songs in a row (${window.map((s) => s.title).join(", ")})`
      );
    }
  }

  return warnings;
}

// Main generation function
export function generateSetlist(options: GenerationOptions): GeneratedSetlist {
  const { songs, setsConfig, pinnedSlots, excludedSongIds } = options;
  const now = Date.now();

  const result: GeneratedSetlist = {
    items: [],
    warnings: []
  };

  // Build set of excluded and pinned song IDs
  const excludedSet = new Set(excludedSongIds);
  const pinnedSet = new Set(pinnedSlots.map((p) => p.songId));

  // Available songs (not excluded, not pinned)
  let availableSongs = songs.filter(
    (s) => !excludedSet.has(s._id) && !pinnedSet.has(s._id)
  );

  // Sort sets by index
  const sortedSets = [...setsConfig].sort((a, b) => a.setIndex - b.setIndex);

  for (const setConfig of sortedSets) {
    const { setIndex, songsPerSet } = setConfig;
    const setItems: GeneratedSetlist["items"] = [];
    const selectedSongs: Song[] = [];

    // First, place pinned songs
    const setPinnedSlots = pinnedSlots.filter((p) => p.setIndex === setIndex);
    for (const pinned of setPinnedSlots) {
      const song = songs.find((s) => s._id === pinned.songId);
      if (song) {
        setItems.push({
          setIndex,
          position: pinned.position,
          songId: pinned.songId,
          isPinned: true
        });
        // Track selected song at its position
        while (selectedSongs.length <= pinned.position) {
          selectedSongs.push(null as any);
        }
        selectedSongs[pinned.position] = song;
      }
    }

    // Fill remaining positions
    for (let position = 0; position < songsPerSet; position++) {
      // Skip if position is pinned
      if (setItems.some((item) => item.position === position)) {
        continue;
      }

      if (availableSongs.length === 0) {
        result.warnings.push(
          `Set ${setIndex}: Not enough songs available for position ${position + 1}`
        );
        continue;
      }

      // Build list of previously selected songs for pacing check
      const previousSongs = selectedSongs.filter(Boolean).slice(0, position);

      // Score all available songs
      const scored = availableSongs.map((song) => ({
        song,
        score: scoreSongForPosition(
          song,
          setIndex,
          position,
          songsPerSet,
          previousSongs,
          now
        )
      }));

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      // Pick from top 3 for variety (using crypto for randomness)
      const topN = Math.min(3, scored.length);
      const randomBytes = new Uint8Array(1);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(randomBytes);
      } else {
        randomBytes[0] = Math.floor(Math.random() * 256);
      }
      const pickIdx = randomBytes[0] % topN;
      const selected = scored[pickIdx].song;

      setItems.push({
        setIndex,
        position,
        songId: selected._id,
        isPinned: false
      });

      // Track for pacing
      while (selectedSongs.length <= position) {
        selectedSongs.push(null as any);
      }
      selectedSongs[position] = selected;

      // Remove from available
      availableSongs = availableSongs.filter((s) => s._id !== selected._id);
    }

    // Check for pacing violations in this set
    const setSelectedSongs = setItems
      .sort((a, b) => a.position - b.position)
      .map((item) => songs.find((s) => s._id === item.songId))
      .filter(Boolean) as Song[];

    const pacingWarnings = checkPacingViolations(setSelectedSongs);
    for (const warning of pacingWarnings) {
      result.warnings.push(`Set ${setIndex}: ${warning}`);
    }

    result.items.push(...setItems);
  }

  // Sort all items by set index, then position
  result.items.sort((a, b) => {
    if (a.setIndex !== b.setIndex) return a.setIndex - b.setIndex;
    return a.position - b.position;
  });

  return result;
}

// Helper to check if a setlist has pacing violations
export function checkSetlistPacing(
  items: Array<{ songId: string; setIndex: number; position: number }>,
  songs: Song[]
): Map<number, string[]> {
  const warningsBySet = new Map<number, string[]>();

  // Group by set
  const itemsBySet = new Map<number, typeof items>();
  for (const item of items) {
    const arr = itemsBySet.get(item.setIndex) ?? [];
    arr.push(item);
    itemsBySet.set(item.setIndex, arr);
  }

  for (const [setIndex, setItems] of itemsBySet) {
    const sortedItems = [...setItems].sort((a, b) => a.position - b.position);
    const setSongs = sortedItems
      .map((item) => songs.find((s) => s._id === item.songId))
      .filter(Boolean) as Song[];

    const warnings = checkPacingViolations(setSongs);
    if (warnings.length > 0) {
      warningsBySet.set(setIndex, warnings);
    }
  }

  return warningsBySet;
}
