import type { Metadata } from "next";
import { Archive } from "@/components/Archive";

export const metadata: Metadata = { title: "Archive" };

export default function ArchivePage() {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Archive</h1>
      <p className="mt-1 mb-5 text-sm text-muted">Missed a day? Every past puzzle is still playable. Archive games don&apos;t affect your streak.</p>
      <Archive />
    </div>
  );
}
