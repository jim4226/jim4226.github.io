import transportRobustness from "./data/transportRobustness.json";

type ResultsProfile = {
  id: string;
  profile: string;
  age: number;
  phaseAges: Record<string, number>;
  A: number;
  D: number;
  q: number[];
  waveform?: number[][];
};

type PhaseCoordinateFigureProps = {
  profile: ResultsProfile;
  profiles: ResultsProfile[];
  focus?: string;
};

const PHASES = [
  { key: "P", label: "P", color: "var(--rv-coral)" },
  { key: "AV", label: "AV", color: "var(--rv-amber)" },
  { key: "QRS", label: "QRS", color: "var(--rv-blue)" },
  { key: "STT", label: "ST–T", color: "var(--rv-magenta)" },
] as const;

const DIRECTION_PROJECTIONS = [
  { label: "Dofetilide", value: 0.563, low: 0.254, high: 0.912, kind: "IKr" },
  { label: "Quinidine", value: 0.835, low: 0.514, high: 1.19, kind: "Held-mechanism" },
  { label: "Ranolazine", value: 0.209, low: -0.031, high: 0.475, kind: "Comparator" },
  { label: "Verapamil", value: 0.117, low: -0.088, high: 0.37, kind: "Comparator" },
] as const;

const TRANSPORT_STEPS = [
  { label: "Marginal", value: 1.0, low: 0.905, high: 1.106, p: "p = 0.996" },
  { label: "+ age / sex", value: 1.091, low: 0.986, high: 1.207, p: "p = 0.0904" },
  { label: "+ intervals", value: 1.153, low: 1.039, high: 1.279, p: "p = 0.00728" },
  { label: "Fully adjusted", value: 1.225, low: 1.1, high: 1.364, p: "p = 1.92 × 10⁻⁴" },
] as const;

const EVIDENCE_ROWS = [
  { label: "ECG", now: true, cohort: false, note: "Public person-level example" },
  { label: "Brain MRI", now: false, cohort: true, note: "LEMON cohort" },
  { label: "Skeleton CT", now: false, cohort: true, note: "TotalSegmentator cohort" },
  { label: "Laboratory", now: false, cohort: true, note: "NHANES cohort" },
  { label: "Movement", now: false, cohort: true, note: "MotionVector cohort" },
  { label: "Genomics", now: false, cohort: true, note: "Prospective sequence-model screen" },
] as const;

