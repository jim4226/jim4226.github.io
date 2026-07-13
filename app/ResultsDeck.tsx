"use client";

import Link from "next/link";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  DirectionVectorFigure,
  EvidenceCoverageMatrix,
  MiniEcgTrace,
  NullResultFigure,
  PhaseCoordinateFigure,
  TransportCurveFigure,
  TransportRobustnessFigure,
} from "./ResultsVisuals";

const ResultsAtlasVisual = lazy(() => import("./ResultsAtlasVisual"));

type Profile = {
  id: string;
  profile: string;
  title: string;
  age: number;
  sex: string;
  label: string;
  source: string;
  phaseAges: Record<string, number>;
  gaps: Record<string, number>;
  A: number;
  D: number;
  q: number[];
  waveform?: number[][];
};

type ResultsDeckProps = {
  profiles: Profile[];
};

const SLIDES = [
  {
    id: "question", number: "01", tab: "Question", title: "One age hides four clocks.", seconds: 12,
    beats: [
      { id: "phase", label: "Real signal + phase clocks", cue: "Dashed line = actual age; each colored bar = one ECG phase’s apparent age." },
      { id: "gaps", label: "Gap heatmap", cue: "Plus/red looks older; minus/blue looks younger than chronological age." },
      { id: "geometry", label: "A, D, and q", cue: "A keeps shared shift, D disagreement, and q the signed direction." },
    ],
  },
  {
    id: "null", number: "02", tab: "Locked null", title: "Distance was not enough.", seconds: 11,
    beats: [
      { id: "result", label: "Estimate + interval", cue: "HR 1.010 sits near no effect, and its 95% interval crosses 1." },
      { id: "context", label: "Why the null matters", cue: "With 74,715 cases, this was an informative null—not an underpowered shrug." },
    ],
  },
  {
    id: "direction", number: "03", tab: "Direction", title: "The perturbation supplied an arrow.", seconds: 13,
    beats: [
      { id: "vector", label: "Frozen arrow", cue: "Dofetilide defines one signed direction through phase-clock space." },
      { id: "projection", label: "Drug projections", cue: "Positive estimates align with the arrow; intervals crossing zero are uncertain." },
      { id: "robustness", label: "Exploratory strength", cue: "Resampling preserved the arrow, but this remains exploratory evidence." },
    ],
  },
  {
    id: "transport", number: "04", tab: "Transport", title: "Frozen first. Then transported.", seconds: 13,
    beats: [
      { id: "ladder", label: "Adjustment models", cue: "Four separate models move from marginal OR 1.000 to fully adjusted OR 1.225." },
      { id: "robustness", label: "Sites + rhythm", cue: "Two sites support the pooled result; strict rhythm exclusion crosses the null." },
      { id: "meaning", label: "Reviewer-safe claim", cue: "This is conditional information—not diagnosis, causality, or superiority to QTc." },
    ],
  },
  {
    id: "atlas", number: "05", tab: "Atlas", title: "One coordinate question, across scales.", seconds: 14,
    beats: [
      { id: "geometry", label: "Reference CT", cue: "A real TotalSegmentator CT supplies 115 segmented structures and the 3D geometry." },
      { id: "heatmap", label: "Cohort association map", cue: "Red ρ is larger volume at older age; blue is smaller; gray is near zero." },
      { id: "cohorts", label: "Cross-scale evidence", cue: "MRI and NHANES reuse the idea in separate cohorts—not one linked patient." },
    ],
  },
  {
    id: "boundary", number: "06", tab: "Boundary", title: "An atlas now. A whole-person vector later.", seconds: 12,
    beats: [
      { id: "current", label: "Evidence available now", cue: "Green is person-level ECG; blue is real evidence from separate cohorts." },
      { id: "future", label: "What is still required", cue: "Pink marks same-person longitudinal linkage that does not exist yet." },
      { id: "claim", label: "The closing idea", cue: "Preserve biological structure instead of compressing it into one number." },
    ],
  },
] as const;

function parseSlide(value: string | null) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= SLIDES.length) return numeric - 1;
  const named = SLIDES.findIndex((slide) => slide.id === value?.toLowerCase());
  return named >= 0 ? named : 0;
}

function parseBeat(value: string | null, slideIndex: number) {
  const numeric = Number(value);
  const total = SLIDES[slideIndex].beats.length;
  return Number.isInteger(numeric) ? Math.max(0, Math.min(total - 1, numeric - 1)) : 0;
}

function queryHref(pathname: string, values: Record<string, string | undefined>) {
  const parameters = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) parameters.set(key, value);
  });
  const query = parameters.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function SlideHeading({
  slide,
  eyebrow,
  copy,
  beat,
  beatIndex,
}: {
  slide: (typeof SLIDES)[number];
  eyebrow: string;
  copy: string;
  beat: { id: string; label: string; cue: string };
  beatIndex: number;
}) {
  return (
    <header className="deck-slide-heading">
      <div>
        <span className="deck-eyebrow">{slide.number} · {eyebrow}</span>
        <h1>{slide.title}</h1>
        <p>{copy}</p>
      </div>
      <div className="deck-pace" aria-live="polite">
        <span>Focus {beatIndex + 1} / {slide.beats.length} · {slide.seconds} sec</span>
        <strong>{beat.label}</strong>
        <small>{beat.cue}</small>
      </div>
    </header>
  );
}

