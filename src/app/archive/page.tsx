import type { Metadata } from "next";
import { Archive } from "@/components/Archive";

export const metadata: Metadata = { title: "Archive" };

export default function ArchivePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="headline">Archive</h1>
        <span className="sq mt-3" />
      </div>
      <p className="small max-w-md">Every past daily is still playable. Archive games don&apos;t count towards your streak.</p>
      <Archive />
    </div>
  );
}