function ResultsVisualStyles() {
  return (
    <style>{`
      .rv-figure {
        --rv-ink: var(--deck-ink, #1a1a1f);
        --rv-soft: var(--deck-soft, #686862);
        --rv-muted: var(--deck-muted, #969690);
        --rv-line: var(--deck-line, #e1dfd9);
        --rv-paper: var(--deck-paper, #ffffff);
        --rv-mint: var(--deck-mint, #00a67e);
        --rv-coral: #e2533f;
        --rv-amber: #b77a11;
        --rv-blue: var(--deck-blue, #3d3dcc);
        --rv-magenta: var(--deck-magenta, #d4236a);
        width: 100%;
        margin: 0;
        color: var(--rv-ink);
      }
      .rv-figure * { box-sizing: border-box; }
      .rv-figure svg { width: 100%; height: auto; display: block; overflow: visible; }
      .rv-figure text { fill: var(--rv-soft); font-family: "JetBrains Mono", var(--font-geist-mono), monospace; font-size: 10px; }
      .rv-figure .rv-svg-value { fill: var(--rv-ink); font-family: "Space Grotesk", sans-serif; font-size: 13px; font-weight: 700; }
      .rv-figure .rv-svg-small { fill: var(--rv-muted); font-size: 8px; }
      .rv-section-label { margin: 0 0 7px; color: var(--rv-muted); font: 700 9px "JetBrains Mono", var(--font-geist-mono), monospace; letter-spacing: .12em; text-transform: uppercase; }
      .rv-phase-coordinate { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(280px, .75fr); gap: 16px; align-items: stretch; }
      .rv-phase-panel { min-width: 0; display: grid; grid-template-rows: auto auto auto; align-content: start; }
      .rv-phase-bar-chart { min-height: 190px; border-bottom: 1px solid var(--rv-line); }
      .rv-bar-mark { transform-box: fill-box; transform-origin: center bottom; animation: rv-rise .62s cubic-bezier(.2,.7,.2,1) both; }
      .rv-bar-mark:nth-of-type(2) { animation-delay: 55ms; }
      .rv-bar-mark:nth-of-type(3) { animation-delay: 110ms; }
      .rv-bar-mark:nth-of-type(4) { animation-delay: 165ms; }
      .rv-heat-table { width: 100%; margin-top: 9px; border-collapse: collapse; table-layout: fixed; font: 9px "JetBrains Mono", var(--font-geist-mono), monospace; }
      .rv-heat-table caption { padding: 0 0 7px; color: var(--rv-muted); font-size: 9px; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
      .rv-heat-table th, .rv-heat-table td { height: 31px; padding: 4px 6px; border: 2px solid var(--rv-paper); text-align: center; }
      .rv-heat-table thead th { height: 22px; color: var(--rv-muted); background: transparent; font-size: 8px; }
      .rv-heat-table th:first-child { width: 86px; text-align: left; }
      .rv-heat-table tbody th { color: var(--rv-soft); font-weight: 600; }
      .rv-heat-table tr[data-selected="true"] th { color: var(--rv-ink); }
      .rv-heat-table tr[data-selected="true"] td { box-shadow: inset 0 0 0 1px rgba(26,26,31,.28); font-weight: 800; }
      .rv-heat-table tbody td { animation: rv-heat-reveal .42s cubic-bezier(.2,.7,.2,1) both; }
      .rv-heat-table tbody tr:nth-child(2) td { animation-delay: 90ms; }
      .rv-heat-table tbody tr:nth-child(3) td { animation-delay: 180ms; }
      .rv-heat-legend { margin-top: 5px; display: flex; align-items: center; justify-content: flex-end; gap: 7px; color: var(--rv-muted); font: 8px "JetBrains Mono", var(--font-geist-mono), monospace; }
      .rv-heat-ramp { width: 86px; height: 4px; background: linear-gradient(90deg, rgba(61,61,204,.82), rgba(255,255,255,.65) 50%, rgba(226,83,63,.82)); }
      .rv-explain-line { margin:5px 0 0; color:var(--rv-soft); font-size:9px; line-height:1.35; }
      .rv-explain-line strong { color:var(--rv-ink); font-weight:500; }
      .rv-coordinate-panel { min-width: 0; padding-left: 15px; border-left: 1px solid var(--rv-line); }
      .rv-scatter-point { animation: rv-pop .48s cubic-bezier(.2,.8,.25,1) both; transform-box: fill-box; transform-origin: center; }
      .rv-scatter-point:nth-of-type(2) { animation-delay: 80ms; }
      .rv-scatter-point:nth-of-type(3) { animation-delay: 160ms; }
      .rv-coordinate-readout { display: grid; grid-template-columns: .7fr .7fr 1.6fr; border-top: 1px solid var(--rv-line); }
      .rv-coordinate-readout > span { min-width: 0; padding: 9px 6px 0; display: grid; gap: 2px; color: var(--rv-muted); font: 8px "JetBrains Mono", var(--font-geist-mono), monospace; }
      .rv-coordinate-readout > span + span { border-left: 1px solid var(--rv-line); }
      .rv-coordinate-readout strong { overflow: hidden; color: var(--rv-ink); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
      .rv-null-layout { display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 18px; align-items: center; }
      .rv-null-chart { min-width: 0; }
      .rv-null-ci { animation: rv-draw-x .7s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: left center; }
      .rv-null-dot { animation: rv-pop .5s .45s cubic-bezier(.2,.8,.25,1) both; transform-box: fill-box; transform-origin: center; }
      .rv-null-stats { display: grid; align-self: stretch; border-left: 1px solid var(--rv-line); }
      .rv-null-stat { padding: 10px 0 10px 18px; display: grid; align-content: center; gap: 2px; }
      .rv-null-stat + .rv-null-stat { border-top: 1px solid var(--rv-line); }
      .rv-null-stat span { color: var(--rv-muted); font: 9px "JetBrains Mono", var(--font-geist-mono), monospace; letter-spacing: .08em; text-transform: uppercase; }
      .rv-null-stat strong { font-size: 22px; letter-spacing: -.04em; }
      .rv-null-stat small { color: var(--rv-soft); font-size: 9px; }
      .rv-direction-layout { display: grid; grid-template-columns: minmax(220px, .72fr) minmax(0, 1.28fr); gap: 18px; }
      .rv-direction-components { padding-right: 17px; border-right: 1px solid var(--rv-line); }
      .rv-vector-component { display: grid; grid-template-columns: 30px minmax(120px, 1fr) 50px; align-items: center; gap: 7px; min-height: 47px; border-top: 1px solid var(--rv-line); }
      .rv-vector-component:first-of-type { border-top: 0; }
      .rv-vector-component > span, .rv-vector-component > strong { font: 700 10px "JetBrains Mono", var(--font-geist-mono), monospace; }
      .rv-vector-component > strong { text-align: right; }
      .rv-vector-track { position: relative; height: 23px; background: linear-gradient(90deg, transparent 49.8%, var(--rv-line) 49.8%, var(--rv-line) 50.2%, transparent 50.2%); }
      .rv-vector-bar { position: absolute; top: 6px; height: 11px; animation: rv-draw-x .58s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; }
      .rv-vector-bar[data-direction="negative"] { right: 50%; background: var(--rv-blue); transform-origin: right center; }
      .rv-vector-bar[data-direction="positive"] { left: 50%; background: var(--rv-coral); transform-origin: left center; }
      .rv-vector-axis { display: flex; justify-content: space-between; color: var(--rv-muted); font: 8px "JetBrains Mono", var(--font-geist-mono), monospace; }
      .rv-projection-ci { animation: rv-draw-x .64s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: left center; }
      .rv-projection-dot { animation: rv-pop .42s .34s cubic-bezier(.2,.8,.25,1) both; transform-box: fill-box; transform-origin: center; }
      .rv-transport-chart { min-width: 0; }
      .rv-transport-line { stroke-dasharray: 820; stroke-dashoffset: 820; animation: rv-stroke .85s cubic-bezier(.2,.7,.2,1) forwards; }
      .rv-transport-ci { animation: rv-draw-y .62s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin:center; }
      .rv-transport-point { animation: rv-pop .42s .52s cubic-bezier(.2,.8,.25,1) both; transform-box: fill-box; transform-origin: center; }
      .rv-mini-ecg { min-width:220px; display:grid; grid-template-columns:auto minmax(150px,1fr); align-items:center; gap:8px; }
      .rv-mini-ecg figcaption { display:grid; gap:2px; color:var(--rv-muted); font:8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing:.08em; text-transform:uppercase; }
      .rv-mini-ecg figcaption strong { color:var(--rv-ink); font-size:8px; font-weight:500; }
      .rv-mini-ecg svg { height:30px; }
      .rv-mini-ecg .rv-ecg-grid { stroke:#e5e2dc; stroke-width:.6; }
      .rv-mini-ecg .rv-ecg-path { fill:none; stroke:var(--rv-coral); stroke-width:1.4; }
      .rv-transport-robustness { min-width:0; }
      .rv-transport-robustness svg { min-height:228px; }
      .rv-robust-ci { animation:rv-draw-x .62s cubic-bezier(.2,.7,.2,1) both; transform-box:fill-box; transform-origin:left center; }
      .rv-robust-dot { animation:rv-pop .42s .35s cubic-bezier(.2,.8,.25,1) both; transform-box:fill-box; transform-origin:center; }
      .rv-evidence-matrix { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
      .rv-evidence-matrix caption { padding: 0 0 8px; color: var(--rv-muted); font: 700 9px "JetBrains Mono", var(--font-geist-mono), monospace; letter-spacing: .1em; text-align: left; text-transform: uppercase; }
      .rv-evidence-matrix th, .rv-evidence-matrix td { height: 42px; padding: 7px 10px; border-bottom: 1px solid var(--rv-line); text-align: center; }
      .rv-evidence-matrix thead th { height: 34px; color: var(--rv-muted); font: 700 8px "JetBrains Mono", var(--font-geist-mono), monospace; line-height: 1.35; text-transform: uppercase; }
      .rv-evidence-matrix th:first-child { width: 145px; text-align: left; }
      .rv-evidence-matrix th:last-child { width: 180px; text-align: left; }
      .rv-evidence-matrix tbody th { color: var(--rv-ink); font-weight: 700; }
      .rv-matrix-source { display:none; margin-top:2px; color:var(--rv-muted); font-size:7px; font-weight:400; }
      .rv-evidence-matrix tbody td:last-child { color: var(--rv-soft); font-size: 8px; text-align: left; }
      .rv-evidence-matrix tbody tr { animation: rv-row-reveal .38s cubic-bezier(.2,.7,.2,1) both; }
      .rv-evidence-matrix tbody tr:nth-child(2) { animation-delay: 45ms; }
      .rv-evidence-matrix tbody tr:nth-child(3) { animation-delay: 90ms; }
      .rv-evidence-matrix tbody tr:nth-child(4) { animation-delay: 135ms; }
      .rv-evidence-matrix tbody tr:nth-child(5) { animation-delay: 180ms; }
      .rv-evidence-matrix tbody tr:nth-child(6) { animation-delay: 225ms; }
      .rv-matrix-mark { min-width: 78px; padding: 5px 8px; display: inline-block; border: 1px solid var(--rv-line); color: var(--rv-muted); font: 700 8px "JetBrains Mono", var(--font-geist-mono), monospace; letter-spacing: .06em; text-transform: uppercase; }
      .rv-matrix-mark[data-state="current"] { color: #007e60; background: rgba(0,166,126,.08); border-color: rgba(0,166,126,.32); }
      .rv-matrix-mark[data-state="cohort"] { color: #3d3dcc; background: rgba(61,61,204,.07); border-color: rgba(61,61,204,.28); }
      .rv-matrix-mark[data-state="future"] { color: #b71959; background: rgba(212,35,106,.07); border-color: rgba(212,35,106,.28); }
      .rv-matrix-empty { color: var(--rv-muted); }
      .rv-matrix-boundary { margin-top: 9px; padding-left: 11px; display: flex; justify-content: space-between; gap: 14px; border-left: 3px solid var(--rv-magenta); color: var(--rv-soft); font-size: 9px; }
      .rv-matrix-boundary strong { color: var(--rv-ink); }
      @keyframes rv-rise { from { transform: scaleY(.05); } to { transform: scaleY(1); } }
      @keyframes rv-draw-x { from { transform: scaleX(.02); } to { transform: scaleX(1); } }
      @keyframes rv-draw-y { from { transform: scaleY(.02); } to { transform: scaleY(1); } }
      @keyframes rv-pop { from { opacity: 0; transform: scale(.45); } to { opacity: 1; transform: scale(1); } }
      @keyframes rv-stroke { to { stroke-dashoffset: 0; } }
      @keyframes rv-heat-reveal { from { opacity: .15; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
      @keyframes rv-row-reveal { from { opacity:0; transform:translateX(-5px); } to { opacity:1; transform:none; } }
      @media (max-width: 860px) {
        .rv-phase-coordinate, .rv-null-layout, .rv-direction-layout { grid-template-columns: 1fr; }
        .rv-coordinate-panel, .rv-null-stats, .rv-direction-components { padding: 12px 0 0; border-top: 1px solid var(--rv-line); border-left: 0; border-right: 0; }
        .rv-null-stats { grid-template-columns: repeat(3, 1fr); }
        .rv-null-stat + .rv-null-stat { border-top: 0; border-left: 1px solid var(--rv-line); }
        .rv-mini-ecg { min-width:0; }
      }
      @media (max-width: 560px) {
        .rv-evidence-matrix th:first-child { width: 92px; }
        .rv-evidence-matrix th:last-child { display: none; }
        .rv-evidence-matrix td:last-child { display: none; }
        .rv-matrix-source { display:block; }
        .rv-matrix-mark { min-width: 0; width: 100%; padding-inline: 3px; }
        .rv-null-stats { grid-template-columns: 1fr; }
        .rv-null-stat + .rv-null-stat { border-top: 1px solid var(--rv-line); border-left: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .rv-figure * { animation: none !important; transition: none !important; }
        .rv-transport-line { stroke-dashoffset: 0; }
      }
    `}</style>
  );
}

