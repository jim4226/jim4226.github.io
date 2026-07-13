"use client";

import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import ResultsDeck from "../ResultsDeck";
import ResultsStory from "../ResultsStory";

type ResultsPageClientProps = {
  profiles: unknown;
};

export default function ResultsPageClient({ profiles }: ResultsPageClientProps) {
  const searchParams = useSearchParams();

  if (searchParams.get("view") === "full") {
    return <ResultsStory profiles={profiles as ComponentProps<typeof ResultsStory>["profiles"]} />;
  }

  return <ResultsDeck profiles={profiles as ComponentProps<typeof ResultsDeck>["profiles"]} />;
}
