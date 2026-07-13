"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AnatomyExplorer from "./AnatomyExplorer";
import BrainMRIExplorer from "./BrainMRIExplorer";
import HeartExplorer from "./HeartExplorer";

type AtlasSystem = "heart" | "brain" | "skeleton" | "whole-body";

const SYSTEMS: Array<{
  id: AtlasSystem;
  index: string;
  label: string;
  source: string;
  recordType: string;
}> = [
  { id: "heart", index: "01", label: "HEART MRI", source: "CardioMechanics 1.5 T MRI", recordType: "five named surfaces" },
  { id: "brain", index: "02", label: "BRAIN MRI", source: "LEMON MP2RAGE", recordType: "complete 256³ volumes" },
  { id: "skeleton", index: "03", label: "SKELETON CT", source: "TotalSegmentator v2 · s1045", recordType: "63 named masks" },
  { id: "whole-body", index: "04", label: "WHOLE-BODY CT", source: "TotalSegmentator v2 · s1045", recordType: "115 named masks" },
];

function parseSystem(value: string | null): AtlasSystem {
  switch (value?.toLowerCase()) {
    case "brain":
    case "brain-mri":
      return "brain";
    case "skeleton":
    case "skeleton-ct":
      return "skeleton";
    case "body":
    case "whole_body":
    case "wholebody":
    case "whole-body":
    case "whole-body-ct":
      return "whole-body";
    default:
      return "heart";
  }
}

function recordHref(pathname: string, participant: string) {
  if (!participant) return pathname;
  return `${pathname}?${new URLSearchParams({ participant }).toString()}`;
}

function ActiveExplorer({ system, guidedMotion }: { system: AtlasSystem; guidedMotion: boolean }) {
  if (system === "heart") return <HeartExplorer guidedMotion={guidedMotion} />;
  if (system === "brain") return <BrainMRIExplorer />;
  if (system === "whole-body") return <AnatomyExplorer initialMode="body" showModeToggle={false} guidedMotion={guidedMotion} />;
  return <AnatomyExplorer initialMode="skeleton" showModeToggle={false} guidedMotion={guidedMotion} />;
}

function PresentationPointer({ enabled }: { enabled: boolean }) {
  const pointerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const pointer = pointerRef.current;
    if (!pointer) return;
    let releaseTimer = 0;

    const positionPointer = (event: PointerEvent) => {
      pointer.dataset.visible = "true";
      pointer.style.setProperty("--pointer-x", `${event.clientX}px`);
      pointer.style.setProperty("--pointer-y", `${event.clientY}px`);
    };
    const pressPointer = (event: PointerEvent) => {
      positionPointer(event);
      window.clearTimeout(releaseTimer);
      pointer.dataset.clicking = "false";
      void pointer.offsetWidth;
      pointer.dataset.clicking = "true";
    };
    const releasePointer = () => {
      releaseTimer = window.setTimeout(() => {
        pointer.dataset.clicking = "false";
      }, 420);
    };

    window.addEventListener("pointermove", positionPointer, true);
    window.addEventListener("pointerdown", pressPointer, true);
    window.addEventListener("pointerup", releasePointer, true);
    return () => {
      window.clearTimeout(releaseTimer);
      window.removeEventListener("pointermove", positionPointer, true);
      window.removeEventListener("pointerdown", pressPointer, true);
      window.removeEventListener("pointerup", releasePointer, true);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={pointerRef} className="presentation-pointer" data-visible="false" data-clicking="false" aria-hidden="true">
      <span className="presentation-pointer-ring" />
      <svg viewBox="0 0 28 34" focusable="false">
        <path d="M3 2.5 24.5 19l-9.2 1.5 5.1 9-5.6 3.1-5-9.1-6.8 6.3Z" />
      </svg>
      <span className="presentation-pointer-label">FOCUS</span>
    </div>
  );
}

export default function AtlasDashboard() {
  const [system, setSystem] = useState<AtlasSystem>("heart");
  const [participant, setParticipant] = useState("");
  const [guidedMotion, setGuidedMotion] = useState(false);

  useEffect(() => {
    const readLocation = () => {
      const parameters = new URLSearchParams(window.location.search);
      setSystem(parseSystem(parameters.get("system")));
      setParticipant(parameters.get("participant") ?? "");
      setGuidedMotion(parameters.get("present") === "1" || parameters.get("demo") === "1");
    };
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);

  const active = SYSTEMS.find((item) => item.id === system) ?? SYSTEMS[0];

  const chooseSystem = (nextSystem: AtlasSystem) => {
    setSystem(nextSystem);
    const url = new URL(window.location.href);
    url.searchParams.set("system", nextSystem);
    window.history.pushState({ ...window.history.state, system: nextSystem }, "", `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <main className="atlas-dashboard" data-presentation-mode={guidedMotion}>
      <PresentationPointer enabled={guidedMotion} />
      <div className="atlas-app-shell">
        <header className="atlas-titlebar">
          <Link className="atlas-wordmark" href={`/?system=${system}${participant ? `&participant=${encodeURIComponent(participant)}` : ""}`}>
            <span className="atlas-product-name">HumanVector</span>
            <small>Multimodal systems atlas</small>
          </Link>
          <nav aria-label="Atlas pages">
            <Link href={`/?system=${system}`} aria-current="page">Atlas viewer</Link>
            <Link href={recordHref("/participant", participant)}>Participant</Link>
            <Link href={recordHref("/results", participant)}>Results</Link>
          </nav>
          <span className="atlas-demo-status">Research use only</span>
        </header>

        <aside className="atlas-context-strip" aria-label="Cross-cohort record boundary">
          <span><strong>Independent public records.</strong> Switching systems does not follow one patient across modalities.</span>
          <span>{active.source} · {active.recordType}</span>
        </aside>

        <nav className="atlas-system-tabs" aria-label="Anatomical system">
          {SYSTEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === system}
              aria-controls="atlas-active-viewer"
              onClick={() => chooseSystem(item.id)}
            >
              {item.index} / {item.label}
            </button>
          ))}
        </nav>

        <section id="atlas-active-viewer" className="atlas-workspace" aria-label={`${active.label} viewer`}>
          <ActiveExplorer system={system} guidedMotion={guidedMotion} />
        </section>

        <footer className="atlas-footer">
          <span>Real released inputs · reference anatomy · visible cohort boundaries</span>
          <span>
            <a href="https://fcon_1000.projects.nitrc.org/indi/retro/MPI_LEMON.html" target="_blank" rel="noreferrer">LEMON</a>
            {" · "}
            <a href="https://zenodo.org/records/5573921" target="_blank" rel="noreferrer">CardioMechanics</a>
            {" · "}
            <a href="https://zenodo.org/records/10047292" target="_blank" rel="noreferrer">TotalSegmentator</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
