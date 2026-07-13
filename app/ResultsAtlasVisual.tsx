"use client";

import Image from "next/image";
import {
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import associationJson from "./data/ctBodyAssociations.json";

type GroupAssociation = {
  group: string;
  layer: "organ" | "skeleton";
  rho: number;
};

type StructureAssociation = {
  group: string;
  layer: "organ" | "skeleton";
  rho: number;
  color: string;
  n_voxels: number;
};

type AssociationData = {
  clim: number[];
  groups: GroupAssociation[];
  structures: Record<string, StructureAssociation>;
  caveat: string;
};

const associations = associationJson as AssociationData;

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b(left|right)\b/g, (side) => side[0].toUpperCase() + side.slice(1))
    .replace(/^\w/, (character) => character.toUpperCase());
}

function materialList(mesh: Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function textColor(background: string) {
  const hex = background.replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = [red, green, blue].map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] < 0.34 ? "#ffffff" : "#172126";
}

function styleModel(root: Group | null, selectedGroup: string | null) {
  root?.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const meta = associations.structures[object.name];
    const isSelected = !selectedGroup || meta?.group === selectedGroup;
    materialList(object).forEach((material) => {
      if (!(material instanceof MeshStandardMaterial)) return;
      material.transparent = Boolean(selectedGroup);
      material.opacity = isSelected ? 1 : 0.11;
      material.depthWrite = isSelected;
      material.emissive.set(isSelected && selectedGroup ? meta?.color ?? "#ffffff" : "#000000");
      material.emissiveIntensity = isSelected && selectedGroup ? 0.12 : 0;
      material.needsUpdate = true;
    });
  });
}

function BrainMark() {
  const maximum = 0.6;
  const baseline = 51;
  const height = (value: number) => (value / maximum) * 34;
  return (
    <section className="rav-mark rav-brain-mark" aria-label="LEMON MRI disagreement was 0.340 in younger adults and 0.517 in older adults, a difference of 0.177">
      <div className="rav-mark-copy">
        <span>BRAIN MRI · LEMON</span>
        <strong>D +0.177</strong>
        <small>p = 4.3 × 10⁻⁸ · d = 0.844 · aggregate n = 220 · 4 scan examples loaded</small>
      </div>
      <svg viewBox="0 0 190 66" role="img" aria-label="Bar comparison of mean disagreement by age group">
        <title>Cross-view MRI disagreement by age group</title>
        <line x1="13" x2="177" y1={baseline} y2={baseline} />
        <rect x="43" y={baseline - height(0.34)} width="34" height={height(0.34)} rx="3" />
        <rect className="rav-brain-old" x="113" y={baseline - height(0.517)} width="34" height={height(0.517)} rx="3" />
        <text x="60" y={baseline - height(0.34) - 4} textAnchor="middle">0.340</text>
        <text x="130" y={baseline - height(0.517) - 4} textAnchor="middle">0.517</text>
        <text x="60" y="63" textAnchor="middle">YOUNGER</text>
        <text x="130" y="63" textAnchor="middle">OLDER</text>
      </svg>
    </section>
  );
}