function heatColor(gap: number, maximum: number) {
  const strength = maximum === 0 ? 0 : Math.min(1, Math.abs(gap) / maximum);
  const alpha = 0.12 + strength * 0.54;
  return gap >= 0 ? `rgba(226, 83, 63, ${alpha})` : `rgba(61, 61, 204, ${alpha})`;
}

export function MiniEcgTrace({ profile, focus }: { profile: ResultsProfile; focus?: string }) {
  const points = profile.waveform ?? [];
  const times = points.map((point) => point[0]);
  const values = points.map((point) => point[1]);
  const minTime = Math.min(...times, 0);
  const maxTime = Math.max(...times, 1);
  const minValue = Math.min(...values, -0.1);
  const maxValue = Math.max(...values, 0.1);
  const x = (value: number) => 5 + ((value - minTime) / Math.max(maxTime - minTime, 1)) * 250;
  const y = (value: number) => 29 - ((value - minValue) / Math.max(maxValue - minValue, 0.1)) * 24;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point[0]).toFixed(2)},${y(point[1]).toFixed(2)}`).join(" ");

  return (
    <figure className="rv-figure rv-mini-ecg" data-focus-target="phase" data-focus-active={focus === "phase"} aria-label={`Real four-second Lead II ECG trace from PTB-XL record ${profile.id}`}>
      <ResultsVisualStyles />
      <figcaption><span>Real signal</span><strong>Lead II · 4 seconds</strong></figcaption>
      <svg viewBox="0 0 260 34" role="img" aria-label={`Lead II waveform for ${profile.profile}`}>
        {[0, 1, 2, 3, 4].map((second) => <line key={second} className="rv-ecg-grid" x1={5 + second * 62.5} x2={5 + second * 62.5} y1="3" y2="31" />)}
        <line className="rv-ecg-grid" x1="5" x2="255" y1="27" y2="27" />
        <path className="rv-ecg-path" d={path} />
      </svg>
    </figure>
  );
}

export function PhaseCoordinateFigure({ profile, profiles, focus }: PhaseCoordinateFigureProps) {
  const available = profiles.length > 0 ? profiles : [profile];
  const phaseValues = available.flatMap((candidate) => PHASES.map((phase) => candidate.phaseAges[phase.key] ?? 0));
  const maxPhaseAge = Math.max(profile.age, ...phaseValues, 1);
  const maxHeatGap = Math.max(
    1,
    ...available.flatMap((candidate) => PHASES.map((phase) => Math.abs((candidate.phaseAges[phase.key] ?? candidate.age) - candidate.age))),
  );
  const maxA = Math.max(1, ...available.map((candidate) => candidate.A)) * 1.12;
  const maxD = Math.max(1, ...available.map((candidate) => candidate.D)) * 1.12;
  const barY = (value: number) => 160 - (value / maxPhaseAge) * 126;
  const scatterX = (value: number) => 42 + (value / maxA) * 224;
  const scatterY = (value: number) => 213 - (value / maxD) * 170;

  return (
    <figure className="rv-figure rv-phase-coordinate" aria-label="Phase-age heat map and shared-movement versus disagreement coordinate plot">
      <ResultsVisualStyles />
      <section className="rv-phase-panel" aria-label={`Phase ages for ${profile.profile}`}>
        <p className="rv-section-label">Selected phase clocks · apparent years</p>
        <svg className="rv-phase-bar-chart" data-focus-target="phase" data-focus-active={focus === "phase"} viewBox="0 0 470 205" role="img" aria-labelledby="rv-phase-title rv-phase-desc">
          <title id="rv-phase-title">Selected phase ages</title>
          <desc id="rv-phase-desc">Four apparent phase ages compared with the selected participant chronological age.</desc>
          {[0.25, 0.5, 0.75, 1].map((fraction) => {
            const value = maxPhaseAge * fraction;
            const y = barY(value);
            return (
              <g key={fraction}>
                <line x1="43" y1={y} x2="452" y2={y} stroke="var(--rv-line)" strokeWidth="1" />
                <text x="36" y={y + 3} textAnchor="end" className="rv-svg-small">{Math.round(value)}</text>
              </g>
            );
          })}
          {PHASES.map((phase, index) => {
            const value = profile.phaseAges[phase.key];
            const x = 73 + index * 98;
            const y = barY(value);
            return (
              <g key={phase.key}>
                <rect className="rv-bar-mark" x={x} y={y} width="54" height={160 - y} rx="3" fill={phase.color} opacity=".88" />
                <text x={x + 27} y={y - 8} textAnchor="middle" className="rv-svg-value">{value.toFixed(1)}</text>
                <text x={x + 27} y="179" textAnchor="middle">{phase.label}</text>
              </g>
            );
          })}
          <line x1="43" y1={barY(profile.age)} x2="452" y2={barY(profile.age)} stroke="var(--rv-ink)" strokeWidth="1.5" strokeDasharray="4 4" />
          <rect x="335" y={barY(profile.age) - 18} width="117" height="16" fill="var(--rv-paper)" opacity=".92" />
          <text x="447" y={barY(profile.age) - 7} textAnchor="end" className="rv-svg-small">chronological {profile.age} y</text>
        </svg>

        <div className="rv-heat-cluster" data-focus-target="gaps" data-focus-active={focus === "gaps"}>
          <table className="rv-heat-table">
            <caption>Cell = apparent age − actual age, in years · +25.7 means 25.7 years older-appearing</caption>
            <thead><tr><th scope="col">Profile</th>{PHASES.map((phase) => <th key={phase.key} scope="col">{phase.label}</th>)}</tr></thead>
            <tbody>
              {available.map((candidate) => (
                <tr key={candidate.id} data-selected={candidate.id === profile.id}>
                  <th scope="row">{candidate.profile}</th>
                  {PHASES.map((phase) => {
                    const gap = (candidate.phaseAges[phase.key] ?? candidate.age) - candidate.age;
                    return (
                      <td key={phase.key} style={{ backgroundColor: heatColor(gap, maxHeatGap) }} aria-label={`${candidate.profile} ${phase.label} gap ${gap >= 0 ? "plus" : "minus"} ${Math.abs(gap).toFixed(1)} years`}>
                        {gap >= 0 ? "+" : ""}{gap.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="rv-heat-legend" aria-hidden="true"><span>blue · younger-appearing</span><i className="rv-heat-ramp" /><span>red · older-appearing</span></div>
        </div>
      </section>

      <section className="rv-coordinate-panel" data-focus-target="geometry" data-focus-active={focus === "geometry"} aria-label="A and D coordinate geometry">
        <p className="rv-section-label">Coordinate geometry · all displayed profiles</p>
        <svg viewBox="0 0 310 245" role="img" aria-labelledby="rv-coordinate-title rv-coordinate-desc">
          <title id="rv-coordinate-title">Shared movement and disagreement geometry</title>
          <desc id="rv-coordinate-desc">Each profile is plotted by A shared movement on the horizontal axis and D disagreement on the vertical axis. The selected profile is ringed.</desc>
          {[0, 0.5, 1].map((fraction) => (
            <g key={`x-${fraction}`}>
              <line x1={scatterX(maxA * fraction)} y1="35" x2={scatterX(maxA * fraction)} y2="213" stroke="var(--rv-line)" />
              <text x={scatterX(maxA * fraction)} y="229" textAnchor="middle" className="rv-svg-small">{(maxA * fraction).toFixed(1)}</text>
            </g>
          ))}
          {[0, 0.5, 1].map((fraction) => (
            <g key={`y-${fraction}`}>
              <line x1="42" y1={scatterY(maxD * fraction)} x2="278" y2={scatterY(maxD * fraction)} stroke="var(--rv-line)" />
              <text x="35" y={scatterY(maxD * fraction) + 3} textAnchor="end" className="rv-svg-small">{(maxD * fraction).toFixed(1)}</text>
            </g>
          ))}
          <text x="160" y="243" textAnchor="middle" className="rv-svg-small">A · shared movement</text>
          <text x="10" y="124" textAnchor="middle" className="rv-svg-small" transform="rotate(-90 10 124)">D · disagreement</text>
          {available.map((candidate, index) => {
            const x = scatterX(candidate.A);
            const y = scatterY(candidate.D);
            const selected = candidate.id === profile.id;
            const labelBelow = y < 58;
            return (
              <g key={candidate.id} className="rv-scatter-point">
                {selected && <circle cx={x} cy={y} r="11" fill="none" stroke="var(--rv-coral)" strokeWidth="2" />}
                <circle cx={x} cy={y} r={selected ? 6 : 5} fill={selected ? "var(--rv-coral)" : "var(--rv-blue)"} opacity={selected ? 1 : 0.72} />
                <text x={x} y={labelBelow ? y + 22 : y - 12} textAnchor="middle" className={selected ? "rv-svg-value" : "rv-svg-small"}>{candidate.profile.replace("Profile ", "")}</text>
                <title>{`${candidate.profile}: A ${candidate.A.toFixed(3)}, D ${candidate.D.toFixed(3)}${index === 0 ? "" : ""}`}</title>
              </g>
            );
          })}
        </svg>
        <div className="rv-coordinate-readout">
          <span>A<strong>{profile.A.toFixed(3)}</strong></span>
          <span>D<strong>{profile.D.toFixed(3)}</strong></span>
          <span>q<strong>{profile.q.map((value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`).join(" · ")}</strong></span>
        </div>
        <p className="rv-explain-line"><strong>Unitless coordinates:</strong> A = shared shift · D = unsigned disagreement · q = signed direction.</p>
      </section>
    </figure>
  );
}

