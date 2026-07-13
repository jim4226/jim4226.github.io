"use client";

import { useState } from "react";
import organSystems from "./data/organSystems.json";

type OrganSystem = (typeof organSystems)[number];
type ViewMode = "map" | "forest";

const anatomicalPoints: Record<string, { x: number; y: number; side: "left" | "right" }> = {
  cardiovascular: { x: 276, y: 174, side: "right" },
  immune: { x: 236, y: 132, side: "left" },
  hepatic: { x: 301, y: 228, side: "right" },
  renal: { x: 236, y: 258, side: "left" },
  metabolic: { x: 286, y: 285, side: "right" },
  hematologic: { x: 244, y: 342, side: "left" },
};

function formatP(value: number) {
  if (value < 0.001) return value.toExponential(1).replace("e-", " × 10−");
  return value.toFixed(3).replace(/^0/, "");
}

function ForestPlot({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const width = 700;
  const height = 430;
  const min = 0.88;
  const max = 1.46;
  const x = (value: number) => 180 + ((value - min) / (max - min)) * 470;

  return (
    <svg className="organ-forest" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Age and sex adjusted mortality hazard ratios for six NHANES organ age gaps">
      <title>NHANES organ-system mortality associations</title>
      <desc>Each row shows a hazard ratio and confidence interval per standard deviation of an organ age gap, adjusted for age and sex.</desc>
      <line x1={x(1)} x2={x(1)} y1="30" y2="365" className="organ-null-line" />
      <text x={x(1)} y="20" textAnchor="middle" className="organ-null-label">HR 1.0</text>
      {[0.9, 1, 1.1, 1.2, 1.3, 1.4].map((tick) => (
        <g key={tick}><line x1={x(tick)} x2={x(tick)} y1="365" y2="373" className="organ-axis" /><text x={x(tick)} y="394" textAnchor="middle" className="organ-tick">{tick.toFixed(1)}</text></g>
      ))}
      {organSystems.map((organ, index) => {
        const y = 58 + index * 50;
        const selected = organ.id === selectedId;
        return (
          <g key={organ.id} className={selected ? "organ-forest-row selected" : "organ-forest-row"} onClick={() => onSelect(organ.id)} role="button" aria-label={`Select ${organ.name}`}>
            <rect x="8" y={y - 21} width="670" height="42" rx="10" />
            <text x="166" y={y + 5} textAnchor="end" className="organ-row-label">{organ.name}</text>
            <line x1={x(organ.ageSexLow)} x2={x(organ.ageSexHigh)} y1={y} y2={y} className="organ-ci" />
            <line x1={x(organ.ageSexLow)} x2={x(organ.ageSexLow)} y1={y - 7} y2={y + 7} className="organ-ci" />
            <line x1={x(organ.ageSexHigh)} x2={x(organ.ageSexHigh)} y1={y - 7} y2={y + 7} className="organ-ci" />
            <circle cx={x(organ.ageSexHr)} cy={y} r={selected ? 8 : 6} />
            <text x={Math.min(x(organ.ageSexHigh) + 12, 658)} y={y + 5} className="organ-row-value">{organ.ageSexHr.toFixed(2)}</text>
          </g>
        );
      })}
      <line x1="180" x2="650" y1="365" y2="365" className="organ-axis" />
      <text x="415" y="423" textAnchor="middle" className="organ-axis-title">Original available-case HR per +1 SD organ-age gap · age + sex adjusted</text>
    </svg>
  );
}

function SystemMap({ selected, onSelect }: { selected: OrganSystem; onSelect: (id: string) => void }) {
  return (
    <svg className="organ-map" viewBox="0 0 540 500" role="img" aria-label={`Illustrative organ-system map with ${selected.name} selected`}>
      <title>Illustrative NHANES organ-system navigator</title>
      <desc>This is an explanatory system map, not participant anatomy. Selectable points correspond to six clocks built from public NHANES measurements.</desc>
      <defs>
        <linearGradient id="bodyWash" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#dceef7" />
          <stop offset="1" stopColor="#edf7fb" />
        </linearGradient>
      </defs>
      <circle cx="270" cy="72" r="42" className="organ-body" />
      <path d="M211 121 C225 104 315 104 329 121 L352 226 C357 252 348 298 334 327 L317 461 L278 461 L269 342 L260 461 L221 461 L204 327 C190 298 183 252 188 226 Z" className="organ-body" />
      <path d="M211 132 L151 266 L176 277 L224 190 M329 132 L389 266 L364 277 L316 190" className="organ-limb" />
      <path d="M269 126 C243 148 246 193 269 217 C292 193 295 148 269 126 Z" className="organ-core" />
      <path d="M234 224 C252 207 292 207 311 224 C304 248 244 253 234 224 Z" className="organ-core soft" />
      <path d="M226 255 C212 263 211 288 228 294 C241 283 242 265 226 255 M310 255 C324 263 325 288 308 294 C295 283 294 265 310 255" className="organ-core soft" />
      <path d="M238 315 C260 300 285 302 306 317" className="organ-flow" />
      <path d="M270 218 L270 405 M225 275 C252 288 289 288 315 275" className="organ-flow" />
      {organSystems.map((organ) => {
        const point = anatomicalPoints[organ.id];
        const active = organ.id === selected.id;
        const labelX = point.side === "left" ? 112 : 428;
        const lineEnd = point.side === "left" ? 160 : 380;
        return (
          <g key={organ.id} className={active ? "organ-hotspot active" : "organ-hotspot"} onClick={() => onSelect(organ.id)} role="button" aria-label={`Select ${organ.name}`}>
            <line x1={point.x} x2={lineEnd} y1={point.y} y2={point.y} />
            <circle cx={point.x} cy={point.y} r={active ? 12 : 8} />
            <circle cx={point.x} cy={point.y} r={active ? 4 : 3} className="organ-hotspot-core" />
            <text x={labelX} y={point.y + 4} textAnchor={point.side === "left" ? "end" : "start"}>{organ.name}</text>
          </g>
        );
      })}
      <text x="270" y="488" textAnchor="middle" className="organ-map-caption">ILLUSTRATIVE SYSTEM MAP · NOT PARTICIPANT ANATOMY</text>
    </svg>
  );
}

export default function OrganExplorer() {
  const [selectedId, setSelectedId] = useState("hepatic");
  const [view, setView] = useState<ViewMode>("forest");
  const selected = organSystems.find((organ) => organ.id === selectedId) ?? organSystems[0];

  return (
    <div className="organ-explorer">
      <div className="organ-explorer-topbar">
        <div><span><strong>Population evidence</strong><small>NHANES 2005–2010 · linked mortality</small></span></div>
        <div className="organ-view-toggle" role="group" aria-label="Organ explorer visualization">
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>System map</button>
          <button type="button" aria-pressed={view === "forest"} onClick={() => setView("forest")}>Hazard plot</button>
        </div>
        <span className="organ-output-state"><i /> Committed aggregate outputs</span>
      </div>

      <div className="organ-explorer-layout">
        <nav className="organ-explorer-nav" aria-label="Organ system filter">
          <span>Filter system</span>
          {organSystems.map((organ) => {
            return (
              <button key={organ.id} type="button" aria-pressed={organ.id === selected.id} onClick={() => setSelectedId(organ.id)}>
                <span><strong>{organ.name}</strong><small>n = {organ.n.toLocaleString()}</small></span>
              </button>
            );
          })}
          <div className="organ-source-note"><strong>Aggregate filters only</strong><span>Participant-level organ profiles are not present in this checkout. Every value shown comes from committed NHANES result tables.</span></div>
        </nav>

        <div className="organ-explorer-stage">
          <div className="organ-stage-heading"><span>{view === "forest" ? "MORTALITY ASSOCIATION" : "SYSTEM NAVIGATOR"}</span><strong>{view === "forest" ? "One comparable scale. Six clocks." : `${selected.name} system selected`}</strong></div>
          {view === "forest" ? <ForestPlot selectedId={selected.id} onSelect={setSelectedId} /> : <SystemMap selected={selected} onSelect={setSelectedId} />}
          <div className="organ-scale"><span>Lower association</span><i /><span>Higher association</span></div>
        </div>

        <aside className="organ-explorer-detail" aria-live="polite">
          <span className="organ-detail-kicker">Selected system</span>
          <h3>{selected.name}</h3>
          <p>{selected.description}</p>
          <div className="organ-detail-cohort"><span><strong>{selected.n.toLocaleString()}</strong> complete cases</span><span><strong>{selected.events.toLocaleString()}</strong> deaths</span></div>

          <div className="organ-detail-metric primary">
            <span>Original available-case · age + sex</span>
            <strong>HR {selected.ageSexHr.toFixed(3)}</strong>
            <small>95% CI {selected.ageSexLow.toFixed(3)}–{selected.ageSexHigh.toFixed(3)} · p {formatP(selected.ageSexP)}</small>
          </div>
          <div className="organ-detail-metric">
            <span>Original available-case · joint six-system</span>
            <strong>HR {selected.jointHr.toFixed(3)}</strong>
            <small>95% CI {selected.jointLow.toFixed(3)}–{selected.jointHigh.toFixed(3)} · p {formatP(selected.jointP)}</small>
          </div>

          <div className="organ-marker-list">
            <span>Clock inputs</span>
            <div>{selected.markers.map((marker) => <small key={marker}>{marker}</small>)}</div>
          </div>

          <div className="organ-robustness">
            <span>Leave-this-system-out D<sub>body</sub></span>
            <strong>HR {selected.leaveOutHr.toFixed(3)}</strong>
            <small>95% CI {selected.leaveOutLow.toFixed(3)}–{selected.leaveOutHigh.toFixed(3)} · p {formatP(selected.leaveOutP)}</small>
          </div>
          <p className="organ-detail-caveat">Population association, not an individual risk estimate. These per-system values are the committed original unweighted lifelines results. A sign change in the joint model can reflect suppression and is not “protective aging.”</p>
        </aside>
      </div>
      <div className="organ-global-summary">
        <div><span>Canonical survey-weighted A<sub>body</sub></span><strong>HR 1.206</strong><small>95% CI 1.130–1.287</small></div>
        <div><span>Canonical survey-weighted D<sub>body</sub></span><strong>HR 1.213</strong><small>95% CI 1.108–1.328 · p = 3.1 × 10−5</small></div>
        <div className="organ-cindex"><span>10-fold survey-weighted C-index · n = 14,362 · 1,739 deaths</span><strong>0.8127 <i>→</i> 0.8262 <i>→</i> 0.8304</strong><small>age + sex → + A<sub>body</sub> → + D<sub>body</sub></small></div>
      </div>
      <div className="organ-explorer-footer"><span>Per-system source: <code>nhanes_cox_results.csv</code> · canonical A/D source: <code>nhanes_canonical_cox_table.csv</code></span><span>CDC/NCHS public-use data · secondary, non-confirmatory analysis</span></div>
    </div>
  );
}
