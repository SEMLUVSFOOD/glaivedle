import type { Metadata } from "next";
import { SuggestForm } from "@/components/SuggestForm";

export const metadata: Metadata = { title: "Suggest an artist" };

export default function SuggestPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl font-bold">Suggest an artist</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        glaivedle is built to support more artists. Tell us who should get their own daily game next — the most requested
        ones go first.
      </p>
      <SuggestForm />
    </div>
  );
}
