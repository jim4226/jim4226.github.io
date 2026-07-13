"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import AnatomyExplorer from "./AnatomyExplorer";
import OrganExplorer from "./OrganExplorer";

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
  beats: number;
  waveform: number[][];
  medianBeat: number[][];
  windows: Record<string, number[]>;
};

type ResultsStoryProps = {
  profiles: Profile[];
};

const storySections = [
  { id: "story-signal", short: "Signal", label: "Signal" },
  { id: "story-geometry", short: "Geometry", label: "Geometry" },
  { id: "story-null", short: "Null", label: "Confirmatory null" },
  { id: "story-direction", short: "Direction", label: "Perturbation direction" },
  { id: "story-transport", short: "Transport", label: "External transport" },
  { id: "story-atlas", short: "Atlas", label: "Cross-scale atlas" },
  { id: "story-future", short: "Future", label: "Future blueprint" },
] as const;

const phases = [
  { key: "P", window: "P", label: "P wave", system: "Atrial depolarization" },
  { key: "AV", window: "PR", label: "AV / PR", system: "Atrioventricular conduction" },
  { key: "QRS", window: "QRS", label: "QRS", system: "Ventricular depolarization" },
  { key: "STT", window: "STT", label: "ST–T", system: "Ventricular repolarization" },
] as const;

const directionProjections = [
  { label: "Dofetilide", value: 0.563, low: 0.254, high: 0.912, kind: "ikr" },
  { label: "Quinidine", value: 0.835, low: 0.514, high: 1.19, kind: "ikr" },
  { label: "Ranolazine", value: 0.209, low: -0.031, high: 0.475, kind: "comparator" },
  { label: "Verapamil", value: 0.117, low: -0.088, high: 0.37, kind: "comparator" },
] as const;

const transportSteps = [
  { label: "Marginal", value: 1.0, p: "p = 0.996" },
  { label: "+ age / sex", value: 1.091, p: "p = 0.0904" },
  { label: "+ intervals", value: 1.153, p: "p = 0.00728" },
  { label: "Fully adjusted", value: 1.225, p: "p = 1.92 × 10⁻⁴" },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function chartPath(
  points: number[][],
  width: number,
  height: number,
  xDomain?: [number, number],
  yDomain?: [number, number],
  padX = 18,
  padY = 20,
) {
  const valid = points.filter((point) => point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]));
  if (!valid.length) return "";
  const xs = valid.map((point) => point[0]);
  const ys = valid.map((point) => point[1]);
  const [minimumX, maximumX] = xDomain ?? [Math.min(...xs), Math.max(...xs)];
  const [minimumY, maximumY] = yDomain ?? [Math.min(...ys), Math.max(...ys)];
  const xSpan = maximumX - minimumX || 1;
  const ySpan = maximumY - minimumY || 1;

  return valid
    .map(([x, y], index) => {
      const chartX = padX + ((x - minimumX) / xSpan) * (width - padX * 2);
      const chartY = padY + (1 - (y - minimumY) / ySpan) * (height - padY * 2);
      return `${index ? "L" : "M"}${chartX.toFixed(2)},${chartY.toFixed(2)}`;
    })
    .join(" ");
}

