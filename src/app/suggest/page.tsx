import type { Metadata } from "next";
import { SuggestForm } from "@/components/SuggestForm";

export const metadata: Metadata = { title: "Suggest an artist" };

export default function SuggestPage() {
  return (
    <div className="max-w-xl space-y-8">
      <h1 className="headline">Suggest an artist</h1>
      <p className="small max-w-md">
        glaivedle is built to support more artists. Tell us who should get their own daily game next – the most requested go
        first.
      </p>
      <SuggestForm />
    </div>
  );
}
