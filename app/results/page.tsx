import type { Metadata } from "next";
import { Suspense } from "react";
import profiles from "../data/ecgProfiles.json";
import ResultsPageClient from "./ResultsPageClient";

export const metadata: Metadata = {
  title: "Results Deck",
  description:
    "A presenter-ready path through the HeartVector question, locked null, mechanism-aligned direction, external transport, cross-scale atlas, and evidence boundary.",
};

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageClient profiles={profiles} />
    </Suspense>
  );
}