export function NullResultFigure({ focus }: { focus?: string }) {
  const scaleX = (value: number) => 54 + ((value - 0.96) / 0.1) * 610;
  const lower = scaleX(0.983);
  const upper = scaleX(1.039);
  const estimate = scaleX(1.01);
  const nullX = scaleX(1);

  return (
    <figure className="rv-figure rv-null-layout" aria-label="Locked null result with hazard ratio and confidence interval">
      <ResultsVisualStyles />
      <section className="rv-null-chart" data-focus-target="result" data-focus-active={focus === "result"}>
        <p className="rv-section-label">Hazard ratio per standard deviation · locked mortality reveal</p>
        <svg viewBox="0 0 720 250" role="img" aria-labelledby="rv-null-title rv-null-desc">
          <title id="rv-null-title">Locked null hazard ratio result</title>
          <desc id="rv-null-desc">Hazard ratio 1.010 with 95 percent confidence interval 0.983 to 1.039, crossing the null value 1.0. Likelihood-ratio p value 0.478.</desc>
          <rect x="54" y="58" width="610" height="105" fill="rgba(61,61,204,.035)" />
          <line x1={nullX} y1="38" x2={nullX} y2="185" stroke="var(--rv-coral)" strokeWidth="2" />
          <text x={nullX} y="29" textAnchor="middle" fill="var(--rv-coral)">null · 1.000</text>
          <line className="rv-null-ci" x1={lower} y1="111" x2={upper} y2="111" stroke="var(--rv-blue)" strokeWidth="8" strokeLinecap="round" />
          <line x1={lower} y1="96" x2={lower} y2="126" stroke="var(--rv-blue)" strokeWidth="2" />
          <line x1={upper} y1="96" x2={upper} y2="126" stroke="var(--rv-blue)" strokeWidth="2" />
          <circle className="rv-null-dot" cx={estimate} cy="111" r="11" fill="var(--rv-paper)" stroke="var(--rv-blue)" strokeWidth="5" />
          <text x={estimate} y="80" textAnchor="middle" className="rv-svg-value">HR 1.010</text>
          <text x={(lower + upper) / 2} y="145" textAnchor="middle">95% CI 0.983–1.039</text>
          {[0.96, 0.98, 1, 1.02, 1.04, 1.06].map((tick) => (
            <g key={tick}>
              <line x1={scaleX(tick)} y1="163" x2={scaleX(tick)} y2="170" stroke="var(--rv-soft)" />
              <text x={scaleX(tick)} y="185" textAnchor="middle" className="rv-svg-small">{tick.toFixed(2)}</text>
            </g>
          ))}
          <text x="54" y="215" className="rv-svg-small">lower added hazard</text>
          <text x="664" y="215" textAnchor="end" className="rv-svg-small">higher added hazard</text>
        </svg>
      </section>
      <aside className="rv-null-stats" data-focus-target="context" data-focus-active={focus === "context"} aria-label="Locked null result summary">
        <div className="rv-null-stat"><span>Estimate</span><strong>1.010</strong><small>HR / SD</small></div>
        <div className="rv-null-stat"><span>95% interval</span><strong>0.983–1.039</strong><small>crosses 1.000</small></div>
        <div className="rv-null-stat"><span>Likelihood ratio</span><strong>p = .478</strong><small>not significant</small></div>
      </aside>
    </figure>
  );
}

