import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Game } from "@/components/game/Game";
import { isMode, MODE_INFO, MODES } from "@/lib/game/types";

export function generateStaticParams() {
  return MODES.map((mode) => ({ mode }));
}

export async function generateMetadata({ params }: PageProps<"/[mode]">): Promise<Metadata> {
  const { mode } = await params;
  if (!isMode(mode)) return {};
  return { title: `${MODE_INFO[mode].title} — ${MODE_INFO[mode].blurb}` };
}

async function ModeGame({ params }: { params: PageProps<"/[mode]">["params"] }) {
  const { mode } = await params;
  if (!isMode(mode)) notFound();
  return <Game mode={mode} />;
}

export default function ModePage({ params }: PageProps<"/[mode]">) {
  return (
    <Suspense fallback={<div className="panel arch h-72 animate-pulse" />}>
      <ModeGame params={params} />
    </Suspense>
  );
}
