"use client";

import Link from "next/link";
import { createElement, useEffect, useMemo, useState, type CSSProperties } from "react";

type Point = [number, number];

export type Profile = {
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
  waveform: Point[];
  medianBeat: Point[];
  windows: Record<string, [number, number]>;
};

type PhaseKey = "P" | "AV" | "QRS" | "STT";

const phases: Array<{
  key: PhaseKey;
  window: string;
  label: string;
  long: string;
  copy: string;
}> = [
  { key: "P", window: "P", label: "P", long: "Atrial activation", copy: "The opening electrical phase of the beat." },
  { key: "AV", window: "PR", label: "AV", long: "AV conduction", copy: "The hand-off from atria to ventricles." },
  { key: "QRS", window: "QRS", label: "QRS", long: "Ventricular activation", copy: "Rapid depolarization of the ventricles." },
  { key: "STT", window: "STT", label: "ST-T", long: "Ventricular recovery", copy: "The repolarization phase exposed by the signed direction." },
];

function linePath(points: Point[], width: number, height: number, padX = 12, padY = 16) {
  if (!points.length) return "";
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xSpan = maxX - minX || 1;
  const ySpan = maxY - minY || 1;
  return points
    .map(([x, y], index) => {
      const px = padX + ((x - minX) / xSpan) * (width - padX * 2);
      const py = padY + (1 - (y - minY) / ySpan) * (height - padY * 2);
      return `${index ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(" ");
}

function WaveformChart({ profile }: { profile: Profile }) {
  const width = 960;
  const height = 250;
  const path = useMemo(() => linePath(profile.waveform, width, height, 12, 24), [profile]);

  return (
    <section className="signal-panel" aria-labelledby="lead-title">
      <div className="panel-topline">
        <div>
          <span className="data-kicker">Real input · lead II</span>
          <h2 id="lead-title">Four seconds of the selected ECG</h2>
        </div>
        <div className="stream-meta"><i /> 500 Hz · 12-lead source</div>
      </div>
      <div className="wave-wrap">
        <svg className="waveform-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Lead II ECG trace for public record ${profile.id}`}>
          <title>Lead II ECG waveform</title>
          <desc>A four-second segment from the selected real PTB-XL record.</desc>
          {Array.from({ length: 25 }).map((_, index) => (
            <line key={`x${index}`} x1={index * 40} x2={index * 40} y1="0" y2={height} className="ecg-grid minor" />
          ))}
          {Array.from({ length: 9 }).map((_, index) => (
            <line key={`y${index}`} y1={index * 31.25} y2={index * 31.25} x1="0" x2={width} className="ecg-grid" />
          ))}
          <path d={path} className="ecg-path" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="wave-axis"><span>0 s</span><span>1 s</span><span>2 s</span><span>3 s</span><span>4 s</span></div>
      </div>
    </section>
  );
}