export function DirectionVectorFigure({ focus }: { focus?: string }) {
  const direction = [-0.381, -0.939, 0.703];
  const vectorWidth = (value: number) => `${Math.abs(value) * 50}%`;
  const plotX = (value: number) => 123 + ((value + 0.2) / 1.5) * 500;

  return (
    <figure className="rv-figure rv-direction-layout" aria-label="Frozen direction vector and drug projection confidence intervals">
      <ResultsVisualStyles />
      <section className="rv-direction-components" data-focus-target="vector" data-focus-active={focus === "vector"}>
        <p className="rv-section-label">Frozen direction · w = (−0.381, −0.939, +0.703)</p>
        {direction.map((value, index) => (
          <div className="rv-vector-component" key={index}>
            <span>q{index + 1}</span>
            <div className="rv-vector-track" aria-label={`Direction component q ${index + 1}: ${value.toFixed(3)}`}>
              <i className="rv-vector-bar" data-direction={value < 0 ? "negative" : "positive"} style={{ width: vectorWidth(value) }} />
            </div>
            <strong>{value >= 0 ? "+" : ""}{value.toFixed(3)}</strong>
          </div>
        ))}
        <div className="rv-vector-axis" aria-hidden="true"><span>−1</span><span>0</span><span>+1</span></div>
      </section>

      <section className="rv-projection-panel" data-focus-target="projection" data-focus-active={focus === "projection"} aria-label="Drug projections onto the frozen direction">
        <p className="rv-section-label">Projection on frozen direction · point estimate and 95% CI</p>
        <svg viewBox="0 0 680 268" role="img" aria-labelledby="rv-direction-title rv-direction-desc">
          <title id="rv-direction-title">Drug projections on the frozen IKr direction</title>
          <desc id="rv-direction-desc">Dofetilide and quinidine have positive projections. Ranolazine and verapamil comparator intervals cross zero.</desc>
          {[0, 0.4, 0.8, 1.2].map((tick) => (
            <g key={tick}>
              <line x1={plotX(tick)} y1="25" x2={plotX(tick)} y2="233" stroke={tick === 0 ? "var(--rv-coral)" : "var(--rv-line)"} strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={plotX(tick)} y="250" textAnchor="middle" className="rv-svg-small">{tick.toFixed(1)}</text>
            </g>
          ))}
          {DIRECTION_PROJECTIONS.map((projection, index) => {
            const y = 53 + index * 52;
            const ikr = projection.kind === "IKr";
            return (
              <g key={projection.label}>
                <line x1="120" y1={y + 24} x2="636" y2={y + 24} stroke="var(--rv-line)" />
                <text x="4" y={y - 1} className="rv-svg-value">{projection.label}</text>
                <text x="4" y={y + 13} className="rv-svg-small">{projection.kind}</text>
                <line className="rv-projection-ci" x1={plotX(projection.low)} y1={y} x2={plotX(projection.high)} y2={y} stroke={ikr ? "var(--rv-mint)" : "var(--rv-blue)"} strokeWidth="5" strokeLinecap="round" />
                <line x1={plotX(projection.low)} y1={y - 7} x2={plotX(projection.low)} y2={y + 7} stroke={ikr ? "var(--rv-mint)" : "var(--rv-blue)"} />
                <line x1={plotX(projection.high)} y1={y - 7} x2={plotX(projection.high)} y2={y + 7} stroke={ikr ? "var(--rv-mint)" : "var(--rv-blue)"} />
                {ikr ? (
                  <path className="rv-projection-dot" d={`M ${plotX(projection.value)} ${y - 8} l 8 8 l -8 8 l -8 -8 z`} fill="var(--rv-mint)" />
                ) : (
                  <circle className="rv-projection-dot" cx={plotX(projection.value)} cy={y} r="7" fill="var(--rv-paper)" stroke="var(--rv-blue)" strokeWidth="3" />
                )}
                <text x="665" y={y + 3} textAnchor="end" className="rv-svg-value">{projection.value >= 0 ? "+" : ""}{projection.value.toFixed(3)}</text>
              </g>
            );
          })}
          <text x={plotX(0)} y="18" textAnchor="middle" className="rv-svg-small">zero</text>
        </svg>
        <p className="rv-explain-line"><strong>How to read:</strong> positive = aligned with the frozen arrow; a 95% interval crossing 0 is uncertain.</p>
      </section>
    </figure>
  );
}

