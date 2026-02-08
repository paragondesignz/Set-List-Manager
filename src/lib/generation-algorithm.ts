/**
 * Smart Setlist Generation Algorithm
 *
 * Rules:
 * - Vocal pacing: Max 2 high-intensity (4-5) songs in a row
 * - Energy curve: Follows selected flow preset
 * - Freshness: Weight toward songs not played recently
 * - Pinned songs: Respect user-locked positions
 * - Excluded songs: Skip songs marked as excluded
 * - Tags: Respect opener/closer tags for first/last positions
 */

export type Song = {
  _id: string;
  title: string;
  artist: string;
  vocalIntensity: number; // 1-5
  energyLevel: number; // 1-5
  tags: string[];
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

export type FlowPreset =
  | "clo"           // Clo's Flare Bar pattern
  | "steady-build"  // Traditional build across the night
  | "party-starter" // High energy from the start
  | "dinner-dancing"// Background → dance floor
  | "vocal-saver"   // Preserves voice with strategic pacing
  | "classic";      // Original algorithm

export type GenerationOptions = {
  songs: Song[];
  setsConfig: SetConfig[];
  pinnedSlots: PinnedSlot[];
  excludedSongIds: string[];
  flowPreset?: FlowPreset;
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

// Flow preset descriptions for UI
export const FLOW_PRESETS: Record<FlowPreset, { name: string; description: string }> = {
  clo: {
    name: "Clo's Flow",
    description: "Jazz opener → Soul groove → Party peak with ballad closer"
  },
  "steady-build": {
    name: "Steady Build",
    description: "Gradual energy increase across the entire night"
  },
  "party-starter": {
    name: "Party Starter",
    description: "High energy from the start, maintains momentum"
  },
  "dinner-dancing": {
    name: "Dinner to Dancing",
    description: "Background music early, dance floor energy later"
  },
  "vocal-saver": {
    name: "Vocal Saver",
    description: "Strategic pacing to preserve your voice all night"
  },
  classic: {
    name: "Classic",
    description: "Each set builds independently"
  }
};

/**
 * Get target energy for a position based on flow preset
 *
 * @param preset - The flow preset
 * @param setIndex - Which set (1, 2, 3, etc.)
 * @param positionRatio - Position within set (0 = start, 1 = end)
 * @param totalSets - Total number of sets
 * @param isLastPosition - Whether this is the final song of the set
 */
function getTargetEnergy(
  preset: FlowPreset,
  setIndex: number,
  positionRatio: number,
  totalSets: number,
  isLastPosition: boolean
): number {
  const isLastSet = setIndex === totalSets;
  const isFirstSet = setIndex === 1;

  switch (preset) {
    case "clo":
      // Clo's Flare Bar pattern:
      // Set 1: Jazz - very mellow (1.5 → 2.5)
      // Set 2: Soul - moderate groove (3 → 4)
      // Set 3: Party - build to peak, ballad closer (3 → 5 → 2)
      if (isFirstSet) {
        return 1.5 + positionRatio * 1;
      }
      if (setIndex === 2) {
        return 3 + positionRatio * 1;
      }
      // Last set - peak at 70%, then drop for ballad closer
      if (isLastSet) {
        if (isLastPosition) return 2; // Ballad closer
        const peak = 0.7;
        if (positionRatio < peak) {
          return 3 + (positionRatio / peak) * 2; // 3 → 5
        }
        return 5 - ((positionRatio - peak) / (1 - peak)) * 1; // 5 → 4
      }
      return 3.5; // Middle sets if more than 3

    case "steady-build":
      // Build across the entire night
      // Set 1: 2 → 3, Set 2: 3 → 4, Set 3: 4 → 5
      const setProgress = (setIndex - 1) / Math.max(1, totalSets - 1);
      const baseEnergy = 2 + setProgress * 2; // 2 → 4 across sets
      return baseEnergy + positionRatio * 1; // +1 within each set

    case "party-starter":
      // High energy throughout, slight build
      // Set 1: 3.5 → 4.5, Set 2: 4 → 5, Set 3: 4.5 → 5
      if (isFirstSet) {
        return 3.5 + positionRatio * 1;
      }
      if (isLastSet) {
        return 4.5 + positionRatio * 0.5;
      }
      return 4 + positionRatio * 1;

    case "dinner-dancing":
      // Very mellow early, dance floor later
      // Set 1: 1.5 → 2 (background), Set 2: 2.5 → 3.5 (transition), Set 3: 4 → 5 (dance)
      if (isFirstSet) {
        return 1.5 + positionRatio * 0.5;
      }
      if (setIndex === 2) {
        return 2.5 + positionRatio * 1;
      }
      if (isLastSet) {
        return 4 + positionRatio * 1;
      }
      // Interpolate for sets in between
      const progress = setIndex / totalSets;
      return 2 + progress * 3;

    case "vocal-saver":
      // Alternating pattern to preserve voice
      // Uses position to create waves of intensity
      // Overall moderate (3-4) with strategic peaks
      const wave = Math.sin(positionRatio * Math.PI * 2) * 0.5;
      const setBonus = (setIndex - 1) * 0.3;
      const base = 3 + setBonus + wave;
      // Keep in bounds
      return Math.max(2, Math.min(5, base));

    case "classic":
    default:
      // Original algorithm
      if (setIndex === 1) {
        return 3 + positionRatio;
      }
      if (setIndex === 2) {
        return 4;
      }
      // Set 3+: Peak at 60%, then come down
      const peak = 0.6;
      if (positionRatio < peak) {
        return 4 + (positionRatio / peak);
      }
      return 5 - ((positionRatio - peak) / (1 - peak));
  }
}

/**
 * Get target vocal intensity for a position
 * Some presets have specific vocal pacing requirements
 */
function getTargetVocalIntensity(
  preset: FlowPreset,
  setIndex: number,
  positionRatio: number,
  totalSets: number
): number | null {
  // Return null to use default behavior (just avoid 3 high in a row)
  // Return a number to target specific intensity

  switch (preset) {
    case "clo":
      // Set 1: Light vocals (2-3)
      if (setIndex === 1) {
        return 2 + positionRatio * 0.5;
      }
      return null; // Default for other sets

    case "vocal-saver":
      // Keep moderate throughout, peak mid-set
      const wave = Math.sin(positionRatio * Math.PI);
      return 2.5 + wave * 1.5;

    case "dinner-dancing":
      // Very light early
      if (setIndex === 1) {
        return 2;
      }
      return null;

    default:
      return null;
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
  totalSets: number,
  previousSongs: Song[],
  now: number,
  preset: FlowPreset
): number {
  const positionRatio = totalPositions > 1 ? position / (totalPositions - 1) : 0;
  const isFirstPosition = position === 0;
  const isLastPosition = position === totalPositions - 1;
  const isFirstSet = setIndex === 1;
  const isLastSet = setIndex === totalSets;

  const targetEnergy = getTargetEnergy(preset, setIndex, positionRatio, totalSets, isLastPosition);
  const targetVocal = getTargetVocalIntensity(preset, setIndex, positionRatio, totalSets);

  let score = 100;

  // Energy match (0-40 points penalty)
  const energyDiff = Math.abs(song.energyLevel - targetEnergy);
  score -= energyDiff * 10;

  // Vocal intensity targeting if preset specifies it
  if (targetVocal !== null) {
    const vocalDiff = Math.abs(song.vocalIntensity - targetVocal);
    score -= vocalDiff * 8;
  }

  // Vocal intensity pacing - avoid 3 high in a row (0-30 penalty)
  const highIntensitySongs = previousSongs.slice(-2).filter((s) => s.vocalIntensity >= 4);
  if (song.vocalIntensity >= 4 && highIntensitySongs.length >= 2) {
    score -= 30;
  }

  // Tag bonuses for opener/closer positions
  if (isFirstPosition && isFirstSet && song.tags.includes("opener")) {
    score += 25; // Strong bonus for openers in first position of first set
  }
  if (isFirstPosition && song.tags.includes("opener")) {
    score += 10; // Smaller bonus for set openers
  }
  if (isLastPosition && isLastSet && song.tags.includes("closer")) {
    score += 25; // Strong bonus for closers in last position of last set
  }
  if (isLastPosition && song.tags.includes("closer")) {
    score += 10; // Smaller bonus for set closers
  }

  // Bonus for ballads at the end of last set (Clo's pattern)
  if (preset === "clo" && isLastSet && isLastPosition && song.tags.includes("ballad")) {
    score += 20;
  }

  // Penalty for party songs in first set for mellow presets
  if ((preset === "clo" || preset === "dinner-dancing") && isFirstSet && song.tags.includes("party")) {
    score -= 15;
  }

  // Bonus for jazz songs in first set for Clo's preset
  if (preset === "clo" && isFirstSet && song.tags.includes("jazz")) {
    score += 15;
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
  const { songs, setsConfig, pinnedSlots, excludedSongIds, flowPreset = "classic" } = options;
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
  const totalSets = sortedSets.length;

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
          totalSets,
          previousSongs,
          now,
          flowPreset
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