function QuestionSlide({ profile, profiles, beatIndex }: { profile: Profile; profiles: Profile[]; beatIndex: number }) {
  const slide = SLIDES[0];
  const beat = slide.beats[beatIndex] ?? slide.beats[0];
  return (
    <article className="deck-slide deck-question-slide" data-guided="true" data-beat={beat.id}>
      <SlideHeading
        slide={slide}
        eyebrow="THE QUESTION + THE GEOMETRY"
        copy="A single apparent cardiac age can conceal phase systems moving together, separating, or pointing in opposite directions."
        beat={beat}
        beatIndex={beatIndex}
      />
      <section className="deck-visual-frame deck-question-visual">
        <div className="deck-visual-context">
          <span>REAL PTB-XL EXAMPLE</span>
          <strong>{profile.profile} · {profile.id}</strong>
          <small>{profile.age} y · {profile.sex} · {profile.label}</small>
          <MiniEcgTrace profile={profile} focus={beat.id} />
        </div>
        <PhaseCoordinateFigure profile={profile} profiles={profiles} focus={beat.id} />
      </section>
      <p className="deck-takeaway" data-focus-target="geometry" data-focus-active={beat.id === "geometry"}><strong>Keep the geometry.</strong> A and D preserve magnitude; q preserves which subsystem moved where.</p>
    </article>
  );
}

function NullSlide({ beatIndex }: { beatIndex: number }) {
  const slide = SLIDES[1];
  const beat = slide.beats[beatIndex] ?? slide.beats[0];
  return (
    <article className="deck-slide deck-null-slide" data-guided="true" data-beat={beat.id}>
      <SlideHeading
        slide={slide}
        eyebrow="LOCKED CONFIRMATORY RESULT"
        copy="The preregistered mortality reveal tested whether the unsigned disagreement radius added information beyond age, sex, A, and whole-ECG age."
        beat={beat}
        beatIndex={beatIndex}
      />
      <section className="deck-visual-frame deck-null-visual">
        <NullResultFigure focus={beat.id} />
        <div className="deck-stat-strip" data-focus-target="context" data-focus-active={beat.id === "context"} aria-label="Locked reveal cohort context">
          <span><small>Complete cases</small><strong>74,715</strong></span>
          <span><small>Deaths</small><strong>2,583</strong></span>
          <span><small>Median follow-up</small><strong>3.4 y</strong></span>
          <p><strong>The hypothesis failed cleanly.</strong> The interval excluded an effect as large as the development estimate.</p>
        </div>
      </section>
      <p className="deck-takeaway" data-focus-target="context" data-focus-active={beat.id === "context"}><strong>HR 1.00 means no added hazard.</strong> A 95% interval crossing 1 is compatible with no association.</p>
    </article>
  );
}

function DirectionSlide({ beatIndex }: { beatIndex: number }) {
  const slide = SLIDES[2];
  const beat = slide.beats[beatIndex] ?? slide.beats[0];
  return (
    <article className="deck-slide deck-direction-slide" data-guided="true" data-beat={beat.id}>
      <SlideHeading
        slide={slide}
        eyebrow="MECHANISM-ALIGNED EXPLORATION"
        copy="Randomized IKr blockade supplied a signed direction through phase-clock space—the arrow discarded by an unsigned radius."
        beat={beat}
        beatIndex={beatIndex}
      />
      <section className="deck-visual-frame deck-direction-visual">
        <DirectionVectorFigure focus={beat.id} />
        <div className="deck-metric-ribbon" data-focus-target="robustness" data-focus-active={beat.id === "robustness"} aria-label="Direction robustness summary">
          <span><small>Bootstrap cosine</small><strong>0.941</strong><em>95% CI 0.635–0.998</em></span>
          <span><small>Sign stability</small><strong>99.99%</strong><em>9,999 / 10,000</em></span>
          <span><small>Permutation</small><strong>p = .033</strong><em>Holm p = .069</em></span>
        </div>
      </section>
      <p className="deck-caveat" data-focus-target="robustness" data-focus-active={beat.id === "robustness"}>Exploratory result. Quinidine comes from the same crossover cohort, so it is held-mechanism support—not independent validation.</p>
    </article>
  );
}

function TransportSlide({ beatIndex }: { beatIndex: number }) {
  const slide = SLIDES[3];
  const beat = slide.beats[beatIndex] ?? slide.beats[0];
  return (
    <article className="deck-slide deck-transport-slide" data-guided="true" data-beat={beat.id}>
      <SlideHeading
        slide={slide}
        eyebrow="EXTERNAL CONDITIONAL SUPPORT"
        copy="The signed IKr direction was frozen, carried without refitting into a pooled Chapman–Shaoxing and Ningbo ECG cohort, and evaluated against a physician-assigned QT-extension label."
        beat={beat}
        beatIndex={beatIndex}
      />
      <section className="deck-visual-frame deck-transport-visual">
        <div className="deck-transport-figures">
          <div data-focus-target="ladder" data-focus-active={beat.id === "ladder"}><TransportCurveFigure /></div>
          <div data-focus-target="robustness" data-focus-active={beat.id === "robustness"}><TransportRobustnessFigure /></div>
        </div>
        <div className="deck-transport-meta" data-focus-target="meaning" data-focus-active={beat.id === "meaning"}>
          <span><small>External ECGs</small><strong>44,550</strong></span>
          <span><small>QT-extension cases</small><strong>386</strong></span>
          <span><small>Fully adjusted 95% CI</small><strong>1.100–1.364</strong></span>
          <p><strong>Suppression pattern:</strong> the marginal association was null; conditional information emerged after intervals and covariates entered the model.</p>
        </div>
      </section>
      <p className="deck-caveat" data-focus-target="meaning" data-focus-active={beat.id === "meaning"}>Reviewer-safe claim: the frozen direction added conditional information. It is not claimed to outperform QTc, and the result is rhythm-sensitive.</p>
    </article>
  );
}

function AtlasSlide({ beatIndex }: { beatIndex: number }) {
  const slide = SLIDES[4];
  const beat = slide.beats[beatIndex] ?? slide.beats[0];
  return (
    <article className="deck-slide deck-atlas-slide" data-guided="true" data-beat={beat.id}>
      <SlideHeading
        slide={slide}
        eyebrow="SUPPORTING CROSS-SCALE ATLAS"
        copy="Independent public cohorts ask the same structural question at other scales. They share a coordinate language—not participants or a fitted causal chain."
        beat={beat}
        beatIndex={beatIndex}
      />
      <Suspense fallback={<div className="deck-atlas-loading"><span>Loading reference geometry</span><strong>Preparing 115 segmented structures…</strong></div>}>
        <ResultsAtlasVisual focus={beat.id} />
      </Suspense>
    </article>
  );
}