export function TransportCurveFigure() {
  const yMin = 0.88;
  const yMax = 1.4;
  const x = (index: number) => 80 + index * 185;
  const y = (value: number) => 220 - ((value - yMin) / (yMax - yMin)) * 155;
  const points = TRANSPORT_STEPS.map((step, index) => `${x(index)},${y(step.value)}`).join(" ");

  return (
    <figure className="rv-figure rv-transport-chart" aria-label="Adjustment ladder showing odds ratio increasing from 1.000 to 1.225">
      <ResultsVisualStyles />
      <p className="rv-section-label">External transport · odds ratio per standard deviation</p>
      <svg viewBox="0 0 700 300" role="img" aria-labelledby="rv-transport-title rv-transport-desc">
        <title id="rv-transport-title">External transport adjustment curve</title>
        <desc id="rv-transport-desc">The odds ratio is 1.000 marginally, 1.091 after age and sex adjustment, 1.153 after interval adjustment, and 1.225 when fully adjusted.</desc>
        {[1, 1.1, 1.2].map((tick) => (
          <g key={tick}>
            <line x1="62" y1={y(tick)} x2="655" y2={y(tick)} stroke={tick === 1 ? "var(--rv-coral)" : "var(--rv-line)"} strokeWidth={tick === 1 ? 1.5 : 1} strokeDasharray={tick === 1 ? "4 4" : undefined} />
            <text x="52" y={y(tick) + 3} textAnchor="end" className="rv-svg-small">{tick.toFixed(2)}</text>
          </g>
        ))}
        <polyline className="rv-transport-line" points={points} fill="none" stroke="var(--rv-mint)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        {TRANSPORT_STEPS.map((step, index) => (
          <g key={step.label}>
            <line className="rv-transport-ci" x1={x(index)} y1={y(step.low)} x2={x(index)} y2={y(step.high)} stroke="var(--rv-blue)" strokeWidth="4" strokeLinecap="round" />
            <line x1={x(index) - 7} y1={y(step.low)} x2={x(index) + 7} y2={y(step.low)} stroke="var(--rv-blue)" />
            <line x1={x(index) - 7} y1={y(step.high)} x2={x(index) + 7} y2={y(step.high)} stroke="var(--rv-blue)" />
            <circle className="rv-transport-point" cx={x(index)} cy={y(step.value)} r={index === TRANSPORT_STEPS.length - 1 ? 9 : 7} fill={index === TRANSPORT_STEPS.length - 1 ? "var(--rv-coral)" : "var(--rv-paper)"} stroke={index === TRANSPORT_STEPS.length - 1 ? "var(--rv-coral)" : "var(--rv-mint)"} strokeWidth="4" />
            <text x={x(index)} y={y(step.value) - 17} textAnchor="middle" className="rv-svg-value">OR {step.value.toFixed(3)}</text>
            <text x={x(index)} y="248" textAnchor="middle">{step.label}</text>
            <text x={x(index)} y="263" textAnchor="middle" className="rv-svg-small">95% CI {step.low.toFixed(3)}–{step.high.toFixed(3)}</text>
            <text x={x(index)} y="280" textAnchor="middle" className="rv-svg-small">{step.p}</text>
            <text x={x(index)} y="296" textAnchor="middle" className="rv-svg-small">0{index + 1}</text>
          </g>
        ))}
        <text x="655" y={y(1) - 8} textAnchor="end" fill="var(--rv-coral)" className="rv-svg-small">marginal null</text>
      </svg>
      <p className="rv-explain-line"><strong>Separate adjustment models—not time:</strong> OR &gt; 1 means higher QT-extension odds per +1 SD; an interval crossing 1 includes no association.</p>
    </figure>
  );
}