function MedianBeat({ profile, phase }: { profile: Profile; phase: PhaseKey }) {
  const width = 640;
  const height = 210;
  const path = useMemo(() => linePath(profile.medianBeat, width, height, 16, 22), [profile]);
  const selected = phases.find((item) => item.key === phase) ?? phases[0];
  const xs = profile.medianBeat.map(([x]) => x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const [start, end] = profile.windows[selected.window] ?? [0, 0];
  const left = 16 + ((start - minX) / (maxX - minX || 1)) * (width - 32);
  const right = 16 + ((end - minX) / (maxX - minX || 1)) * (width - 32);

  return (
    <div className="median-panel">
      <div className="mini-heading">
        <div><span>Median beat</span><strong>{profile.beats} aligned beats</strong></div>
        <span className="phase-readout">{selected.label} · {profile.phaseAges[phase].toFixed(1)} apparent years</span>
      </div>
      <svg className="median-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Median ECG beat with ${selected.long} highlighted`}>
        <title>Median beat and active electrical phase</title>
        <desc>The selected phase window is highlighted behind the median ECG beat.</desc>
        <rect x={Math.min(left, right)} y="0" width={Math.max(Math.abs(right - left), 5)} height={height} className="phase-window" />
        <line x1="16" x2={width - 16} y1={height / 2} y2={height / 2} className="median-baseline" />
        <path d={path} className="median-path" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="phase-explainer"><strong>{selected.long}</strong><span>{selected.copy}</span></div>
    </div>
  );
}

function PhaseAgeChart({ profile, phase, onPhase }: { profile: Profile; phase: PhaseKey; onPhase: (phase: PhaseKey) => void }) {
  const min = 15;
  const max = 90;
  const chronoPosition = ((profile.age - min) / (max - min)) * 100;

  return (
    <div className="phase-age-panel">
      <div className="mini-heading">
        <div><span>Subsystem clocks</span><strong>Apparent age by phase</strong></div>
        <span className="chrono-key"><i /> chronological {profile.age}</span>
      </div>
      <div className="phase-bars">
        {phases.map((item) => {
          const value = profile.phaseAges[item.key];
          const width = Math.max(4, ((value - min) / (max - min)) * 100);
          const gap = value - profile.age;
          return (
            <button key={item.key} type="button" className={`phase-bar-row ${phase === item.key ? "active" : ""}`} onClick={() => onPhase(item.key)} aria-pressed={phase === item.key}>
              <span className="phase-bar-label">{item.label}</span>
              <span className="phase-track">
                <i className="phase-fill" style={{ width: `${width}%` }} />
                <i className="chrono-line" style={{ left: `${chronoPosition}%` }} />
              </span>
              <strong>{value.toFixed(1)}</strong>
              <em className={gap >= 0 ? "older" : "younger"}>{gap >= 0 ? "+" : ""}{gap.toFixed(1)}</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ADPlane({ profiles, selectedId }: { profiles: Profile[]; selectedId: string }) {
  const width = 410;
  const height = 260;
  const pad = 36;
  const point = (profile: Profile) => ({
    x: pad + (profile.A / 1.5) * (width - pad * 2),
    y: height - pad - (profile.D / 4.2) * (height - pad * 2),
  });

  return (
    <div className="ad-panel">
      <div className="mini-heading">
        <div><span>Coordinate space</span><strong>Shared axis A vs disagreement D</strong></div>
      </div>
      <svg className="ad-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="A versus D plane showing all three ECG profiles">
        <title>A versus D coordinate plane</title>
        <desc>The selected ECG is emphasized among three bundled PTB-XL examples.</desc>
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = height - pad - (tick / 4.2) * (height - pad * 2);
          return <g key={tick}><line x1={pad} x2={width - pad} y1={y} y2={y} className="axis-grid" /><text x={pad - 10} y={y + 4} textAnchor="end">{tick}</text></g>;
        })}
        {[0, 0.5, 1, 1.5].map((tick) => {
          const x = pad + (tick / 1.5) * (width - pad * 2);
          return <g key={tick}><line x1={x} x2={x} y1={pad} y2={height - pad} className="axis-grid" /><text x={x} y={height - 12} textAnchor="middle">{tick}</text></g>;
        })}
        <text x="14" y="22" className="axis-title">D</text>
        <text x={width - 18} y={height - 12} className="axis-title">A</text>
        {profiles.map((profile) => {
          const p = point(profile);
          const selected = profile.id === selectedId;
          return (
            <g key={profile.id} className={selected ? "ad-point selected" : "ad-point"}>
              {selected && <circle cx={p.x} cy={p.y} r="14" className="point-halo" />}
              <circle cx={p.x} cy={p.y} r={selected ? 7 : 5} />
              <text x={p.x + 10} y={p.y - 9}>{profile.profile.replace("Profile ", "")}</text>
            </g>
          );
        })}
      </svg>
      <div className="ad-values"><span><b>A {profiles.find((p) => p.id === selectedId)?.A.toFixed(3)}</b> shared movement</span><span><b>D {profiles.find((p) => p.id === selectedId)?.D.toFixed(3)}</b> disagreement</span></div>
    </div>
  );
}

function HeartReference({ phase, onPhase }: { phase: PhaseKey; onPhase: (phase: PhaseKey) => void }) {
  const active = phases.find((item) => item.key === phase) ?? phases[0];
  const [view, setView] = useState<"phase" | "neutral">("phase");
  const sequence = phases.findIndex((item) => item.key === phase) + 1;
  const heartSrc = view === "neutral"
    ? "/models/heart-four-chamber-neutral.glb"
    : `/models/heart-four-chamber-${phase}.glb`;

  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  const regionNote = phase === "AV"
    ? "The source has no separately segmented AV node; the transition is shown across the adjacent chamber surfaces."
    : "Color is an explanatory phase-localization overlay on the segmented surfaces—not measured voltage or patient-specific saliency.";

  return (
    <div className="heart-panel" data-phase={phase}>
      <div className="heart-head">
        <span className="data-kicker">Real MRI segmentation</span>
        <div className="heart-view-toggle" role="group" aria-label="Heart rendering">
          <button type="button" aria-pressed={view === "phase"} onClick={() => setView("phase")}>Phase heat</button>
          <button type="button" aria-pressed={view === "neutral"} onClick={() => setView("neutral")}>Neutral anatomy</button>
        </div>
      </div>
      <div className="heart-stage">
        <div className="heart-aura" />
        <span className="heart-model-proof">5 literature-derived surfaces · MRI segmented</span>
        {createElement("model-viewer", {
          key: heartSrc,
          src: heartSrc,
          alt: "Interactive four-chamber heart made from MRI-segmented atrial and ventricular cavity surfaces with a translucent epicardial surface",
          "camera-controls": true,
          "interaction-prompt": "none",
          "shadow-intensity": "0.34",
          "shadow-softness": "0.8",
          exposure: "1.12",
          "field-of-view": "34deg",
          style: { width: "100%", height: "100%", position: "relative", zIndex: 2 } as CSSProperties,
        })}
      </div>
      <div className="heart-region-controls" role="group" aria-label="Cardiac phase localization">
        {phases.map((item, index) => (
          <button key={item.key} type="button" onClick={() => onPhase(item.key)} aria-pressed={phase === item.key}>
            <span>0{index + 1}</span><strong>{item.label}</strong><small>{item.long}</small>
          </button>
        ))}
      </div>
      <div className="heart-caption">
        <div><span>Sequence 0{sequence} / 04</span><strong>{active.long}</strong></div>
        <p>{view === "neutral" ? "MRI-segmented chamber cavities and epicardial surface; illustrative reference anatomy, not this ECG participant." : regionNote}</p>
      </div>
      <a className="heart-provenance" href="https://zenodo.org/records/5573921" target="_blank" rel="noreferrer">Gerach et al. · CardioMechanics · 1.5 T MRI · CC BY-NC 4.0 ↗</a>
    </div>
  );
}

function ParticipantCard({ profile, selected, onSelect }: { profile: Profile; selected: boolean; onSelect: () => void }) {
  const dLabel = profile.D >= 2 ? "High D" : profile.D >= 0.75 ? "Medium D" : "Low D";
  return (
    <button type="button" className={`participant-card ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className="participant-card-top"><b>{profile.profile}</b><i className={`d-dot d-${dLabel.split(" ")[0].toLowerCase()}`} />{dLabel}</span>
      <strong>{profile.id}</strong>
      <span>{profile.age} years · {profile.sex === "M" ? "male" : "female"}</span>
      <small>{profile.label}</small>
      <em>A {profile.A.toFixed(3)} · D {profile.D.toFixed(3)}</em>
    </button>
  );
}

export default function HumanVectorAtlas({ profiles }: { profiles: Profile[] }) {
  const [selectedId, setSelectedId] = useState(profiles[0]?.id ?? "");
  const [urlReady, setUrlReady] = useState(false);
  const [phase, setPhase] = useState<PhaseKey>("STT");
  const [search, setSearch] = useState("");
  const [ageBand, setAgeBand] = useState("all");
  const [sex, setSex] = useState("all");
  const [dBand, setDBand] = useState("all");

  const filtered = useMemo(() => profiles.filter((profile) => {
    const text = `${profile.id} ${profile.profile} ${profile.title} ${profile.source}`.toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (ageBand === "18-39" && !(profile.age >= 18 && profile.age <= 39)) return false;
    if (ageBand === "40-64" && !(profile.age >= 40 && profile.age <= 64)) return false;
    if (ageBand === "65+" && profile.age < 65) return false;
    if (sex !== "all" && profile.sex !== sex) return false;
    if (dBand === "low" && profile.D >= 0.75) return false;
    if (dBand === "medium" && !(profile.D >= 0.75 && profile.D < 2)) return false;
    if (dBand === "high" && profile.D < 2) return false;
    return true;
  }), [profiles, search, ageBand, sex, dBand]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("participant");
    const nextId = requested && profiles.some((profile) => profile.id === requested)
      ? requested
      : profiles[0]?.id;
    const frame = window.requestAnimationFrame(() => {
      if (nextId) setSelectedId(nextId);
      setUrlReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [profiles]);

  useEffect(() => {
    if (!filtered.length || filtered.some((profile) => profile.id === selectedId)) return;
    const nextId = filtered[0].id;
    const frame = window.requestAnimationFrame(() => setSelectedId(nextId));
    return () => window.cancelAnimationFrame(frame);
  }, [filtered, selectedId]);

  const selected = profiles.find((profile) => profile.id === selectedId) ?? profiles[0];

  useEffect(() => {
    if (!selected || !urlReady) return;
    const url = new URL(window.location.href);
    url.searchParams.set("participant", selected.id);
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [selected, urlReady]);

  if (!selected) return null;

  const resetFilters = () => {
    setSearch("");
    setAgeBand("all");
    setSex("all");
    setDBand("all");
  };

  return (
    <main className="atlas-dashboard participant-dashboard">
      <div className="atlas-app-shell participant-app-shell">
        <header className="atlas-titlebar participant-titlebar">
          <Link className="atlas-wordmark" href={`/?participant=${selected.id}`} aria-label="HumanVector Atlas home">
            <span className="atlas-product-name">HumanVector</span>
            <small>Participant signal explorer</small>
          </Link>
          <nav aria-label="Atlas pages">
            <Link href={`/?participant=${selected.id}`}>Atlas viewer</Link>
            <Link href={`/participant?participant=${selected.id}`} aria-current="page">Participant</Link>
            <Link href={`/results?participant=${selected.id}`}>Results</Link>
          </nav>
          <span className="atlas-demo-status">Research use only</span>
        </header>

        <aside className="atlas-context-strip" aria-label="Cross-cohort record boundary">
          <span><strong>Participant record boundary.</strong> This workspace contains a real PTB-XL ECG; anatomy panels are literature-derived reference context.</span>
          <span>{selected.source} · {selected.beats} aligned beats</span>
        </aside>

        <nav className="atlas-system-tabs participant-section-tabs" aria-label="Participant workspace sections">
          <a href="#record-workspace">01 / RECORD</a>
          <a href="#signal-profile">02 / SIGNAL PROFILE</a>
          <a href="#evidence-boundary">03 / EVIDENCE BOUNDARY</a>
        </nav>

        <section className="atlas-workspace participant-workspace" aria-label="Participant signal workspace">
          <div className="scan-explorer participant-scan-explorer">
            <div className="scan-topbar participant-scan-topbar">
              <div>
                <span className="scan-sequence">01 / PTB-XL ECG</span>
                <span><strong>{selected.profile} · {selected.id}</strong><small>Real public 12-lead recording · synchronized electrical phase view</small></span>
              </div>
              <label className="scan-record-select">
                <span>Dataset record</span>
                <select value={selected.id} onChange={(event) => { resetFilters(); setSelectedId(event.target.value); }}>
                  {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.id} · {profile.age} y · {profile.sex}</option>)}
                </select>
              </label>
              <span className="scan-ready"><i /> {filtered.length} of {profiles.length} records visible</span>
            </div>

            <div id="record-workspace" className="scan-layout participant-scan-layout">
              <aside className="scan-nav participant-filter-rail" aria-label="Dataset filters and records">
                <span>Dataset filters</span>
                <div className="participant-filter-controls">
                  <label className="scan-record-select participant-search-control"><span>Record search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID or source" /></label>
                  <label className="scan-record-select"><span>Age</span><select value={ageBand} onChange={(event) => setAgeBand(event.target.value)}><option value="all">All ages</option><option value="18-39">18–39</option><option value="40-64">40–64</option><option value="65+">65+</option></select></label>
                  <label className="scan-record-select"><span>Sex</span><select value={sex} onChange={(event) => setSex(event.target.value)}><option value="all">All</option><option value="F">Female</option><option value="M">Male</option></select></label>
                  <label className="scan-record-select"><span>Disagreement D</span><select value={dBand} onChange={(event) => setDBand(event.target.value)}><option value="all">All bands</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                </div>
                <span>Matching records · {filtered.length}</span>
                {filtered.length ? (
                  <div className="participant-record-list">
                    {filtered.map((profile) => <ParticipantCard key={profile.id} profile={profile} selected={profile.id === selected.id} onSelect={() => setSelectedId(profile.id)} />)}
                  </div>
                ) : (
                  <div className="no-results participant-no-results"><strong>No bundled record matches those filters.</strong><button type="button" onClick={resetFilters}>Clear filters</button></div>
                )}
              </aside>

              <section id="signal-profile" className="participant-main-workspace" aria-labelledby="selected-profile">
                <div className="section-title-row profile-heading participant-profile-heading">
            <div><span className="section-number">02</span><div><p>Selected participant</p><h2 id="selected-profile">{selected.profile} · {selected.id}</h2></div></div>
            <div className="profile-badges"><span>PTB-XL</span><span>{selected.age} y · {selected.sex}</span><span>{selected.label}</span></div>
          </div>

          <WaveformChart profile={selected} />

          <div className="phase-selector" role="group" aria-label="Electrical phase">
            <span>Synchronize the view</span>
            {phases.map((item) => <button key={item.key} type="button" onClick={() => setPhase(item.key)} aria-pressed={phase === item.key}><i />{item.label}<small>{item.long}</small></button>)}
          </div>

          <div className="workspace-grid">
            <div className="analysis-column">
              <MedianBeat profile={selected} phase={phase} />
              <PhaseAgeChart profile={selected} phase={phase} onPhase={setPhase} />
            </div>
            <HeartReference phase={phase} onPhase={setPhase} />
          </div>

          <div className="coordinate-grid">
            <ADPlane profiles={profiles} selectedId={selected.id} />
            <div className="q-panel">
              <div className="mini-heading"><div><span>Signed contrast</span><strong>Direction q</strong></div><span className="mechanism-badge">Mechanistic coordinate</span></div>
              <div className="q-vector" aria-label={`Contrast vector values ${selected.q.join(", ")}`}>
                {selected.q.map((value, index) => <div key={index}><span>q{index + 1}</span><i className={value >= 0 ? "positive" : "negative"} style={{ "--q-size": `${Math.min(Math.abs(value) / 3, 1) * 100}%` } as CSSProperties} /><strong>{value > 0 ? "+" : ""}{value.toFixed(3)}</strong></div>)}
              </div>
              <p>A and D retain shared movement and spread. q retains the signed pattern that can align with a mechanism.</p>
            </div>
          </div>
        </section>

              <aside id="evidence-boundary" className="scan-detail participant-metrics-rail" aria-live="polite">
                <span className="scan-detail-kicker">Selected record</span>
                <h3>{selected.id}</h3>
                <p>{selected.age} years · {selected.sex === "M" ? "male" : "female"} · {selected.label}</p>

                <div className="scan-metrics" aria-label="Selected ECG summary">
                  <div><span>Chronological age</span><strong>{selected.age}</strong><small>years</small></div>
                  <div><span>Whole-ECG age</span><strong>{selected.phaseAges.global.toFixed(1)}</strong><small>apparent years</small></div>
                  <div><span>Shared axis A</span><strong>{selected.A.toFixed(3)}</strong><small>shared movement</small></div>
                  <div><span>Disagreement D</span><strong>{selected.D.toFixed(3)}</strong><small>phase spread</small></div>
                </div>

                <div className="scan-proof">
                  <span>Record evidence</span>
                  <p>Lead II waveform, median beat, age coordinates, A, D, and q are linked to this selected public ECG record.</p>
                </div>

                <div className="scan-boundary">
                  <span>Evidence boundary</span>
                  <p><strong>Brain MRI</strong> · not measured for this PTB-XL record.</p>
                  <p><strong>CT skeleton</strong> · not measured for this PTB-XL record.</p>
                  <p><strong>Blood-panel organs</strong> · not measured for this PTB-XL record.</p>
                </div>

                <div className="scan-boundary participant-cross-cohort-note">
                  <span>Separate public cohorts</span>
                  <p>Brain, CT, organ, movement, and genomic panels summarize independent cohorts and are never attributed to this participant.</p>
                </div>

                <Link href={`/results?participant=${selected.id}`}>Open results story · locked null, perturbation direction, transport, and cross-scale atlas</Link>
              </aside>
            </div>
          </div>
        </section>

        <footer className="atlas-footer">
          <span>HumanVector atlas · research prototype</span>
          <span>Real ECG records · visible cohort boundaries · not medical advice</span>
        </footer>
      </div>
    </main>
  );
}
