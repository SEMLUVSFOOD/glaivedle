import type { Metadata } from "next";
import { SongDatabase } from "@/components/SongDatabase";

export const metadata: Metadata = {
  title: "Database",
  description: "Every glaive song in glaivedle – albums, EPs, singles, features, ovine hall and leaks.",
};

export default function DatabasePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="headline">Database</h1>
        <span className="sq mt-3" />
      </div>
      <p className="small max-w-xl">
        Every song glaivedle can ask you about. <span className="text-fg-hover">Released</span> songs are in every game;{" "}
        <span className="text-fg-hover">unreleased</span> ones (leaks) only show up when you play with unreleased songs
        on, and <span className="text-fg-hover">ovine hall</span> songs when its switch is on. Tap a song for details. Leaks come from the community tracker at{" "}
        <a href="https://www.unreleased.world/glaive" target="_blank" rel="noopener noreferrer">
          unreleased.world
        </a>
        .
      </p>
      <SongDatabase />
    </div>
  );
}
