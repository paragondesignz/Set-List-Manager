"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBandBySlug, useBulkImportSongs } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, Music } from "lucide-react";
import { toast } from "sonner";

// Songs extracted from Clo's Flare Bar setlists (2020-2026)
const FLARE_BAR_SONGS = [
  { title: "On The Sunny Side of the Street", artist: "Various (Jazz Standard)", vocalIntensity: 2, energyLevel: 2, tags: ["opener", "jazz"] },
  { title: "My Baby Just Cares For Me", artist: "Nina Simone", vocalIntensity: 2, energyLevel: 2, tags: ["opener", "jazz"] },
  { title: "Love For Sale", artist: "Cole Porter (Jazz Standard)", vocalIntensity: 3, energyLevel: 3, tags: ["opener", "jazz"] },
  { title: "Peel Me A Grape", artist: "Diana Krall", vocalIntensity: 2, energyLevel: 2, tags: ["opener", "jazz"] },
  { title: "Afro Blue", artist: "Mongo Santamaria", vocalIntensity: 3, energyLevel: 3, tags: ["jazz", "latin"] },
  { title: "Smooth Operator", artist: "Sade", vocalIntensity: 2, energyLevel: 2, tags: ["soul"] },
  { title: "They Can't Take That Away From Me", artist: "George Gershwin (Jazz Standard)", vocalIntensity: 2, energyLevel: 2, tags: ["jazz"] },
  { title: "All About That Bass", artist: "Meghan Trainor", vocalIntensity: 3, energyLevel: 4, tags: ["contemporary", "party"] },
  { title: "Stronger Than Me", artist: "Amy Winehouse", vocalIntensity: 4, energyLevel: 3, tags: ["soul"] },
  { title: "All That I Can Say", artist: "Mary J. Blige / Gretchen Parlato", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "Fell In Love With A Boy", artist: "Joss Stone", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "I Can't Give You Anything But Love", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz", "opener"] },
  { title: "Ordinary People", artist: "John Legend", vocalIntensity: 3, energyLevel: 2, tags: ["soul", "ballad"] },
  { title: "You Know I'm No Good", artist: "Amy Winehouse", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "Let's Stay Together", artist: "Al Green", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "I Can't Help It", artist: "Michael Jackson", vocalIntensity: 3, energyLevel: 2, tags: ["soul"] },
  { title: "Teach Me Tonight", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz"] },
  { title: "How Come You Don't Call", artist: "Prince / Alicia Keys", vocalIntensity: 4, energyLevel: 3, tags: ["soul"] },
  { title: "Feel Like Making Love", artist: "Roberta Flack", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "Rock With You", artist: "Michael Jackson", vocalIntensity: 3, energyLevel: 4, tags: ["party", "soul"] },
  { title: "Golden", artist: "Jill Scott", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "Mas Que Nada", artist: "Sergio Mendes", vocalIntensity: 3, energyLevel: 4, tags: ["latin", "party"] },
  { title: "Moondance", artist: "Van Morrison", vocalIntensity: 3, energyLevel: 3, tags: ["jazz", "soul"] },
  { title: "Butterfly", artist: "Herbie Hancock", vocalIntensity: 2, energyLevel: 3, tags: ["jazz"] },
  { title: "Mr Magic", artist: "Amy Winehouse", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "A Long Walk", artist: "Jill Scott", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "Give Me The Night", artist: "George Benson", vocalIntensity: 4, energyLevel: 5, tags: ["party", "closer"] },
  { title: "Crazy", artist: "Gnarls Barkley / Cory Henry", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "Appletree", artist: "Erykah Badu", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "The Way You Make Me Feel", artist: "Michael Jackson", vocalIntensity: 4, energyLevel: 4, tags: ["party", "soul"] },
  { title: "Let's Get It On", artist: "Marvin Gaye", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "At Last", artist: "Etta James", vocalIntensity: 4, energyLevel: 2, tags: ["ballad", "closer"] },
  { title: "Bye Bye Blackbird", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz", "opener"] },
  { title: "Triste", artist: "Antonio Carlos Jobim", vocalIntensity: 2, energyLevel: 2, tags: ["latin", "jazz"] },
  { title: "September In The Rain", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz"] },
  { title: "Cheek to Cheek", artist: "Irving Berlin (Jazz Standard)", vocalIntensity: 2, energyLevel: 3, tags: ["jazz"] },
  { title: "Turn Me On", artist: "Norah Jones", vocalIntensity: 2, energyLevel: 2, tags: ["jazz", "opener"] },
  { title: "Lovely Day", artist: "Bill Withers", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "Valerie", artist: "Amy Winehouse / Mark Ronson", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "Never Too Much", artist: "Luther Vandross", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "American Boy", artist: "Estelle ft. Kanye West", vocalIntensity: 3, energyLevel: 4, tags: ["contemporary", "party"] },
  { title: "Say A Little Prayer", artist: "Aretha Franklin", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "Wish I Didn't Miss You", artist: "Angie Stone", vocalIntensity: 4, energyLevel: 3, tags: ["soul"] },
  { title: "Make Me Feel", artist: "Janelle Monae", vocalIntensity: 4, energyLevel: 5, tags: ["party", "contemporary"] },
  { title: "Havana", artist: "Camila Cabello", vocalIntensity: 3, energyLevel: 4, tags: ["latin", "contemporary", "party"] },
  { title: "What You Don't Do", artist: "Lianne La Havas", vocalIntensity: 3, energyLevel: 3, tags: ["soul", "contemporary"] },
  { title: "Not The Only One", artist: "Sam Smith", vocalIntensity: 4, energyLevel: 2, tags: ["ballad", "closer", "contemporary"] },
  { title: "Skyfall", artist: "Adele", vocalIntensity: 5, energyLevel: 3, tags: ["ballad"] },
  { title: "Doralice", artist: "Antonio Carlos Jobim", vocalIntensity: 2, energyLevel: 2, tags: ["latin", "jazz"] },
  { title: "Dream A Little Dream", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz"] },
  { title: "Smile", artist: "Charlie Chaplin / Nat King Cole", vocalIntensity: 2, energyLevel: 2, tags: ["jazz", "ballad"] },
  { title: "Frontin'", artist: "Pharrell / Jamie Cullum", vocalIntensity: 3, energyLevel: 4, tags: ["contemporary", "party"] },
  { title: "If I Ain't Got You", artist: "Alicia Keys", vocalIntensity: 4, energyLevel: 3, tags: ["soul", "ballad"] },
  { title: "What's Love Got To Do With It", artist: "Tina Turner", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "Tightrope", artist: "Janelle Monae", vocalIntensity: 4, energyLevel: 5, tags: ["party", "contemporary"] },
  { title: "That Man", artist: "Caro Emerald", vocalIntensity: 3, energyLevel: 4, tags: ["jazz", "party"] },
  { title: "Feel It Still", artist: "Portugal. The Man / PMJ", vocalIntensity: 3, energyLevel: 4, tags: ["contemporary", "party"] },
  { title: "Who Will Comfort Me", artist: "Melody Gardot", vocalIntensity: 3, energyLevel: 2, tags: ["jazz", "ballad"] },
  { title: "Night and Day", artist: "Cole Porter (Jazz Standard)", vocalIntensity: 2, energyLevel: 2, tags: ["jazz"] },
  { title: "Wave", artist: "Antonio Carlos Jobim", vocalIntensity: 2, energyLevel: 2, tags: ["latin", "jazz"] },
  { title: "C'est Si Bon", artist: "French Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz"] },
  { title: "One Note Samba", artist: "Antonio Carlos Jobim", vocalIntensity: 2, energyLevel: 3, tags: ["latin", "jazz"] },
  { title: "Just The Two Of Us", artist: "Bill Withers / Grover Washington Jr", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "How Deep Is Your Love", artist: "Bee Gees / PJ Morton", vocalIntensity: 3, energyLevel: 3, tags: ["soul", "contemporary"] },
  { title: "La Vie En Rose", artist: "Edith Piaf", vocalIntensity: 3, energyLevel: 2, tags: ["ballad", "closer"] },
  { title: "Little Boat", artist: "Antonio Carlos Jobim", vocalIntensity: 2, energyLevel: 2, tags: ["latin", "jazz", "opener"] },
  { title: "What's Going On", artist: "Marvin Gaye", vocalIntensity: 3, energyLevel: 3, tags: ["soul"] },
  { title: "Ain't Nobody", artist: "Chaka Khan", vocalIntensity: 5, energyLevel: 5, tags: ["party", "soul"] },
  { title: "All Night Long", artist: "Lionel Richie", vocalIntensity: 4, energyLevel: 5, tags: ["party", "closer"] },
  { title: "Feeling Good", artist: "Nina Simone", vocalIntensity: 4, energyLevel: 4, tags: ["jazz", "soul"] },
  { title: "Hypotheticals", artist: "Lake Street Dive", vocalIntensity: 3, energyLevel: 4, tags: ["contemporary", "soul"] },
  { title: "You're Getting To Be A Habit With Me", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz"] },
  { title: "Moody's Mood For Love", artist: "King Pleasure / James Moody", vocalIntensity: 3, energyLevel: 2, tags: ["jazz"] },
  { title: "Taking A Chance On Love", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 3, tags: ["jazz"] },
  { title: "Love Is A Losing Game", artist: "Amy Winehouse", vocalIntensity: 4, energyLevel: 2, tags: ["ballad", "soul"] },
  { title: "Tell Me Something Good", artist: "Rufus ft. Chaka Khan", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "I Know You, I Live You", artist: "Chaka Khan", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "Body & Soul", artist: "Jazz Standard", vocalIntensity: 3, energyLevel: 2, tags: ["jazz", "opener"] },
  { title: "After Hours", artist: "Jazz Standard", vocalIntensity: 2, energyLevel: 2, tags: ["jazz", "opener"] },
  { title: "Bright Sized Life", artist: "Pat Metheny", vocalIntensity: 1, energyLevel: 3, tags: ["jazz", "opener"] },
  { title: "I Can't Make You Love Me", artist: "Bonnie Raitt", vocalIntensity: 4, energyLevel: 2, tags: ["ballad"] },
  { title: "Give Me One Reason", artist: "Tracy Chapman / Scary Pockets", vocalIntensity: 4, energyLevel: 4, tags: ["soul", "party"] },
  { title: "I Will Survive", artist: "Gloria Gaynor / Scary Pockets", vocalIntensity: 5, energyLevel: 5, tags: ["party"] },
  { title: "Staying Alive", artist: "Bee Gees / Scary Pockets", vocalIntensity: 4, energyLevel: 5, tags: ["party"] },
  { title: "Cosmic Girl", artist: "Jamiroquai", vocalIntensity: 4, energyLevel: 5, tags: ["party"] },
  { title: "Treasure", artist: "Bruno Mars", vocalIntensity: 4, energyLevel: 5, tags: ["party", "contemporary"] },
  { title: "Flowers", artist: "Miley Cyrus", vocalIntensity: 3, energyLevel: 4, tags: ["party", "contemporary"] },
  { title: "Lovefool", artist: "The Cardigans / Pomplamoose", vocalIntensity: 3, energyLevel: 4, tags: ["contemporary", "party"] },
  { title: "Worth It", artist: "Raye", vocalIntensity: 4, energyLevel: 4, tags: ["contemporary", "party"] },
  { title: "It's So Easy", artist: "Olivia Dean", vocalIntensity: 3, energyLevel: 3, tags: ["contemporary", "soul"] },
  { title: "Man I Need", artist: "Olivia Dean", vocalIntensity: 3, energyLevel: 3, tags: ["contemporary", "soul"] },
];

type ImportResult = {
  status: "inserted" | "duplicate" | "skipped";
  title: string;
  artist: string;
  id?: string;
  reason?: string;
};

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const bandSlug = params.bandSlug as string;
  const band = useBandBySlug(bandSlug);
  const bulkImport = useBulkImportSongs();

  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  if (!band) return null;

  const handleImport = async () => {
    setImporting(true);
    setResults(null);

    try {
      const importResults = await bulkImport({
        bandId: band._id as any,
        songs: FLARE_BAR_SONGS.map(s => ({
          title: s.title,
          artist: s.artist,
          vocalIntensity: s.vocalIntensity,
          energyLevel: s.energyLevel,
          tags: s.tags
        }))
      });

      setResults(importResults);

      const inserted = importResults.filter(r => r.status === "inserted").length;
      const duplicates = importResults.filter(r => r.status === "duplicate").length;

      if (inserted > 0) {
        toast.success(`Imported ${inserted} songs`, {
          description: duplicates > 0 ? `${duplicates} duplicates skipped` : undefined
        });
      } else if (duplicates > 0) {
        toast.info("All songs already exist in your library");
      }
    } catch (e: any) {
      toast.error("Import failed", { description: e?.message });
    } finally {
      setImporting(false);
    }
  };

  const inserted = results?.filter(r => r.status === "inserted") ?? [];
  const duplicates = results?.filter(r => r.status === "duplicate") ?? [];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/${bandSlug}/songs`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Import Flare Bar Songs
          </h1>
          <p className="text-muted-foreground text-sm">
            Import {FLARE_BAR_SONGS.length} songs from Clo's setlists
          </p>
        </div>
      </div>

      <div className="p-5 rounded-lg border border-border bg-card space-y-6">
        <div className="space-y-3">
          <h2 className="font-medium">About this import</h2>
          <p className="text-sm text-muted-foreground">
            This will import songs extracted from 18 Flare Bar setlists (2020-2026).
            Each song has been analyzed and assigned:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
            <li><strong>Vocal Intensity</strong> - based on typical vocal demands</li>
            <li><strong>Energy Level</strong> - based on typical placement in sets</li>
            <li><strong>Tags</strong> - genre and position tags (opener, closer, party, etc.)</li>
          </ul>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <Music className="h-10 w-10 text-primary" />
          <div>
            <p className="font-medium">{FLARE_BAR_SONGS.length} songs ready to import</p>
            <p className="text-sm text-muted-foreground">
              Jazz standards, soul classics, and contemporary covers
            </p>
          </div>
        </div>

        {!results && (
          <Button
            onClick={handleImport}
            disabled={importing}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importing..." : "Import All Songs"}
          </Button>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{inserted.length} imported</span>
                </div>
              </div>
              <div className="flex-1 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{duplicates.length} duplicates</span>
                </div>
              </div>
            </div>

            {inserted.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-emerald-700">Imported Songs</h3>
                <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                  {inserted.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>{r.title}</span>
                      <span className="text-muted-foreground/60">- {r.artist}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {duplicates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-amber-700">Already Existed</h3>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {duplicates.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      <span>{r.title}</span>
                      <span className="text-muted-foreground/60">- {r.artist}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/${bandSlug}/songs`}>View Songs</Link>
              </Button>
              <Button onClick={() => setResults(null)} variant="outline" className="flex-1">
                Import Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