function SignalFigure({ profile }: { profile: Profile }) {
  const width = 980;
  const height = 300;
  const xValues = profile.medianBeat.map((point) => point[0]);
  const yValues = profile.medianBeat.map((point) => point[1]);
  const xDomain: [number, number] = [Math.min(...xValues), Math.max(...xValues)];
  const yDomain: [number, number] = [Math.min(...yValues) - 0.04, Math.max(...yValues) + 0.04];
  const path = chartPath(profile.medianBeat, width, height, xDomain, yDomain, 24, 28);
  const toX = (value: number) => 24 + ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) * (width - 48);

  return (
    <figure className="result-signal-figure">
      <div className="result-figure-heading">
        <div>
          <span className="result-eyebrow">REAL INPUT · MEDIAN BEAT · LEAD II</span>
          <h3>{profile.source}</h3>
        </div>
        <span className="result-data-chip">{profile.beats} beats · 500 Hz · 12 leads</span>
      </div>
      <svg
        className="result-signal-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="result-signal-title result-signal-desc"
      >
        <title id="result-signal-title">Median ECG beat with four phase windows</title>
        <desc id="result-signal-desc">
          A real PTB-XL median beat divided into P, AV or PR, QRS, and ST-T phase windows for the frozen subsystem clocks.
        </desc>
        {Array.from({ length: 13 }).map((_, index) => (
          <line
            key={`result-signal-v-${index}`}
            x1={24 + index * ((width - 48) / 12)}
            x2={24 + index * ((width - 48) / 12)}
            y1="20"
            y2={height - 24}
            className="result-chart-grid result-chart-grid-minor"
          />
        ))}
        {Array.from({ length: 5 }).map((_, index) => (
          <line
            key={`result-signal-h-${index}`}
            x1="24"
            x2={width - 24}
            y1={28 + index * ((height - 56) / 4)}
            y2={28 + index * ((height - 56) / 4)}
            className="result-chart-grid"
          />
        ))}
        {phases.map((phase) => {
          const window = profile.windows[phase.window];
          if (!window || window.length < 2) return null;
          const start = toX(window[0]);
          const end = toX(window[1]);
          return (
            <g key={phase.key} className={`result-window result-window-${phase.key.toLowerCase()}`}>
              <rect x={start} y="28" width={Math.max(end - start, 2)} height={height - 56} rx="5" />
              <text x={(start + end) / 2} y="48" textAnchor="middle">{phase.label}</text>
            </g>
          );
        })}
        <path className="result-signal-line" d={path} fill="none" stroke="currentColor" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
        <line className="result-r-peak" x1={toX(0)} x2={toX(0)} y1="24" y2={height - 24} />
      </svg>
      <figcaption className="result-figure-caption">
        Four disjoint phase windows feed four frozen age clocks. The whole-ECG clock remains a reference; A, D, and q are calculated from the phase clocks.
      </figcaption>
    </figure>
  );
}

