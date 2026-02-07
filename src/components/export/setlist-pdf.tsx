"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";
import {
  VOCAL_INTENSITY_SHORT,
  ENERGY_LEVEL_SHORT
} from "@/lib/song-labels";

type Song = {
  _id: string;
  title: string;
  artist: string;
  vocalIntensity: number;
  energyLevel: number;
};

type SetConfig = {
  setIndex: number;
  songsPerSet: number;
};

type Setlist = {
  name: string;
  gigDate?: number;
  notes?: string;
  setsConfig: SetConfig[];
};

type Item = {
  _id: string;
  songId: string;
  setIndex: number;
  position: number;
};

type PdfOptions = {
  showArtist: boolean;
  showIntensity: boolean;
  showEnergy: boolean;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11
  },
  header: {
    marginBottom: 20,
    borderBottom: "1 solid #333",
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4
  },
  date: {
    fontSize: 12,
    color: "#666"
  },
  setContainer: {
    marginBottom: 20
  },
  setTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    padding: 6
  },
  songRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottom: "0.5 solid #eee"
  },
  songNumber: {
    width: 25,
    color: "#888"
  },
  songTitle: {
    flex: 1,
    fontWeight: "bold"
  },
  songArtist: {
    width: 150,
    color: "#666",
    fontSize: 10
  },
  songMeta: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
    color: "#888"
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 4
  },
  notesLabel: {
    fontWeight: "bold",
    marginBottom: 4
  }
});

export function SetlistPDF({
  setlist,
  items,
  songsById,
  options
}: {
  setlist: Setlist;
  items: Item[];
  songsById: Map<string, Song>;
  options: PdfOptions;
}) {
  const sortedSets = setlist.setsConfig
    .slice()
    .sort((a, b) => a.setIndex - b.setIndex);

  // Group items by set
  const itemsBySet = new Map<number, Item[]>();
  for (const config of sortedSets) {
    itemsBySet.set(config.setIndex, []);
  }
  for (const item of items) {
    const arr = itemsBySet.get(item.setIndex) ?? [];
    arr.push(item);
    itemsBySet.set(item.setIndex, arr);
  }
  for (const arr of itemsBySet.values()) {
    arr.sort((a, b) => a.position - b.position);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{setlist.name}</Text>
          {setlist.gigDate && (
            <Text style={styles.date}>
              {new Date(setlist.gigDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </Text>
          )}
        </View>

        {/* Sets */}
        {sortedSets.map((config) => {
          const setItems = itemsBySet.get(config.setIndex) ?? [];
          return (
            <View key={config.setIndex} style={styles.setContainer}>
              <Text style={styles.setTitle}>
                Set {config.setIndex} ({setItems.length} songs)
              </Text>
              {setItems.map((item, idx) => {
                const song = songsById.get(item.songId);
                return (
                  <View key={item._id} style={styles.songRow}>
                    <Text style={styles.songNumber}>{idx + 1}.</Text>
                    <Text style={styles.songTitle}>
                      {song?.title ?? "Unknown"}
                    </Text>
                    {options.showArtist && (
                      <Text style={styles.songArtist}>{song?.artist}</Text>
                    )}
                    {(options.showIntensity || options.showEnergy) && (
                      <Text style={styles.songMeta}>
                        {options.showIntensity && (VOCAL_INTENSITY_SHORT[song?.vocalIntensity ?? 3] ?? "Mod")}
                        {options.showIntensity && options.showEnergy && " / "}
                        {options.showEnergy && (ENERGY_LEVEL_SHORT[song?.energyLevel ?? 3] ?? "Mod")}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Notes */}
        {setlist.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text>{setlist.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