export function TransportRobustnessFigure() {
  const rows = [
    ...transportRobustness.site.map((row) => ({ ...row, group: "Site within pooled cohort" })),
    ...transportRobustness.rhythmSensitivity.map((row) => ({ ...row, group: "Rhythm sensitivity" })),
  ];
  const x = (value: number) => 150 + ((value - 0.7) / 1.35) * 226;

  return (
    <figure className="rv-figure rv-transport-robustness" aria-label="Site-stratified and rhythm-exclusion transport estimates">
      <ResultsVisualStyles />
      <p className="rv-section-label">Site consistency + rhythm sensitivity · exact aggregate rows</p>
      <svg viewBox="0 0 420 244" role="img" aria-labelledby="rv-robust-title rv-robust-desc">
        <title id="rv-robust-title">External transport robustness forest</title>
        <desc id="rv-robust-desc">Ningbo and Chapman-Shaoxing site estimates are positive within one pooled external cohort. Excluding both flutter or fibrillation and sinus bradycardia yields an uncertain estimate crossing one.</desc>
        <line x1={x(1)} x2={x(1)} y1="26" y2="217" stroke="var(--rv-coral)" strokeWidth="1.5" />
        <text x={x(1)} y="17" textAnchor="middle" className="rv-svg-small">null · 1.00</text>
        {rows.map((row, index) => {
          const y = 47 + index * 39;
          const lowCases = row.cases < 100;
          const color = row.group === "Site within pooled cohort" ? "var(--rv-blue)" : "var(--rv-mint)";
          return (
            <g key={`${row.group}-${row.label}`} opacity={lowCases ? 0.55 : 1}>
              {index === 0 || rows[index - 1].group !== row.group ? <text x="4" y={y - 14} className="rv-svg-small">{row.group.toUpperCase()}</text> : null}
              <text x="4" y={y + 2} className="rv-svg-value">{row.label}</text>
              <text x="4" y={y + 14} className="rv-svg-small">{row.cases} cases · p={row.p < 0.01 ? row.p.toPrecision(2) : row.p.toFixed(row.p < 0.1 ? 4 : 3)}</text>
              <line className="rv-robust-ci" x1={x(row.ciLow)} x2={x(row.ciHigh)} y1={y} y2={y} stroke={color} strokeWidth="4" strokeLinecap="round" />
              <circle className="rv-robust-dot" cx={x(row.oddsRatio)} cy={y} r="5.5" fill="var(--rv-paper)" stroke={color} strokeWidth="3" />
              <text x="414" y={y + 3} textAnchor="end" className="rv-svg-value">{row.oddsRatio.toFixed(3)}</text>
            </g>
          );
        })}
        {[0.8, 1, 1.2, 1.4, 1.6, 1.8, 2].map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1="217" y2="222" stroke="var(--rv-soft)" />
            <text x={x(tick)} y="235" textAnchor="middle" className="rv-svg-small">{tick.toFixed(1)}</text>
          </g>
        ))}
      </svg>
      <figcaption className="rv-explain-line"><strong>Two sites, one pooled cohort.</strong> Gray = fewer than 100 cases; lines are 95% CIs.</figcaption>
    </figure>
  );
}