function BoundarySlide({ participant, beatIndex }: { participant: string; beatIndex: number }) {
  const slide = SLIDES[5];
  const beat = slide.beats[beatIndex] ?? slide.beats[0];
  return (
    <article className="deck-slide deck-boundary-slide" data-guided="true" data-beat={beat.id}>
      <SlideHeading
        slide={slide}
        eyebrow="WHAT IS DEMONSTRATED — AND WHAT IS NEXT"
        copy="HumanVector is a verified cross-cohort evidence atlas and a reusable coordinate language. It is not yet a multimodal patient digital twin."
        beat={beat}
        beatIndex={beatIndex}
      />
      <section className="deck-visual-frame deck-boundary-visual"><EvidenceCoverageMatrix focus={beat.id} /></section>
      <blockquote data-focus-target="claim" data-focus-active={beat.id === "claim"}>Preserve biological structure instead of compressing every measurement into one number.</blockquote>
      <div className="deck-final-links" data-focus-target="claim" data-focus-active={beat.id === "claim"}>
        <Link href={queryHref("/", { system: "heart", participant })}>Open interactive atlas</Link>
        <Link href={queryHref("/results", { view: "full", participant })}>Read full evidence</Link>
      </div>
    </article>
  );
}

function ActiveSlide({ index, profile, profiles, participant, beatIndex }: { index: number; profile: Profile; profiles: Profile[]; participant: string; beatIndex: number }) {
  switch (index) {
    case 1: return <NullSlide beatIndex={beatIndex} />;
    case 2: return <DirectionSlide beatIndex={beatIndex} />;
    case 3: return <TransportSlide beatIndex={beatIndex} />;
    case 4: return <AtlasSlide beatIndex={beatIndex} />;
    case 5: return <BoundarySlide participant={participant} beatIndex={beatIndex} />;
    default: return <QuestionSlide profile={profile} profiles={profiles} beatIndex={beatIndex} />;
  }
}