function NhanesMark() {
  const values = [0.8127, 0.8262, 0.8304];
  const labels = ["AGE + SEX", "+ A", "+ D"];
  const x = (index: number) => 21 + index * 70;
  const y = (value: number) => 50 - ((value - 0.8) / 0.035) * 35;
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
  return (
    <section className="rav-mark rav-nhanes-mark" aria-label="NHANES cross-validated C-index rose from 0.8127 to 0.8262 to 0.8304; D body hazard ratio was 1.213">
      <div className="rav-mark-copy">
        <span>ORGAN SYSTEMS · NHANES</span>
        <strong>D<sub>body</sub> HR 1.213</strong>
        <small>Higher is better · axis zoomed 0.800–0.835 · n = 14,362</small>
      </div>
      <svg viewBox="0 0 190 66" role="img" aria-label="C-index progression from age and sex to shared age A and disagreement D">
        <title>Cross-validated C-index progression</title>
        <line x1="13" x2="177" y1="50" y2="50" />
        <path d={path} />
        {values.map((value, index) => (
          <g key={value}>
            <circle cx={x(index)} cy={y(value)} r="3.5" />
            <text x={x(index)} y={y(value) - 6} textAnchor="middle">{value.toFixed(4)}</text>
            <text x={x(index)} y="63" textAnchor="middle">{labels[index]}</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

export default function ResultsAtlasVisual({ focus }: { focus?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<Group | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const selectedGroupRef = useRef<string | null>(selectedGroup);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const groupColors = useMemo(() => {
    const colors = new Map<string, string>();
    Object.values(associations.structures).forEach((structure) => {
      if (!colors.has(structure.group)) colors.set(structure.group, structure.color);
    });
    return colors;
  }, []);

  const orderedGroups = useMemo(
    () => [...associations.groups].sort((left, right) => right.rho - left.rho),
    [],
  );

  const selected = selectedGroup ? associations.groups.find((group) => group.group === selectedGroup) ?? null : null;
  const selectedStructures = useMemo(
    () => Object.entries(associations.structures)
      .filter(([, meta]) => meta.group === selected?.group)
      .sort((left, right) => right[1].n_voxels - left[1].n_voxels),
    [selected?.group],
  );
  const selectedVoxels = selectedStructures.reduce((total, [, meta]) => total + meta.n_voxels, 0);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
    styleModel(rootRef.current, selectedGroup);
    renderRef.current?.();
  }, [selectedGroup]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let rotationStartedAt: number | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100_000);
    camera.up.set(0, 0, 1);
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new HemisphereLight(0xffffff, 0xb9d9dc, 1.9));
    const keyLight = new DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2, -3, 4);
    scene.add(keyLight);
    const rimLight = new DirectionalLight(0x99c6ff, 1.15);
    rimLight.position.set(-3, 1, 2);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.75;

    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const animateRotation = (now: number) => {
      if (disposed || rotationStartedAt === null) return;
      const rotating = !reducedMotion && now - rotationStartedAt < 6_000;
      controls.autoRotate = rotating;
      controls.update();
      render();
      if (rotating) animationFrame = window.requestAnimationFrame(animateRotation);
    };

    const loader = new GLTFLoader();
    loader.load(
      "/models/ct-whole-body.glb",
      (gltf) => {
        if (disposed) return;
        const root = gltf.scene;
        root.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const meta = associations.structures[object.name];
          const originals = materialList(object);
          const replacements = originals.map((original) => {
            const material = original instanceof MeshStandardMaterial ? original.clone() : new MeshStandardMaterial();
            const hasVertexColors = Boolean(object.geometry.getAttribute("color"));
            material.vertexColors = hasVertexColors;
            material.color = new Color(hasVertexColors ? "#ffffff" : meta?.color ?? "#bed3d2");
            material.side = DoubleSide;
            material.roughness = 0.68;
            material.metalness = 0;
            return material;
          });
          originals.forEach((material) => material.dispose());
          object.material = Array.isArray(object.material) ? replacements : replacements[0];
        });
        scene.add(root);
        rootRef.current = root;
        styleModel(root, selectedGroupRef.current);

        const box = new Box3().setFromObject(root);
        const center = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 0.52;
        camera.near = Math.max(radius / 1_000, 0.05);
        camera.far = Math.max(radius * 20, 1_000);
        camera.position.set(center.x + radius * 0.66, center.y - radius * 2.5, center.z + radius * 0.27);
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.minDistance = radius * 0.5;
        controls.maxDistance = radius * 4;
        controls.update();
        setLoadState("ready");
        rotationStartedAt = performance.now();
        animationFrame = window.requestAnimationFrame(animateRotation);
      },
      undefined,
      () => {
        if (!disposed) setLoadState("error");
      },
    );

    controls.addEventListener("change", render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      controls.removeEventListener("change", render);
      observer.disconnect();
      controls.dispose();
      rootRef.current?.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        materialList(object).forEach((material: Material) => material.dispose());
        object.geometry.dispose();
      });
      rootRef.current = null;
      renderRef.current = null;
      renderer.dispose();
    };
  }, []); // Load the committed reference geometry once; selection styling is handled separately.

  return (
    <div className="rav-root">
      <div className="rav-main">
        <section className="rav-model" data-focus-target="geometry" data-focus-active={focus === "geometry"} aria-label="Real TotalSegmentator CT segmentation">
          <div className="rav-model-head">
            <span>REAL CT SEGMENTATION · s1045</span>
            <strong>{loadState === "ready" ? "115 structures ready" : loadState === "error" ? "Mesh unavailable" : "Loading geometry"}</strong>
          </div>
          <canvas ref={canvasRef} aria-label="Auto-rotating whole-body segmentation from TotalSegmentator reference CT s1045; drag to inspect" />
          <div className="rav-model-caption"><span>DRAG TO ROTATE</span><span>GROUP-AVERAGED COHORT ρ · REFERENCE GEOMETRY</span></div>
          <figure className="rav-proof">
            <Image src="/evidence/ct-segmentation-proof.png" alt="Source CT slice and TotalSegmentator mask used as supporting proof for the extracted geometry" fill unoptimized sizes="116px" />
            <figcaption>SOURCE MASK PROOF</figcaption>
          </figure>
        </section>

        <section className="rav-heat" data-focus-target="heatmap" data-focus-active={focus === "heatmap"} aria-labelledby="rav-heat-title">
          <div className="rav-heat-head">
            <div><span id="rav-heat-title">VOLUME–AGE ASSOCIATION · n = 1,227</span><strong>36 exact group-averaged cohort ρ values</strong></div>
            <small>Ordered high → low · click to localize</small>
          </div>
          <div className="rav-grid" role="group" aria-label="Coolwarm heatmap of exact cross-sectional Spearman correlations between segmented volume and age">
            {orderedGroups.map((group, index) => {
              const background = groupColors.get(group.group) ?? "#dedddd";
              const style = {
                "--rav-cell": background,
                "--rav-cell-text": textColor(background),
                "--rav-index": index,
              } as CSSProperties;
              return (
                <button
                  key={group.group}
                  type="button"
                  className="rav-cell"
                  style={style}
                  aria-pressed={selected?.group === group.group}
                  aria-label={`${humanize(group.group)}, ${group.layer}, Spearman rho ${group.rho >= 0 ? "plus " : "minus "}${Math.abs(group.rho).toFixed(3)}`}
                  onClick={() => setSelectedGroup(selectedGroup === group.group ? null : group.group)}
                >
                  <span>{humanize(group.group)}</span>
                  <strong>{group.rho >= 0 ? "+" : ""}{group.rho.toFixed(3)}</strong>
                </button>
              );
            })}
          </div>
          <div className="rav-legend" aria-label="Coolwarm scale from negative 0.344 through zero to positive 0.344">
            <span>ρ −0.344</span><i /><span>0</span><i /><span>ρ +0.344</span>
          </div>
          {selected ? (
            <div className="rav-selected" aria-live="polite">
              <div><span>SELECTED GROUP · {selected.layer}</span><strong>{humanize(selected.group)}</strong></div>
              <div><span>SPEARMAN ρ</span><strong>{selected.rho >= 0 ? "+" : ""}{selected.rho.toFixed(3)}</strong></div>
              <div><span>REFERENCE MASK VOXELS</span><strong>{selectedVoxels.toLocaleString()}</strong></div>
              <p><span>Largest labels:</span> {selectedStructures.slice(0, 2).map(([name]) => humanize(name)).join(" · ")}</p>
            </div>
          ) : (
            <div className="rav-selected rav-overview" aria-live="polite">
              <div><span>OVERVIEW</span><strong>All 115 segmented structures</strong></div>
              <div><span>ASSOCIATION RANGE</span><strong>±0.344</strong></div>
              <div><span>INTERACTION</span><strong>Select a group</strong></div>
              <p><span>Color meaning:</span> group-averaged cross-sectional volume–age association, localized on one reference CT.</p>
            </div>
          )}
        </section>
      </div>

      <div className="rav-cross-scale" data-focus-target="cohorts" data-focus-active={focus === "cohorts"}>
        <BrainMark />
        <NhanesMark />
        <p className="rav-boundary"><strong>SEPARATE PUBLIC COHORTS.</strong> CT ρ &gt; 0 means larger volume at older age; ρ &lt; 0 means smaller. It is cross-sectional population association on one reference geometry—not change in one person.</p>
      </div>

      <style>{`
        .rav-root { --rav-ink:#1a1a1f; --rav-soft:#60605b; --rav-muted:#92918b; --rav-line:#dedcd5; --rav-mint:#00a67e; --rav-blue:#3d3dcc; --rav-magenta:#d4236a; --rav-paper:#fff; display:grid; gap:10px; color:var(--rav-ink); }
        .rav-main { min-height:360px; display:grid; grid-template-columns:minmax(270px,.82fr) minmax(510px,1.18fr); overflow:hidden; background:var(--rav-paper); border:1px solid var(--rav-line); border-radius:3px; }
        .rav-model { position:relative; min-height:360px; overflow:hidden; background-color:#f5f3ee; background-image:linear-gradient(rgba(26,26,31,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(26,26,31,.045) 1px,transparent 1px); background-size:32px 32px; border-right:1px solid var(--rav-line); }
        .rav-model canvas { width:100%; height:100%; min-height:360px; display:block; cursor:grab; }
        .rav-model canvas:active { cursor:grabbing; }
        .rav-model-head { position:absolute; z-index:3; top:12px; left:13px; right:13px; display:flex; justify-content:space-between; gap:12px; pointer-events:none; }
        .rav-model-head span,.rav-model-head strong,.rav-model-caption,.rav-proof figcaption { font:700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing:.09em; }
        .rav-model-head span { color:#007e60; }
        .rav-model-head strong { color:var(--rav-muted); }
        .rav-model-caption { position:absolute; z-index:3; left:13px; right:13px; bottom:11px; display:flex; justify-content:space-between; color:var(--rav-muted); pointer-events:none; }
        .rav-proof { position:absolute; z-index:4; right:12px; bottom:27px; width:108px; height:70px; margin:0; overflow:hidden; background:#e5e2dc; border:1px solid rgba(255,255,255,.9); border-radius:2px; }
        .rav-proof img { object-fit:cover; object-position:center; filter:saturate(.8) contrast(1.03); }
        .rav-proof figcaption { position:absolute; left:0; right:0; bottom:0; padding:4px 6px; color:#fff; background:rgba(14,29,34,.72); text-align:center; }
        .rav-heat { min-width:0; padding:13px; display:flex; flex-direction:column; gap:8px; }
        .rav-heat-head { display:flex; align-items:end; justify-content:space-between; gap:16px; }
        .rav-heat-head > div { display:grid; gap:3px; }
        .rav-heat-head span,.rav-selected span,.rav-mark-copy > span { color:#007e60; font:700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing:.1em; }
        .rav-heat-head strong { font-size:14px; letter-spacing:-.025em; }
        .rav-heat-head small { color:var(--rav-muted); font:8px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .rav-grid { flex:1; display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:3px; }
        .rav-cell { min-width:0; min-height:37px; padding:5px 6px; display:grid; align-content:center; gap:1px; overflow:hidden; color:var(--rav-cell-text); background:var(--rav-cell); border:1px solid transparent; border-radius:1px; cursor:pointer; text-align:left; animation:rav-cell-reveal .32s cubic-bezier(.2,.7,.2,1) calc(var(--rav-index) * 18ms) both; transition:box-shadow .15s ease,filter .15s ease; }
        @keyframes rav-cell-reveal { from { opacity:.08; transform:scale(.88); } to { opacity:1; transform:scale(1); } }
        .rav-cell:hover { z-index:1; filter:saturate(1.15); }
        .rav-cell:focus-visible { z-index:2; outline:2px solid #172126; outline-offset:1px; }
        .rav-cell[aria-pressed="true"] { z-index:1; box-shadow:0 0 0 1px #fff,0 0 0 2px var(--rav-ink); }
        .rav-cell span { overflow:hidden; font-size:6.5px; line-height:1.05; text-overflow:ellipsis; white-space:nowrap; }
        .rav-cell strong { font:700 8px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .rav-legend { display:grid; grid-template-columns:auto 1fr auto 1fr auto; align-items:center; gap:7px; color:var(--rav-muted); font:8px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .rav-legend i { height:3px; }
        .rav-legend i:first-of-type { background:linear-gradient(90deg,#3d3dcc,#a9afea,#dedcd5); }
        .rav-legend i:last-of-type { background:linear-gradient(90deg,#dedcd5,#ef9bbd,#d4236a); }
        .rav-selected { min-height:48px; padding:7px 9px; display:grid; grid-template-columns:1fr .62fr .8fr; align-items:center; gap:9px; background:#f8f7f3; border:1px solid var(--rav-line); border-radius:2px; }
        .rav-selected > div { min-width:0; display:grid; gap:2px; }
        .rav-selected strong { overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
        .rav-selected > div:nth-child(2) strong { font:700 13px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .rav-selected > div:nth-child(3) strong { font:700 10px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .rav-selected p { grid-column:1/-1; margin:0; overflow:hidden; color:var(--rav-soft); font-size:7px; text-overflow:ellipsis; white-space:nowrap; }
        .rav-selected p span { color:var(--rav-muted); }
        .rav-cross-scale { display:grid; grid-template-columns:1fr 1fr minmax(220px,.72fr); gap:8px; }
        .rav-mark { min-width:0; min-height:86px; padding:8px 10px; display:grid; grid-template-columns:minmax(145px,.8fr) minmax(170px,1.2fr); align-items:center; gap:7px; background:#fff; border:1px solid var(--rav-line); border-radius:2px; }
        .rav-mark-copy { min-width:0; display:grid; gap:3px; }
        .rav-mark-copy strong { font-size:17px; letter-spacing:-.04em; }
        .rav-mark-copy strong sub { font-size:9px; }
        .rav-mark-copy small { color:var(--rav-muted); font-size:8px; line-height:1.35; }
        .rav-mark svg { width:100%; height:64px; overflow:visible; }
        .rav-mark svg line { stroke:#bccacb; stroke-width:1; }
        .rav-mark svg text { fill:var(--rav-soft); font:6px "JetBrains Mono",var(--font-geist-mono),monospace; }
        .rav-brain-mark svg rect { fill:#6d79dc; }
        .rav-brain-mark svg .rav-brain-old { fill:#d4236a; }
        .rav-nhanes-mark svg path { fill:none; stroke:#00a67e; stroke-width:2; }
        .rav-nhanes-mark svg circle { fill:#fff; stroke:#00a67e; stroke-width:2; }
        .rav-boundary { margin:0; padding:13px; align-content:center; color:var(--rav-soft); background:#f6faf8; border-left:2px solid var(--rav-mint); font-size:9px; line-height:1.42; }
        .rav-boundary strong { display:block; margin-bottom:4px; color:#007e60; font:700 8px "JetBrains Mono",var(--font-geist-mono),monospace; letter-spacing:.1em; }
        @media (max-width:1050px) {
          .rav-main { grid-template-columns:minmax(260px,.72fr) minmax(430px,1.28fr); }
          .rav-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
          .rav-cell { min-height:32px; }
          .rav-cross-scale { grid-template-columns:1fr 1fr; }
          .rav-boundary { grid-column:1/-1; }
        }
        @media (max-width:760px) {
          .rav-main { grid-template-columns:1fr; }
          .rav-model { min-height:330px; border-right:0; border-bottom:1px solid var(--rav-line); }
          .rav-model canvas { min-height:330px; }
          .rav-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
          .rav-cell { min-height:39px; }
          .rav-cross-scale { grid-template-columns:1fr; }
          .rav-boundary { grid-column:auto; }
        }
        @media (max-width:480px) {
          .rav-heat-head { align-items:start; flex-direction:column; gap:4px; }
          .rav-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .rav-selected { grid-template-columns:1fr 1fr; }
          .rav-selected > div:nth-child(3) { grid-column:1/-1; }
          .rav-mark { grid-template-columns:1fr; }
          .rav-proof { width:92px; height:60px; }
          .rav-model-head,.rav-model-caption { align-items:flex-start; flex-direction:column; gap:3px; }
          .rav-model-caption span:last-child { display:none; }
          .rav-selected p { overflow:visible; white-space:normal; }
        }
        @media (prefers-reduced-motion:reduce) {
          .rav-cell { animation:none; transition:none; }
        }
      `}</style>
    </div>
  );
}