export function EvidenceCoverageMatrix({ focus }: { focus?: string }) {
  return (
    <figure className="rv-figure" aria-label="Evidence coverage matrix separating current person-level ECG from separate-cohort evidence and future linked data">
      <ResultsVisualStyles />
      <table className="rv-evidence-matrix">
        <caption data-focus-target="current" data-focus-active={focus === "current"}>Available means evidence exists at that level—not necessarily in the selected ECG person</caption>
        <thead>
          <tr>
            <th scope="col" data-focus-target="current" data-focus-active={focus === "current"}>Modality</th>
            <th scope="col" data-focus-target="current" data-focus-active={focus === "current"}>Person-level<br />example now</th>
            <th scope="col" data-focus-target="current" data-focus-active={focus === "current"}>Separate-cohort<br />evidence now</th>
            <th scope="col" data-focus-target="future" data-focus-active={focus === "future"}>Future linked<br />record</th>
            <th scope="col" data-focus-target="current" data-focus-active={focus === "current"}>Current evidence unit</th>
          </tr>
        </thead>
        <tbody>
          {EVIDENCE_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row" data-focus-target="current" data-focus-active={focus === "current"}>{row.label}<small className="rv-matrix-source">{row.note}</small></th>
              <td data-focus-target="current" data-focus-active={focus === "current"}>{row.now ? <span className="rv-matrix-mark" data-state="current">Available</span> : <span className="rv-matrix-empty">—</span>}</td>
              <td data-focus-target="current" data-focus-active={focus === "current"}>{row.cohort ? <span className="rv-matrix-mark" data-state="cohort">Available</span> : <span className="rv-matrix-empty">—</span>}</td>
              <td data-focus-target="future" data-focus-active={focus === "future"}><span className="rv-matrix-mark" data-state="future">Required</span></td>
              <td data-focus-target="current" data-focus-active={focus === "current"}>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="rv-matrix-boundary" data-focus-target="future" data-focus-active={focus === "future"}>
        <strong>Boundary</strong>
        <span>Current modalities are independent public evidence units. A whole-person vector requires same-person linked longitudinal data.</span>
      </figcaption>
    </figure>
  );
}