export default function ResultsDeck({ profiles }: ResultsDeckProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const [participant, setParticipant] = useState("");

  useEffect(() => {
    const readLocation = () => {
      const parameters = new URLSearchParams(window.location.search);
      const nextSlide = parseSlide(parameters.get("slide"));
      setSlideIndex(nextSlide);
      setBeatIndex(parseBeat(parameters.get("beat"), nextSlide));
      setParticipant(parameters.get("participant") ?? "");
    };
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);

  const goToSlide = useCallback((nextIndex: number, nextBeat = 0) => {
    const bounded = Math.max(0, Math.min(SLIDES.length - 1, nextIndex));
    const boundedBeat = Math.max(0, Math.min(SLIDES[bounded].beats.length - 1, nextBeat));
    setSlideIndex(bounded);
    setBeatIndex(boundedBeat);
    const url = new URL(window.location.href);
    url.searchParams.set("slide", SLIDES[bounded].id);
    url.searchParams.set("beat", String(boundedBeat + 1));
    window.history.pushState(
      { ...window.history.state, slide: SLIDES[bounded].id, beat: boundedBeat + 1 },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

  const goNext = useCallback(() => {
    const totalBeats = SLIDES[slideIndex].beats.length;
    if (beatIndex < totalBeats - 1) {
      goToSlide(slideIndex, beatIndex + 1);
      return;
    }
    if (slideIndex < SLIDES.length - 1) goToSlide(slideIndex + 1, 0);
  }, [beatIndex, goToSlide, slideIndex]);

  const goPrevious = useCallback(() => {
    if (beatIndex > 0) {
      goToSlide(slideIndex, beatIndex - 1);
      return;
    }
    if (slideIndex > 0) goToSlide(slideIndex - 1, SLIDES[slideIndex - 1].beats.length - 1);
  }, [beatIndex, goToSlide, slideIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, select, textarea, [contenteditable='true']")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
      if (event.key === "Home") {
        event.preventDefault();
        goToSlide(0, 0);
      }
      if (event.key === "End") {
        event.preventDefault();
        goToSlide(SLIDES.length - 1, SLIDES.at(-1)!.beats.length - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious, goToSlide]);

  const profile = useMemo(
    () => profiles.find((candidate) => candidate.id === participant) ?? profiles[0],
    [participant, profiles],
  );
  if (!profile) return null;

  const activeSlide = SLIDES[slideIndex];
  const activeBeat = activeSlide.beats[beatIndex] ?? activeSlide.beats[0];
  const selectedParticipant = participant || profile.id;
  const totalBeats = SLIDES.reduce((total, slide) => total + slide.beats.length, 0);
  const completedBeats = SLIDES.slice(0, slideIndex).reduce((total, slide) => total + slide.beats.length, 0) + beatIndex + 1;
  const progress = (completedBeats / totalBeats) * 100;

  return (
    <main className="results-deck">
      <style>{`
        .results-deck {
          --deck-ink: #1a1a1f;
          --deck-soft: #60605b;
          --deck-muted: #92918b;
          --deck-line: #dedcd5;
          --deck-line-strong: #c9c7bf;
          --deck-paper: #ffffff;
          --deck-wash: #f5f3ee;
          --deck-stage: #f5f3ee;
          --deck-mint: #00a67e;
          --deck-mint-dark: #007e60;
          --deck-mint-soft: #e8f5f1;
          --deck-blue: #3d3dcc;
          --deck-magenta: #d4236a;
          min-height: 100vh;
          padding: 12px;
          color: var(--deck-ink);
          background: var(--deck-wash);
          font-family: "Space Grotesk", var(--font-geist-sans), sans-serif;
        }
        .deck-window { width: min(1600px,100%); min-height: calc(100vh - 24px); margin: 0 auto; overflow: hidden; display: grid; grid-template-rows: auto auto 2px 1fr auto; background: var(--deck-paper); border: 1px solid var(--deck-line-strong); border-radius:7px; }
        .deck-titlebar { min-height: 62px; padding: 0 clamp(20px,3vw,46px); display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 28px; border-bottom: 1px solid var(--deck-line); }
        .deck-brand { width:fit-content; color:var(--deck-ink); }
        .deck-brand strong { font-family: "Syncopate", sans-serif; font-size: 10px; font-weight:600; letter-spacing: .18em; white-space: nowrap; }
        .deck-header-links { height:100%; display: flex; align-items:center; gap: 30px; }
        .deck-header-links a { position:relative; padding: 22px 0 19px; color: var(--deck-muted); font:700 9px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing: .12em; text-transform: uppercase; }
        .deck-header-links a:first-child { color: var(--deck-ink); }
        .deck-header-links a:first-child::after { position:absolute; right:0; bottom:-1px; left:0; height:2px; content:""; background:var(--deck-mint); }
        .deck-tabs { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); padding-inline:clamp(14px,2.4vw,38px); background: var(--deck-paper); border-bottom: 1px solid var(--deck-line); }
        .deck-tab { min-width: 0; min-height: 54px; padding: 8px 10px; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 10px; color: var(--deck-muted); background: transparent; border: 0; border-bottom:2px solid transparent; cursor: pointer; text-align: left; }
        .deck-tab:hover { color:var(--deck-ink); }
        .deck-tab[aria-selected="true"] { color: var(--deck-ink); border-bottom-color:var(--deck-mint); }
        .deck-tab > span { color: var(--deck-muted); font: 9px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .deck-tab > div { min-width: 0; display: grid; gap: 2px; }
        .deck-tab strong { overflow: hidden; font-size: 10px; font-weight:550; letter-spacing: .025em; text-overflow: ellipsis; white-space: nowrap; }
        .deck-tab small { display:none; }
        .deck-progress { overflow: hidden; background: #ebe9e3; }
        .deck-progress i { height: 100%; display: block; background: var(--deck-mint); transition: width .25s ease; }
        .deck-stage { padding: clamp(18px,2.4vw,38px); background: var(--deck-stage); }
        .deck-slide { min-height: clamp(570px,calc(100vh - 228px),760px); padding: clamp(18px,2.5vw,38px); display: flex; flex-direction: column; gap: 18px; background: var(--deck-paper); border: 1px solid var(--deck-line); animation: deck-in .22s ease-out; }
        @keyframes deck-in { from { opacity: .55; transform: translateY(3px); } to { opacity: 1; transform: none; } }
        .deck-slide-heading { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 24px; align-items: start; }
        .deck-eyebrow { color: var(--deck-mint-dark); font: 700 9px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing: .15em; }
        .deck-slide-heading h1 { max-width: 1000px; margin: 11px 0 9px; font-size: clamp(36px,4.5vw,66px); line-height: .98; letter-spacing: -.06em; font-weight: 350; }
        .deck-slide-heading p { max-width: 980px; margin: 0; color: var(--deck-soft); font-size: clamp(12px,1.15vw,16px); line-height: 1.55; }
        .deck-pace { width:min(310px,32vw); padding: 2px 0 2px 18px; display: grid; gap: 5px; border-left: 1px solid var(--deck-line-strong); text-align: left; }
        .deck-pace span { color: var(--deck-muted); font: 700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing: .12em; text-transform: uppercase; }
        .deck-pace strong { color: var(--deck-ink); font-size: 11px; font-weight:550; }
        .deck-pace small { color:var(--deck-soft); font-size:9px; line-height:1.4; }
        .deck-slide[data-guided="true"] [data-focus-target] { opacity:.6; transition:opacity .2s ease,background-color .2s ease,box-shadow .2s ease; }
        .deck-slide[data-guided="true"] [data-focus-active="true"] { opacity:1; }
        .deck-slide[data-guided="true"] [data-focus-active="true"]:not(td):not(th):not(caption) { background-color:rgba(0,166,126,.035); box-shadow:inset 2px 0 var(--deck-mint); }
        .deck-visual-frame { flex: 1; min-height: 0; padding: clamp(14px,1.8vw,24px); display: grid; align-content: center; gap: 12px; background: white; border: 1px solid var(--deck-line); }
        .deck-visual-context { display: grid; grid-template-columns: auto auto minmax(160px,1fr) minmax(260px,.7fr); align-items:center; gap: 12px; padding-bottom: 9px; border-bottom: 1px solid var(--deck-line); }
        .deck-visual-context span,.deck-stat-strip small,.deck-metric-ribbon small,.deck-transport-meta small { color: var(--deck-muted); font: 700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing: .09em; text-transform: uppercase; }
        .deck-visual-context strong { font: 10px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .deck-visual-context small { color: var(--deck-soft); font-size: 9px; }
        .deck-visual-context > .rv-mini-ecg { justify-self:end; }
        .deck-stat-strip { display: grid; grid-template-columns: repeat(3,minmax(110px,.55fr)) minmax(260px,1.35fr); border-top: 1px solid var(--deck-line); }
        .deck-stat-strip > span,.deck-stat-strip > p { min-width:0; margin:0; padding: 10px 13px; display:grid; align-content:center; gap:3px; }
        .deck-stat-strip > * + * { border-left:1px solid var(--deck-line); }
        .deck-stat-strip strong { font-size:17px; letter-spacing:-.03em; }
        .deck-stat-strip p { color:var(--deck-soft); font-size:9px; line-height:1.42; }
        .deck-stat-strip p strong { color:var(--deck-ink); font-size:9px; }
        .deck-metric-ribbon,.deck-transport-meta { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid var(--deck-line); }
        .deck-metric-ribbon > span,.deck-transport-meta > span { min-width:0; padding:9px 13px 0; display:grid; gap:2px; }
        .deck-metric-ribbon > span + span,.deck-transport-meta > span + span { border-left:1px solid var(--deck-line); }
        .deck-metric-ribbon strong,.deck-transport-meta strong { font-size:16px; letter-spacing:-.035em; }
        .deck-metric-ribbon em { color:var(--deck-soft); font:normal 8px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .deck-transport-meta p { grid-column:1/-1; margin:9px 0 0; padding:9px 13px 0; color:var(--deck-soft); border-top:1px solid var(--deck-line); font-size:9px; line-height:1.4; }
        .deck-transport-meta p strong { color:var(--deck-ink); }
        .deck-transport-figures { min-width:0; display:grid; grid-template-columns:minmax(0,1.35fr) minmax(310px,.65fr); gap:14px; align-items:start; }
        .deck-transport-figures > div { min-width:0; }
        .deck-atlas-slide { gap:14px; padding:clamp(18px,2.2vw,34px); }
        .deck-atlas-slide .deck-slide-heading h1 { font-size:clamp(31px,3.4vw,49px); }
        .deck-atlas-loading { flex:1; min-height:430px; display:grid; place-content:center; gap:6px; color:var(--deck-soft); background:white; border:1px solid var(--deck-line); text-align:center; }
        .deck-atlas-loading span { color:var(--deck-mint-dark); font:700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing:.12em; text-transform:uppercase; }
        .deck-atlas-loading strong { font-size:17px; font-weight:500; }
        .deck-boundary-visual { padding-block:10px; }
        .deck-question-grid { flex: 1; display: grid; grid-template-columns: minmax(280px,.72fr) minmax(0,1.28fr); gap: 14px; }
        .deck-question-card,.deck-phase-board,.deck-null-result,.deck-null-context,.deck-projection-board,.deck-direction-metrics,.deck-transport-board,.deck-boundary-columns > section { background: white; border: 1px solid var(--deck-line); border-radius: 11px; }
        .deck-question-card { padding: clamp(22px,2.5vw,36px); display: flex; flex-direction: column; }
        .deck-question-card > span,.deck-phase-board-title span { color: var(--deck-muted); font: 8px var(--font-geist-mono),monospace; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
        .deck-question-card h2 { margin: 13px 0 12px; font-size: clamp(22px,2.2vw,34px); line-height: 1.12; letter-spacing: -.04em; }
        .deck-question-card p { margin: 0; color: var(--deck-soft); font-size: 11px; line-height: 1.58; }
        .deck-record-line { margin-top: auto; padding-top: 18px; display: grid; gap: 4px; border-top: 1px solid var(--deck-line); }
        .deck-record-line strong { font: 10px var(--font-geist-mono),monospace; }
        .deck-record-line span { color: var(--deck-soft); font-size: 9px; }
        .deck-phase-board { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
        .deck-phase-board-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .deck-phase-board-title strong { font-size: 9px; }
        .deck-phase-cards { flex: 1; display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .deck-phase-card { min-width: 0; padding: 14px 12px; display: flex; flex-direction: column; background: #f7faf9; border: 1px solid var(--deck-line); border-radius: 9px; }
        .deck-phase-card > span { color: var(--deck-mint-dark); font: 9px var(--font-geist-mono),monospace; font-weight: 750; }
        .deck-phase-card > strong { margin: 13px 0 2px; font-size: clamp(24px,2.5vw,38px); letter-spacing: -.045em; }
        .deck-phase-card > strong small { font-size: 10px; }
        .deck-phase-card em { color: var(--deck-blue); font: normal 9px var(--font-geist-mono),monospace; }
        .deck-phase-card > small { margin-top: auto; padding-top: 12px; color: var(--deck-soft); font-size: 8px; line-height: 1.35; }
        .deck-phase-card:nth-child(1) { background: #f7ece9; border-color: #ead2cd; }
        .deck-phase-card:nth-child(1) > span { color: #a94338; }
        .deck-phase-card:nth-child(2) { background: #f4efe4; border-color: #e6d7b8; }
        .deck-phase-card:nth-child(2) > span { color: #8f5e0e; }
        .deck-phase-card:nth-child(3) { background: #eceff6; border-color: #d2d9ea; }
        .deck-phase-card:nth-child(3) > span { color: #294b93; }
        .deck-phase-card:nth-child(4) { background: #f4eaf0; border-color: #e6cad8; }
        .deck-phase-card:nth-child(4) > span { color: #8d2058; }
        .deck-coordinate-row { display: grid; grid-template-columns: .8fr .8fr 1.4fr; gap: 8px; }
        .deck-coordinate-row > div { min-width: 0; padding: 10px 12px; display: grid; gap: 4px; background: #f7faf9; border: 1px solid var(--deck-line); border-radius: 8px; }
        .deck-coordinate-row span { color: var(--deck-soft); font-size: 8px; }
        .deck-coordinate-row strong { overflow: hidden; font: 12px var(--font-geist-mono),monospace; text-overflow: ellipsis; white-space: nowrap; }
        .deck-coordinate-row .deck-coordinate-accent { background: var(--deck-mint-soft); border-color: #c5e5dd; }
        .deck-takeaway,.deck-caveat { margin: 0; padding: 11px 14px; color: var(--deck-soft); background: #f6faf8; border-left: 2px solid var(--deck-mint); font-size: 10px; line-height: 1.45; }
        .deck-null-layout { flex: 1; display: grid; grid-template-columns: minmax(0,1.35fr) minmax(280px,.65fr); gap: 14px; }
        .deck-null-result { padding: clamp(22px,3vw,42px); display: grid; align-content: center; }
        .deck-null-number { display: grid; justify-items: center; }
        .deck-null-number span { color: var(--deck-soft); font-size: 9px; }
        .deck-null-number strong { margin: 4px 0; color: var(--deck-ink); font-size: clamp(62px,8vw,118px); line-height: .9; letter-spacing: -.075em; font-weight: 520; }
        .deck-null-number small { color: var(--deck-soft); font: 10px var(--font-geist-mono),monospace; }
        .deck-null-axis { position: relative; height: 92px; margin: 24px 3% 0; border-bottom: 1px solid #9eb1b6; }
        .deck-null-reference { position: absolute; left: 40%; top: 5px; bottom: 0; width: 1px; background: #8da3aa; }
        .deck-null-ci { position: absolute; left: 23%; top: 34px; width: 56%; height: 4px; background: var(--deck-blue); border-radius: 4px; }
        .deck-null-point { position: absolute; left: 50%; top: 27px; width: 17px; height: 17px; background: var(--deck-blue); border: 4px solid white; border-radius: 50%; box-shadow: 0 0 0 1px var(--deck-blue); transform: translateX(-50%); }
        .deck-null-axis > div { position: absolute; left: 0; right: 0; bottom: -19px; display: flex; justify-content: space-between; color: var(--deck-muted); font: 7px var(--font-geist-mono),monospace; }
        .deck-null-labels { margin-top: 28px; display: grid; grid-template-columns: 1fr auto 1fr; color: var(--deck-muted); font-size: 8px; }
        .deck-null-labels strong { color: var(--deck-ink); text-align: center; }
        .deck-null-labels span:last-child { text-align: right; }
        .deck-null-context { padding: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .deck-null-context > div,.deck-direction-metrics > div { padding: 13px; display: grid; gap: 5px; background: #f7faf9; border: 1px solid var(--deck-line); border-radius: 8px; }
        .deck-null-context span,.deck-direction-metrics span { color: var(--deck-soft); font-size: 8px; }
        .deck-null-context strong,.deck-direction-metrics strong { font-size: 20px; letter-spacing: -.035em; }
        .deck-null-context > p { grid-column: 1/-1; margin: 0; padding: 15px; align-self: end; color: var(--deck-soft); background: var(--deck-mint-soft); border-radius: 8px; font-size: 10px; line-height: 1.5; }
        .deck-direction-layout { flex: 1; display: grid; grid-template-columns: minmax(0,1.35fr) minmax(280px,.65fr); gap: 14px; }
        .deck-projection-board { padding: 18px; }
        .deck-projection-head { margin-bottom: 14px; display: flex; justify-content: space-between; gap: 12px; }
        .deck-projection-head span { color: var(--deck-soft); font-size: 9px; }
        .deck-projection-head code { color: var(--deck-mint-dark); font-size: 9px; }
        .deck-projection-axis { margin-left: 135px; padding: 0 60px 5px 0; display: flex; justify-content: space-between; color: var(--deck-muted); font: 7px var(--font-geist-mono),monospace; }
        .deck-projection-row { min-height: 62px; display: grid; grid-template-columns: 120px minmax(180px,1fr) 54px; align-items: center; gap: 14px; border-top: 1px solid var(--deck-line); }
        .deck-projection-row > div { display: grid; gap: 2px; }
        .deck-projection-row > div strong { font-size: 10px; }
        .deck-projection-row > div small { color: var(--deck-muted); font-size: 7px; }
        .deck-projection-row > strong { font: 9px var(--font-geist-mono),monospace; }
        .deck-projection-track { position: relative; height: 20px; background: linear-gradient(#eef3f2,#eef3f2) center/100% 1px no-repeat; }
        .deck-projection-zero { position: absolute; left: 13.33%; top: 0; bottom: 0; width: 1px; background: #9cafb4; }
        .deck-projection-ci { position: absolute; top: 8px; height: 4px; background: #95adb5; border-radius: 4px; }
        .deck-projection-point { position: absolute; top: 4px; width: 12px; height: 12px; background: #7896a1; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 1px #7896a1; transform: translateX(-50%); }
        .deck-projection-row.is-ikr .deck-projection-ci,.deck-projection-row.is-ikr .deck-projection-point { background: var(--deck-mint); }
        .deck-projection-row.is-ikr .deck-projection-point { box-shadow: 0 0 0 1px var(--deck-mint); }
        .deck-direction-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .deck-direction-metrics small { color: var(--deck-muted); font-size: 8px; }
        .deck-transport-board { flex: 1; padding: clamp(20px,2.8vw,38px); display: grid; grid-template-columns: minmax(0,1.35fr) minmax(280px,.65fr); gap: 24px; }
        .deck-transport-ladder { align-self: center; display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .deck-transport-step { position: relative; min-height: 210px; padding: 18px 14px; display: flex; flex-direction: column; background: #f7faf9; border: 1px solid var(--deck-line); border-radius: 9px; }
        .deck-transport-step > span { color: #a5b1b5; font: 8px var(--font-geist-mono),monospace; }
        .deck-transport-step small { margin-top: 26px; color: var(--deck-soft); font-size: 9px; }
        .deck-transport-step strong { margin-top: 9px; font-size: clamp(18px,1.7vw,26px); letter-spacing: -.04em; }
        .deck-transport-step em { margin-top: auto; color: var(--deck-muted); font: normal 8px var(--font-geist-mono),monospace; }
        .deck-transport-step.is-final { color: #075f50; background: var(--deck-mint-soft); border-color: #add9cf; box-shadow: inset 0 3px var(--deck-mint); }
        .deck-transport-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .deck-transport-summary > div { padding: 14px; display: grid; align-content: center; gap: 4px; background: #f7faf9; border: 1px solid var(--deck-line); border-radius: 8px; }
        .deck-transport-summary > div:nth-child(3) { grid-column: 1/-1; background: var(--deck-mint-soft); }
        .deck-transport-summary span { color: var(--deck-soft); font-size: 8px; }
        .deck-transport-summary strong { font-size: 20px; letter-spacing: -.035em; }
        .deck-transport-summary small { color: var(--deck-soft); font-size: 8px; }
        .deck-transport-summary p { grid-column: 1/-1; margin: 0; padding: 14px; color: var(--deck-soft); border: 1px solid var(--deck-line); border-radius: 8px; font-size: 10px; line-height: 1.5; }
        .deck-atlas-grid { flex: 1; display: grid; grid-template-columns: repeat(6,1fr); gap: 9px; }
        .deck-atlas-card { padding: 17px; display: flex; flex-direction: column; background: white; border: 1px solid var(--deck-line); border-radius: 9px; }
        .deck-atlas-card.brain,.deck-atlas-card.ct,.deck-atlas-card.organ { grid-column: span 2; }
        .deck-atlas-card.motion,.deck-atlas-card.deep-time { grid-column: span 3; }
        .deck-atlas-card > span { color: var(--deck-mint-dark); font: 8px var(--font-geist-mono),monospace; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
        .deck-atlas-card > strong { margin: 14px 0 5px; font-size: clamp(22px,2.3vw,35px); letter-spacing: -.045em; }
        .deck-atlas-card p { margin: 0 0 10px; color: var(--deck-soft); font-size: 9px; line-height: 1.45; }
        .deck-atlas-card > small { margin-top: auto; color: var(--deck-muted); font-size: 8px; line-height: 1.4; }
        .deck-atlas-card.brain { box-shadow: inset 0 3px #4768ad; }
        .deck-atlas-card.ct { box-shadow: inset 0 3px #00a67e; }
        .deck-atlas-card.organ { box-shadow: inset 0 3px #b77b17; }
        .deck-atlas-card.motion { box-shadow: inset 0 3px #c85f54; }
        .deck-atlas-card.deep-time { box-shadow: inset 0 3px #b93172; }
        .deck-cohort-boundary { padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; gap: 20px; color: #5d737b; background: var(--deck-mint-soft); border-left: 3px solid var(--deck-mint); border-radius: 7px; font-size: 9px; }
        .deck-cohort-boundary strong { color: var(--deck-mint-dark); text-transform: uppercase; letter-spacing: .07em; }
        .deck-boundary-columns { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .deck-boundary-columns > section { padding: clamp(20px,2.4vw,34px); }
        .deck-boundary-columns > section:last-child { background: #f7faf9; }
        .deck-boundary-columns span { color: var(--deck-mint-dark); font: 8px var(--font-geist-mono),monospace; font-weight: 750; letter-spacing: .11em; text-transform: uppercase; }
        .deck-boundary-columns h2 { margin: 10px 0 18px; font-size: clamp(22px,2.2vw,34px); letter-spacing: -.04em; }
        .deck-boundary-columns ul { margin: 0; padding-left: 18px; display: grid; gap: 9px; color: var(--deck-soft); font-size: 10px; line-height: 1.4; }
        .deck-boundary-slide blockquote { margin: 0; padding: 15px 18px; color: var(--deck-ink); background: var(--deck-mint-soft); border-left: 2px solid var(--deck-mint); font-size: clamp(16px,1.7vw,24px); font-weight:400; letter-spacing: -.025em; }
        .deck-final-links { display: flex; justify-content: flex-end; gap: 8px; }
        .deck-final-links a { padding: 10px 14px; color: var(--deck-ink); background: white; border: 1px solid var(--deck-line-strong); font:700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing: .08em; text-transform: uppercase; }
        .deck-final-links a:first-child { color: white; background: var(--deck-mint); border-color: var(--deck-mint); }
        .deck-controls { min-height: 54px; padding: 7px clamp(20px,3vw,46px); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; background:var(--deck-paper); border-top: 1px solid var(--deck-line); }
        .deck-controls > button { width: fit-content; padding: 9px 13px; color: var(--deck-ink); background: transparent; border: 1px solid var(--deck-line-strong); cursor: pointer; font:700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing: .08em; text-transform: uppercase; }
        .deck-controls > button:last-child { justify-self: end; color: white; background: var(--deck-mint); border-color: var(--deck-mint); }
        .deck-controls > button:disabled { opacity: .35; cursor: default; }
        .deck-control-status { display: flex; align-items: center; gap: 12px; color: var(--deck-muted); font: 9px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .deck-control-status strong { color: var(--deck-ink); font-size: 9px; }
        .deck-control-status span { max-width:min(720px,58vw); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        @media (max-width: 1040px) {
          .deck-tabs { overflow-x: auto; grid-template-columns: repeat(6,minmax(150px,1fr)); }
          .deck-slide { min-height: 650px; }
          .deck-question-grid,.deck-null-layout,.deck-direction-layout,.deck-transport-board { grid-template-columns: 1fr; }
          .deck-transport-figures { grid-template-columns:1fr; }
          .deck-stat-strip { grid-template-columns:repeat(3,1fr); }
          .deck-stat-strip > p { grid-column:1/-1; border-top:1px solid var(--deck-line); border-left:0; }
          .deck-null-context,.deck-direction-metrics { grid-template-columns: repeat(4,1fr); }
          .deck-null-context > p { grid-column: 1/-1; }
          .deck-transport-step { min-height: 150px; }
        }
        @media (min-width: 900px) and (max-height: 850px) {
          .results-deck { padding:7px; }
          .deck-window { min-height:calc(100vh - 14px); grid-template-rows:auto auto 2px 1fr auto; }
          .deck-titlebar { min-height:40px; padding:4px 14px; }
          .deck-header-links { gap:22px; }
          .deck-header-links a { padding:13px 0 11px; }
          .deck-tabs { min-height:40px; }
          .deck-tab { min-height:40px; padding:4px 10px; }
          .deck-stage { padding:7px; }
          .deck-slide { min-height:0; padding:10px 18px; gap:6px; }
          .deck-slide-heading { gap:10px; }
          .deck-slide-heading h1 { margin:2px 0; font-size:clamp(28px,2.7vw,36px); }
          .deck-slide-heading p { font-size:10px; line-height:1.2; }
          .deck-pace { padding:4px 7px; }
          .deck-pace small { display:none; }
          .deck-visual-frame { padding:10px 14px; gap:7px; }
          .deck-visual-context { padding-bottom:6px; }
          .deck-question-slide .rv-phase-bar-chart { height:150px; min-height:0; }
          .deck-question-slide .rv-coordinate-panel svg { height:205px; }
          .deck-null-slide .rv-null-chart svg { height:215px; }
          .deck-direction-slide .rv-direction-layout > section:last-child svg { height:245px; }
          .deck-transport-slide .rv-transport-chart svg { height:205px; }
          .deck-transport-slide .rv-transport-robustness svg { min-height:0; height:205px; }
          .deck-atlas-slide { padding:13px 20px; gap:8px; }
          .deck-atlas-loading { min-height:400px; }
          .deck-atlas-slide .rav-main,.deck-atlas-slide .rav-model { min-height:300px; }
          .deck-atlas-slide .rav-model canvas { min-height:300px; }
          .deck-atlas-slide .rav-heat { padding:10px; gap:5px; }
          .deck-atlas-slide .rav-cell { min-height:30px; padding:3px 5px; }
          .deck-atlas-slide .rav-selected { min-height:42px; padding:5px 7px; }
          .deck-atlas-slide .rav-cross-scale { gap:6px; }
          .deck-atlas-slide .rav-mark { min-height:76px; }
          .deck-boundary-slide .rv-evidence-matrix th,.deck-boundary-slide .rv-evidence-matrix td { height:34px; padding-block:4px; }
          .deck-boundary-slide blockquote { padding:10px 14px; }
          .deck-controls { min-height:42px; padding-block:5px; }
        }
        @media (max-width: 720px) {
          .results-deck { padding: 7px; }
          .deck-window { min-height: calc(100vh - 14px); }
          .deck-titlebar { padding: 9px; gap: 9px; }
          .deck-brand span { display: none; }
          .deck-stage { padding: 7px; }
          .deck-slide { min-height: 0; padding: 22px 15px; }
          .deck-slide-heading { grid-template-columns: 1fr; }
          .deck-pace { width: fit-content; justify-self: start; text-align: left; }
          .deck-visual-context { grid-template-columns:1fr; gap:4px; }
          .deck-stat-strip,.deck-metric-ribbon,.deck-transport-meta { grid-template-columns:1fr; }
          .deck-stat-strip > * + *,.deck-metric-ribbon > span + span,.deck-transport-meta > span + span { border-top:1px solid var(--deck-line); border-left:0; }
          .deck-stat-strip > p,.deck-transport-meta p { grid-column:auto; }
          .deck-phase-cards,.deck-coordinate-row,.deck-null-context,.deck-direction-metrics,.deck-transport-ladder,.deck-transport-summary,.deck-boundary-columns { grid-template-columns: 1fr 1fr; }
          .deck-coordinate-row > div:last-child,.deck-transport-summary > div:nth-child(3),.deck-transport-summary p { grid-column: 1/-1; }
          .deck-projection-axis { margin-left: 0; }
          .deck-projection-row { grid-template-columns: 90px minmax(120px,1fr) 48px; gap: 8px; }
          .deck-atlas-grid { grid-template-columns: 1fr; }
          .deck-atlas-card.brain,.deck-atlas-card.ct,.deck-atlas-card.organ,.deck-atlas-card.motion,.deck-atlas-card.deep-time { grid-column: auto; }
          .deck-cohort-boundary { align-items: flex-start; flex-direction: column; gap: 5px; }
          .deck-controls { grid-template-columns: auto 1fr auto; }
          .deck-control-status { justify-content: center; }
          .deck-control-status span { display: none; }
          .deck-slide[data-guided="true"] [data-focus-target] { opacity:.72; }
        }
        @media (max-width: 480px) {
          .deck-phase-cards,.deck-null-context,.deck-direction-metrics,.deck-transport-ladder,.deck-transport-summary,.deck-boundary-columns { grid-template-columns: 1fr; }
          .deck-null-context > p,.deck-transport-summary > div:nth-child(3),.deck-transport-summary p { grid-column: auto; }
          .deck-final-links { flex-direction: column; }
          .deck-final-links a { text-align: center; }
        }
        @media (prefers-reduced-motion: reduce) { .deck-slide { animation: none; } .deck-progress i,.deck-slide[data-guided="true"] [data-focus-target] { transition: none; } }
      `}</style>

      <div className="deck-window">
        <header className="deck-titlebar">
          <Link className="deck-brand" href={queryHref("/", { system: "heart", participant: selectedParticipant })}>
            <strong>HUMANVECTOR</strong>
          </Link>
          <nav className="deck-header-links" aria-label="Results pages">
            <Link href={queryHref("/results", { slide: activeSlide.id, beat: String(beatIndex + 1), participant: selectedParticipant })}>Story</Link>
            <Link href={queryHref("/results", { view: "full", participant: selectedParticipant })}>Evidence</Link>
          </nav>
        </header>

        <nav className="deck-tabs" role="tablist" aria-label="Result slides">
          {SLIDES.map((slide, index) => (
            <button key={slide.id} type="button" className="deck-tab" role="tab" aria-selected={slideIndex === index} aria-controls="active-result-slide" onClick={() => goToSlide(index, 0)}>
              <span>{slide.number}</span><div><strong>{slide.tab}</strong><small>{slide.seconds} sec</small></div>
            </button>
          ))}
        </nav>

        <div className="deck-progress" aria-label={`Slide ${slideIndex + 1} of ${SLIDES.length}`}><i style={{ width: `${progress}%` }} /></div>

        <section id="active-result-slide" className="deck-stage" role="tabpanel" aria-live="polite" aria-label={activeSlide.title}>
          <div key={activeSlide.id}><ActiveSlide index={slideIndex} beatIndex={beatIndex} profile={profile} profiles={profiles} participant={selectedParticipant} /></div>
        </section>

        <footer className="deck-controls">
          <button type="button" disabled={slideIndex === 0 && beatIndex === 0} onClick={goPrevious}>{beatIndex > 0 ? "Previous focus" : "Previous slide"}</button>
          <div className="deck-control-status" aria-live="polite"><strong>{activeSlide.number} / 06 · FOCUS {beatIndex + 1} / {activeSlide.beats.length} · 2 MIN STORY</strong><span>{activeBeat.cue}</span></div>
          <button type="button" disabled={slideIndex === SLIDES.length - 1 && beatIndex === activeSlide.beats.length - 1} onClick={goNext}>{beatIndex < activeSlide.beats.length - 1 ? "Next focus" : "Next slide"}</button>
        </footer>
      </div>
    </main>
  );
}
