"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";

type Song = {
  _id: string;
  title: string;
  artist: string;
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
  subtitle: {
    fontSize: 12,
    color: "#666"
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "1 solid #333",
    marginBottom: 2
  },
  headerNumber: {
    width: 30,
    fontWeight: "bold",
    color: "#666",
    fontSize: 9,
    textTransform: "uppercase"
  },
  headerTitle: {
    flex: 1,
    fontWeight: "bold",
    color: "#666",
    fontSize: 9,
    textTransform: "uppercase"
  },
  headerArtist: {
    width: 180,
    fontWeight: "bold",
    color: "#666",
    fontSize: 9,
    textTransform: "uppercase"
  },
  songRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottom: "0.5 solid #eee"
  },
  songNumber: {
    width: 30,
    color: "#888"
  },
  songTitle: {
    flex: 1,
    fontWeight: "bold"
  },
  songArtist: {
    width: 180,
    color: "#666",
    fontSize: 10
  }
});

export function SongListPDF({
  bandName,
  songs
}: {
  bandName: string;
  songs: Song[];
}) {
  const sortedSongs = [...songs].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{bandName}</Text>
          <Text style={styles.subtitle}>
            Master Song List — {sortedSongs.length} songs
          </Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.headerNumber}>#</Text>
          <Text style={styles.headerTitle}>Title</Text>
          <Text style={styles.headerArtist}>Artist</Text>
        </View>

        {/* Songs */}
        {sortedSongs.map((song, idx) => (
          <View key={song._id} style={styles.songRow}>
            <Text style={styles.songNumber}>{idx + 1}.</Text>
            <Text style={styles.songTitle}>{song.title}</Text>
            <Text style={styles.songArtist}>{song.artist}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