function GeometryFigure({ profile, profiles }: { profile: Profile; profiles: Profile[] }) {
  const width = 620;
  const height = 390;
  const toX = (value: number) => 74 + (clamp(value, 0, 1.5) / 1.5) * 500;
  const toY = (value: number) => 326 - (clamp(value, 0, 4.2) / 4.2) * 266;

  return (
    <figure className="result-geometry-figure">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="result-geometry-title result-geometry-desc">
        <title id="result-geometry-title">A and D geometry for the three licensed ECG profiles</title>
        <desc id="result-geometry-desc">
          A is horizontal and represents shared phase movement. D is vertical and represents covariance-adjusted subsystem disagreement. The selected profile is emphasized.
        </desc>
        <line x1="74" x2="574" y1="326" y2="326" className="result-chart-axis" />
        <line x1="74" x2="74" y1="52" y2="326" className="result-chart-axis" />
        {[0, 1, 2, 3, 4].map((tick) => (
          <g key={`result-d-tick-${tick}`}>
            <line x1="68" x2="574" y1={toY(tick)} y2={toY(tick)} className="result-chart-grid" />
            <text x="57" y={toY(tick) + 5} textAnchor="end" className="result-chart-tick">{tick}</text>
          </g>
        ))}
        {[0, 0.5, 1, 1.5].map((tick) => (
          <g key={`result-a-tick-${tick}`}>
            <line x1={toX(tick)} x2={toX(tick)} y1="326" y2="333" className="result-chart-axis" />
            <text x={toX(tick)} y="353" textAnchor="middle" className="result-chart-tick">{tick.toFixed(1)}</text>
          </g>
        ))}
        <text x="590" y="332" className="result-axis-label">A</text>
        <text x="70" y="35" className="result-axis-label">D</text>
        <path d="M74 326 C192 322 348 273 574 118" className="result-geometry-contour" />
        <path d="M74 326 C208 304 374 190 574 62" className="result-geometry-contour result-geometry-contour-faint" />
        {profiles.map((candidate) => {
          const selected = candidate.id === profile.id;
          return (
            <g key={candidate.id} className={selected ? "result-profile-point result-profile-point-selected" : "result-profile-point"}>
              <circle cx={toX(candidate.A)} cy={toY(candidate.D)} r={selected ? 14 : 8} />
              <text x={toX(candidate.A) + 18} y={toY(candidate.D) + 5}>
                {candidate.profile.replace("Profile ", "")}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="result-coordinate-summary">
        <div><span>A</span><strong>{profile.A.toFixed(3)}</strong><small>shared movement</small></div>
        <div><span>D</span><strong>{profile.D.toFixed(3)}</strong><small>disagreement radius</small></div>
        {profile.q.map((value, index) => (
          <div key={`result-q-${index}`}><span>q{index + 1}</span><strong>{value > 0 ? "+" : ""}{value.toFixed(3)}</strong><small>signed contrast</small></div>
        ))}
      </figcaption>
    </figure>
  );
}

function NullFigure() {
  const width = 780;
  const minimum = 0.96;
  const maximum = 1.06;
  const toX = (value: number) => 80 + ((value - minimum) / (maximum - minimum)) * 640;

  return (
    <figure className="result-null-figure">
      <svg viewBox={`0 0 ${width} 230`} role="img" aria-labelledby="result-null-title result-null-desc">
        <title id="result-null-title">Confirmatory mortality hazard ratio for disagreement D</title>
        <desc id="result-null-desc">Hazard ratio 1.010 per standard deviation, confidence interval 0.983 to 1.039, likelihood-ratio p value 0.478.</desc>
        <line x1={toX(1)} x2={toX(1)} y1="35" y2="160" className="result-null-reference" />
        <text x={toX(1)} y="25" textAnchor="middle" className="result-null-reference-label">no added hazard</text>
        <line x1={toX(0.983)} x2={toX(1.039)} y1="104" y2="104" className="result-null-ci" />
        <line x1={toX(0.983)} x2={toX(0.983)} y1="91" y2="117" className="result-null-ci-cap" />
        <line x1={toX(1.039)} x2={toX(1.039)} y1="91" y2="117" className="result-null-ci-cap" />
        <circle cx={toX(1.01)} cy="104" r="12" className="result-null-estimate" />
        {[0.96, 0.98, 1, 1.02, 1.04, 1.06].map((tick) => (
          <g key={`result-null-tick-${tick}`}>
            <line x1={toX(tick)} x2={toX(tick)} y1="160" y2="168" className="result-chart-axis" />
            <text x={toX(tick)} y="192" textAnchor="middle" className="result-chart-tick">{tick.toFixed(2)}</text>
          </g>
        ))}
        <line x1="80" x2="720" y1="160" y2="160" className="result-chart-axis" />
        <text x="400" y="220" textAnchor="middle" className="result-axis-caption">Hazard ratio per +1 SD of D</text>
      </svg>
      <figcaption className="result-null-readout">
        <div><strong>1.010</strong><span>hazard ratio / SD</span></div>
        <div><strong>0.983–1.039</strong><span>95% confidence interval</span></div>
        <div><strong>0.478</strong><span>likelihood-ratio p</span></div>
      </figcaption>
    </figure>
  );
}

function DirectionFigure() {
  const width = 760;
  const minimum = -0.2;
  const maximum = 1.3;
  const toX = (value: number) => 154 + ((value - minimum) / (maximum - minimum)) * 552;

  return (
    <figure className="result-direction-figure">
      <div className="result-figure-heading">
        <div><span className="result-eyebrow">FROZEN IKr AXIS</span><h3>Drug projection on the signed direction</h3></div>
        <code className="result-direction-vector">w = (−0.381, −0.939, +0.703)</code>
      </div>
      <svg viewBox={`0 0 ${width} 310`} role="img" aria-labelledby="result-direction-title result-direction-desc">
        <title id="result-direction-title">Four drug projections on the frozen IKr direction</title>
        <desc id="result-direction-desc">
          Dofetilide and quinidine project positively with confidence intervals excluding zero. Ranolazine and verapamil are weaker comparators with intervals spanning zero.
        </desc>
        <line x1={toX(0)} x2={toX(0)} y1="34" y2="254" className="result-direction-zero" />
        {directionProjections.map((drug, index) => {
          const y = 62 + index * 58;
          return (
            <g key={drug.label} className={`result-direction-row result-direction-${drug.kind}`}>
              <text x="136" y={y + 5} textAnchor="end">{drug.label}</text>
              <line x1={toX(drug.low)} x2={toX(drug.high)} y1={y} y2={y} className="result-direction-ci" />
              <line x1={toX(drug.low)} x2={toX(drug.low)} y1={y - 8} y2={y + 8} className="result-direction-cap" />
              <line x1={toX(drug.high)} x2={toX(drug.high)} y1={y - 8} y2={y + 8} className="result-direction-cap" />
              <circle cx={toX(drug.value)} cy={y} r="8" className="result-direction-point" />
              <text x={toX(drug.high) + 12} y={y + 5} className="result-direction-value">{drug.value > 0 ? "+" : ""}{drug.value.toFixed(3)}</text>
            </g>
          );
        })}
        <line x1="154" x2="706" y1="274" y2="274" className="result-chart-axis" />
        {[-0.2, 0, 0.4, 0.8, 1.2].map((tick) => (
          <g key={`result-direction-tick-${tick}`}>
            <line x1={toX(tick)} x2={toX(tick)} y1="274" y2="282" className="result-chart-axis" />
            <text x={toX(tick)} y="302" textAnchor="middle" className="result-chart-tick">{tick.toFixed(1)}</text>
          </g>
        ))}
      </svg>
      <figcaption className="result-direction-caption">
        Dofetilide derived the axis in 22 crossover participants; quinidine is held-mechanism support from the same cohort, not independent validation.
      </figcaption>
    </figure>
  );
}

function TransportFigure() {
  const width = 790;
  const height = 330;
  const positions = [110, 300, 490, 680];
  const toY = (value: number) => 246 - ((value - 0.96) / (1.26 - 0.96)) * 180;
  const points = transportSteps.map((step, index) => `${positions[index]},${toY(step.value)}`).join(" ");

  return (
    <figure className="result-transport-figure">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="result-transport-title result-transport-desc">
        <title id="result-transport-title">Adjustment ladder for external QT-extension transport</title>
        <desc id="result-transport-desc">
          The marginal odds ratio is 1.00 and the fully adjusted odds ratio is 1.225 per standard deviation, showing an explicitly conditional suppression pattern.
        </desc>
        <line x1="72" x2="730" y1={toY(1)} y2={toY(1)} className="result-transport-reference" />
        <text x="62" y={toY(1) + 5} textAnchor="end" className="result-chart-tick">1.00</text>
        <polyline points={points} fill="none" className="result-transport-line" />
        {transportSteps.map((step, index) => (
          <g key={step.label} className={index === transportSteps.length - 1 ? "result-transport-step result-transport-step-primary" : "result-transport-step"}>
            <line x1={positions[index]} x2={positions[index]} y1={toY(step.value)} y2="263" className="result-transport-guide" />
            <circle cx={positions[index]} cy={toY(step.value)} r={index === transportSteps.length - 1 ? 12 : 8} />
            <text x={positions[index]} y={toY(step.value) - 18} textAnchor="middle" className="result-transport-value">OR {step.value.toFixed(3)}</text>
            <text x={positions[index]} y="287" textAnchor="middle" className="result-transport-label">{step.label}</text>
            <text x={positions[index]} y="308" textAnchor="middle" className="result-transport-p">{step.p}</text>
          </g>
        ))}
        <line x1={positions[3]} x2={positions[3]} y1={toY(1.1)} y2={toY(1.364)} className="result-transport-ci" />
      </svg>
      <figcaption className="result-transport-caption">
        <strong>44,550 ECGs · 386 physician-assigned QT-extension cases</strong>
        <span>Full model adjusts for age, sex, heart rate, QTc, QRS, whole-ECG age, A, and D.</span>
      </figcaption>
    </figure>
  );
}

export default function ResultsStory({ profiles }: ResultsStoryProps) {
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [activeSection, setActiveSection] = useState<(typeof storySections)[number]["id"]>(storySections[0].id);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("participant");
    if (!requested || !profiles.some((profile) => profile.id === requested)) return;
    const frame = window.requestAnimationFrame(() => setProfileId(requested));
    return () => window.cancelAnimationFrame(frame);
  }, [profiles]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id as (typeof storySections)[number]["id"]);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.05, 0.25, 0.6] },
    );

    storySections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const profile = profiles.find((candidate) => candidate.id === profileId) ?? profiles[0];
  if (!profile) return null;

  const participantQuery = `?participant=${encodeURIComponent(profile.id)}`;
  const updateProfile = (nextId: string) => {
    setProfileId(nextId);
    const url = new URL(window.location.href);
    url.searchParams.set("participant", nextId);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <main className="story-site">
      <a className="story-skip-link" href="#story-signal">Skip to the results story</a>

      <header className="story-header">
        <a className="story-brand" href={`/participant${participantQuery}`} aria-label="HumanVector results evidence appendix">
          <span className="story-product-name">HumanVector</span>
          <small>Results evidence appendix</small>
        </a>
        <nav className="story-header-links" aria-label="Site pages">
          <a href={`/?participant=${profile.id}`}>Atlas viewer</a>
          <a href={`/participant${participantQuery}`}>Participant explorer</a>
          <a href={`/results${participantQuery}`}>Presenter deck</a>
        </nav>
        <span className="story-research-pill">Research use only</span>
      </header>

      <aside className="story-disclosure" aria-label="Cross-cohort disclosure">
        <strong>Cross-cohort atlas.</strong>
        <span>Participant mode uses real PTB-XL ECG records. Brain, CT, organ, movement, and genomic panels summarize separate public cohorts and are never attributed to the selected participant.</span>
      </aside>

      <section className="story-hero" aria-labelledby="story-title">
        <div className="story-hero-copy">
          <span className="result-eyebrow">FROM A 10-SECOND ECG TO A MULTISCALE RESEARCH ATLAS</span>
          <h1 id="story-title">The failed hypothesis became the discovery.</h1>
          <p>
            One apparent biological age hides structure. Follow a real ECG through frozen phase clocks, an honest confirmatory null, a mechanism-aligned direction, and a cross-cohort atlas that shows both the reach and the limits of the idea.
          </p>
        </div>
        <div className="story-profile-control">
          <label htmlFor="story-profile-select">Follow one real ECG</label>
          <select id="story-profile-select" value={profile.id} onChange={(event) => updateProfile(event.target.value)}>
            {profiles.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.profile} · {candidate.age} y · {candidate.sex} · {candidate.title}
              </option>
            ))}
          </select>
          <div className="story-profile-meta">
            <span>{profile.id}</span><span>{profile.label}</span><span>{profile.source}</span>
          </div>
        </div>
      </section>

      <nav className="story-progress" aria-label="Results story progress">
        <ol>
          {storySections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} aria-current={activeSection === section.id ? "step" : undefined}>
                <span>{String(index + 1).padStart(2, "0")}</span>{section.short}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="story-sections">
        <section className="story-section result-signal-section" id="story-signal" aria-labelledby="story-signal-heading">
          <div className="story-section-intro">
            <span className="result-section-number">01 · SIGNAL</span>
            <h2 id="story-signal-heading">One age hides four clocks.</h2>
            <p>
              The selected real ECG is aligned beat-by-beat, reduced to a median beat, and separated into the electrical phases that generate it.
            </p>
          </div>
          <SignalFigure profile={profile} />
          <div className="result-phase-cards">
            {phases.map((phase) => (
              <article key={phase.key} className={`result-phase-card result-phase-card-${phase.key.toLowerCase()}`}>
                <span>{phase.label}</span>
                <strong>{profile.phaseAges[phase.key].toFixed(1)} y</strong>
                <small>{profile.gaps[phase.key] > 0 ? "+" : ""}{profile.gaps[phase.key].toFixed(1)} y versus chronological age</small>
                <p>{phase.system}</p>
              </article>
            ))}
          </div>
          <p className="result-caveat">Research representation only. These phase ages are model outputs, not diagnoses or literal tissue ages.</p>
        </section>

        <section className="story-section result-geometry-section" id="story-geometry" aria-labelledby="story-geometry-heading">
          <div className="story-section-intro">
            <span className="result-section-number">02 · GEOMETRY</span>
            <h2 id="story-geometry-heading">Shared movement and disagreement are different coordinates.</h2>
            <p>
              A projects the four phase gaps onto their common direction. D measures the covariance-adjusted radius of their disagreement. The signed q coordinates retain which way the phases differ.
            </p>
          </div>
          <div className="result-geometry-layout">
            <GeometryFigure profile={profile} profiles={profiles} />
            <aside className="result-geometry-explainer">
              <div><span>A</span><h3>How far do the systems move together?</h3><p>An equal-weight shared axis over the four age- and sex-adapted phase gaps.</p></div>
              <div><span>D</span><h3>How strongly do they disagree?</h3><p>An unsigned Mahalanobis radius in the contrast subspace. It preserves distance but discards direction.</p></div>
              <div><span>q</span><h3>Which way do they disagree?</h3><p>Three signed, orthogonal contrasts that retain the pattern compressed by D.</p></div>
            </aside>
          </div>
        </section>

        <section className="story-section result-null-section" id="story-null" aria-labelledby="story-null-heading">
          <div className="story-section-intro">
            <span className="result-section-number">03 · LOCKED CONFIRMATORY NULL</span>
            <h2 id="story-null-heading">Distance was not enough.</h2>
            <p>
              In the single preregistered, firewall-protected mortality reveal, D added no information beyond age, sex, the shared axis A, and a whole-ECG age clock.
            </p>
          </div>
          <NullFigure />
          <div className="result-null-context">
            <div><strong>74,715</strong><span>complete cases</span></div>
            <div><strong>2,583</strong><span>deaths</span></div>
            <div><strong>3.4 y</strong><span>median follow-up</span></div>
            <p>The confidence interval excludes an effect as large as the development estimate. This is an informative null, not proof that disagreement never matters.</p>
          </div>
        </section>

        <section className="story-section result-direction-section" id="story-direction" aria-labelledby="story-direction-heading">
          <div className="story-section-intro">
            <span className="result-section-number">04 · MECHANISTIC EXPLORATION</span>
            <h2 id="story-direction-heading">A controlled perturbation supplied the missing arrow.</h2>
            <p>
              Randomized IKr blockade displaced the ST–T repolarization clock along a stable signed axis—the coordinate an unsigned radius cannot preserve.
            </p>
          </div>
          <div className="result-direction-layout">
            <DirectionFigure />
            <aside className="result-direction-metrics">
              <div><span>Bootstrap direction</span><strong>cos<sub>Σ</sub> 0.941</strong><small>95% CI 0.635–0.998</small></div>
              <div><span>Sign stability</span><strong>99.99%</strong><small>9,999 / 10,000 participant bootstraps</small></div>
              <div><span>Permutation</span><strong>p = 0.033</strong><small>nominal; Holm-adjusted p = 0.069</small></div>
              <div><span>Held mechanism</span><strong>+0.835</strong><small>quinidine; 95% CI 0.514–1.190</small></div>
            </aside>
          </div>
          <p className="result-caveat">
            The direction derivation is exploratory. Quinidine was measured in the same crossover cohort; it is held-mechanism support, not an independent external validation.
          </p>
        </section>

        <section className="story-section result-transport-section" id="story-transport" aria-labelledby="story-transport-heading">
          <div className="story-section-intro">
            <span className="result-section-number">05 · EXTERNAL CONDITIONAL SUPPORT</span>
            <h2 id="story-transport-heading">Frozen first. Then transported without refitting.</h2>
            <p>
              The IKr direction was carried unchanged into Chapman–Shaoxing and Ningbo. Its association emerges only after adjustment: the suppression pattern is the result, not a footnote.
            </p>
          </div>
          <TransportFigure />
          <div className="result-transport-summary">
            <article><span>Fully adjusted</span><strong>OR 1.225 / SD</strong><small>95% CI 1.10–1.364 · LRT p = 1.92 × 10⁻⁴</small></article>
            <article><span>Marginal</span><strong>OR 1.00</strong><small>p = 0.996</small></article>
            <article><span>Rhythm exclusion</span><strong>OR 0.931</strong><small>p = 0.481 · 86 cases · post hoc</small></article>
          </div>
          <p className="result-caveat">
            Reviewer-safe claim: the frozen direction added conditional information about a physician-assigned QT-extension label beyond conventional intervals, A, and D. It is not claimed to outperform QTc, and the association is rhythm-sensitive.
          </p>
        </section>

        <section className="story-section result-atlas-section" id="story-atlas" aria-labelledby="story-atlas-heading">
          <div className="result-atlas-divider">
            <strong>The selected participant journey ends here.</strong>
            <span>Every panel below is cohort-level evidence from a different public dataset.</span>
          </div>
          <div className="story-section-intro">
            <span className="result-section-number">06 · SUPPORTING CROSS-SCALE ATLAS</span>
            <h2 id="story-atlas-heading">The same question, asked honestly at other scales.</h2>
            <p>
              These analyses share a coordinate-based stance, not participants, measurements, or a fitted causal chain.
            </p>
          </div>
          <AnatomyExplorer />
          <figure className="ct-proof-panel">
            <div className="ct-proof-image">
              <Image src="/evidence/ct-segmentation-proof.png" alt="Axial source CT slice from TotalSegmentator subject s1045 shown beside the heart label and skeletal mask boundaries" fill unoptimized sizes="(max-width: 760px) 100vw, 1200px" />
            </div>
            <figcaption>
              <span>Scan-to-mesh proof</span>
              <p>The 3D body above comes from this multi-label CT volume. Heart label 51 and the skeletal boundaries are shown directly on axial slice 322 before surface extraction.</p>
            </figcaption>
          </figure>
          <OrganExplorer />
          <div className="result-atlas-grid">
            <article className="result-atlas-card result-atlas-card-media">
              <figure className="result-media-crop result-media-crop-brain">
                <Image src="/evidence/brain-anatomy.png" alt="Cropped comparison of separate younger and older LEMON T1 MRI participants with tissue segmentation" fill unoptimized sizes="(max-width: 760px) 100vw, 32vw" />
              </figure>
              <div className="result-atlas-card-copy">
                <span className="result-evidence-badge">Supporting · cross-sectional</span>
                <h3>Brain MRI · LEMON</h3>
                <p>Four complementary views from the same T1 acquisition disagree more in the older group.</p>
                <dl>
                  <div><dt>Young D</dt><dd>0.340</dd></div>
                  <div><dt>Older D</dt><dd>0.517</dd></div>
                  <div><dt>Difference</dt><dd>+0.177</dd></div>
                  <div><dt>Evidence</dt><dd>p = 4.3 × 10⁻⁸ · d = 0.844 · n = 220</dd></div>
                </dl>
                <small>Separate participants, not before/after scans. The views are complementary, not statistically independent.</small>
              </div>
            </article>

            <article className="result-atlas-card result-atlas-card-media">
              <figure className="result-media-crop result-media-crop-skeleton">
                <Image src="/evidence/skeleton-aging.png" alt="Cropped CT-segmented skeleton colored by population-level association between bone volume and age" fill unoptimized sizes="(max-width: 760px) 100vw, 32vw" />
              </figure>
              <div className="result-atlas-card-copy">
                <span className="result-evidence-badge">Supporting · descriptive</span>
                <h3>Skeleton CT · TotalSegmentator</h3>
                <p>A volume-only structural clock localizes age information across approximately 115 segmented structures.</p>
                <dl>
                  <div><dt>Cohort</dt><dd>1,227 CT exams</dd></div>
                  <div><dt>MAE</dt><dd>8.56 y</dd></div>
                  <div><dt>R²</dt><dd>0.432</dd></div>
                  <div><dt>Leading bone</dt><dd>Femur ρ ≈ 0.27</dd></div>
                </dl>
                <small>The heatmap is a population correlation painted on representative anatomy s1045—not that person’s trajectory, and unadjusted for sex, body size, scan coverage, and indication.</small>
              </div>
            </article>

            <article className="result-atlas-card result-atlas-card-data">
              <span className="result-evidence-badge">Prespecified null</span>
              <h3>Movement · MotionVector</h3>
              <p>The framework reaches a boundary: compressing seven-day movement into an age residual loses functional information carried by raw activity.</p>
              <div className="result-boundary-number"><strong>OR 1.10</strong><span>95% CI 0.99–1.23 · p = 0.070 · n = 2,891</span></div>
              <small>The data work; the reserve construct does not add a clean orthogonal signal.</small>
            </article>

            <article className="result-atlas-card result-atlas-card-data">
              <span className="result-evidence-badge">Prospective hypothesis screen</span>
              <h3>Deep time · Skeletome</h3>
              <p>A Borzoi sequence-to-coverage screen prioritizes skeletal-lineage hypotheses without claiming regulatory validation.</p>
              <div className="result-filter-flow" aria-label="Skeletome filtering flow">
                <span><strong>1,955</strong><small>HAR substitutions</small></span><i aria-hidden="true">→</i><span><strong>722</strong><small>candidates</small></span><i aria-hidden="true">→</i><span><strong>p = 0.24</strong><small>matched GWAS enrichment null</small></span>
              </div>
              <small>No biological discovery or demonstrated disease-locus enrichment is claimed.</small>
            </article>
          </div>
        </section>

        <section className="story-section result-future-section" id="story-future" aria-labelledby="story-future-heading">
          <div className="story-section-intro">
            <span className="result-section-number">07 · FUTURE CONCEPT</span>
            <h2 id="story-future-heading">A whole-person vector is the destination—not the current dataset.</h2>
            <p>
              HumanVector demonstrates a reusable coordinate language across independent public cohorts. A true participant-level atlas requires linked, longitudinal multimodal measurements.
            </p>
          </div>
          <div className="result-future-columns">
            <article>
              <span>Demonstrated now</span>
              <h3>A verified cross-cohort evidence atlas</h3>
              <ul>
                <li>Frozen ECG inference from real licensed examples</li>
                <li>Controlled human perturbation direction</li>
                <li>Conditional external phenotype transport</li>
                <li>Supporting MRI, CT, organ, movement, and genomic analyses</li>
                <li>Confirmatory and prespecified nulls reported as results</li>
              </ul>
            </article>
            <article>
              <span>Requires future linked data</span>
              <h3>A longitudinal whole-person state vector</h3>
              <ul>
                <li>Same-person ECG, MRI, CT, laboratory, and activity measurements</li>
                <li>Dated repeat visits and outcomes</li>
                <li>Participant-level multimodal calibration</li>
                <li>Cellular and molecular measurements</li>
                <li>Independent prospective clinical validation</li>
              </ul>
            </article>
          </div>
          <blockquote className="result-closing-statement">
            Preserve biological structure instead of compressing every measurement into one number.
          </blockquote>
          <div className="result-final-actions">
            <a href={`/participant${participantQuery}`}>Return to participant explorer</a>
            <a href="#story-signal">Replay from the signal</a>
          </div>
        </section>
      </div>
    </main>
  );
}
