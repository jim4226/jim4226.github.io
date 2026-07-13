"use client";

import * as nifti from "nifti-reader-js";
import { useEffect, useMemo, useRef, useState } from "react";

type Orientation = "axial" | "coronal" | "sagittal";
type BrainView = "t1" | "tissue" | "dkt";
type VoxelArray = Uint8Array | Uint16Array | Int16Array | Float32Array;

type BrainScan = {
  id: string;
  ageBin: string;
  ageMid: number;
  group: string;
  brainAge: number;
  gmFraction: number;
  csfFraction: number;
  ventricleVolumeMm3: number;
  dktLabelCount: number;
  disagreement: number;
  shape: [number, number, number];
  spacingMm: [number, number, number];
  files: { t1: string; atropos: string; dkt: string };
};

type TissueDefinition = { id: string; label: number; name: string };
type DktDefinition = { id: string; name: string; labels?: number[]; range?: [number, number] };
type BrainManifest = {
  dataset: string;
  modality: string;
  source: string;
  license: string;
  processing: string;
  tissues: TissueDefinition[];
  dktGroups: DktDefinition[];
  scans: BrainScan[];
};

type Volume = {
  values: VoxelArray;
  dims: [number, number, number];
};

type VolumeSet = {
  t1: Volume;
  atropos: Volume;
  dkt: Volume;
  intensity: [number, number];
  tissueCounts: Map<number, number>;
  dktCounts: Map<number, number>;
};

const volumeCache = new Map<string, Promise<VolumeSet>>();

function typedValues(datatype: number, buffer: ArrayBuffer): VoxelArray {
  if (datatype === nifti.NIFTI1.TYPE_UINT8) return new Uint8Array(buffer);
  if (datatype === nifti.NIFTI1.TYPE_UINT16) return new Uint16Array(buffer);
  if (datatype === nifti.NIFTI1.TYPE_INT16) return new Int16Array(buffer);
  if (datatype === nifti.NIFTI1.TYPE_FLOAT32) return new Float32Array(buffer);
  throw new Error(`Unsupported NIfTI datatype ${datatype}`);
}

async function loadVolume(url: string): Promise<Volume> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  const compressed = await response.arrayBuffer();
  const raw = nifti.isCompressed(compressed) ? await nifti.decompressAsync(compressed) : compressed;
  const header = nifti.readHeader(raw);
  const image = nifti.readImage(header, raw);
  return {
    values: typedValues(header.datatypeCode, image),
    dims: [header.dims[1], header.dims[2], header.dims[3]],
  };
}

function countLabels(values: VoxelArray) {
  const counts = new Map<number, number>();
  for (let index = 0; index < values.length; index += 1) {
    const value = Math.round(values[index]);
    if (value > 0) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function intensityWindow(values: VoxelArray): [number, number] {
  const histogram = new Uint32Array(256);
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = Math.max(0, Math.min(255, Math.round(values[index])));
    if (value > 0) {
      histogram[value] += 1;
      total += 1;
    }
  }
  const lowTarget = total * 0.01;
  const highTarget = total * 0.995;
  let cumulative = 0;
  let low = 1;
  let high = 255;
  for (let value = 1; value < histogram.length; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= lowTarget && low === 1) low = value;
    if (cumulative >= highTarget) {
      high = value;
      break;
    }
  }
  return [low, Math.max(high, low + 1)];
}

function loadVolumes(scan: BrainScan) {
  const cached = volumeCache.get(scan.id);
  if (cached) return cached;
  const promise = Promise.all([
    loadVolume(scan.files.t1),
    loadVolume(scan.files.atropos),
    loadVolume(scan.files.dkt),
  ]).then(([t1, atropos, dkt]) => ({
    t1,
    atropos,
    dkt,
    intensity: intensityWindow(t1.values),
    tissueCounts: countLabels(atropos.values),
    dktCounts: countLabels(dkt.values),
  }));
  volumeCache.set(scan.id, promise);
  return promise;
}

function dimensionFor(orientation: Orientation, dims: [number, number, number]) {
  if (orientation === "axial") return { width: dims[0], height: dims[1], slices: dims[2] };
  if (orientation === "coronal") return { width: dims[0], height: dims[2], slices: dims[1] };
  return { width: dims[1], height: dims[2], slices: dims[0] };
}

function voxelIndex(
  orientation: Orientation,
  column: number,
  row: number,
  slice: number,
  dims: [number, number, number],
) {
  const [nx, ny, nz] = dims;
  if (orientation === "axial") {
    const y = ny - 1 - row;
    return column + nx * (y + ny * slice);
  }
  if (orientation === "coronal") {
    const z = nz - 1 - row;
    return column + nx * (slice + ny * z);
  }
  const z = nz - 1 - row;
  const y = ny - 1 - column;
  return slice + nx * (y + ny * z);
}

function dktMatch(value: number, selected: DktDefinition | null) {
  if (!selected || value === 0) return false;
  if (selected.labels?.includes(value)) return true;
  return Boolean(selected.range && value >= selected.range[0] && value <= selected.range[1]);
}

function selectedDktCount(definition: DktDefinition | null, counts: Map<number, number>) {
  if (!definition) return 0;
  let total = 0;
  counts.forEach((count, label) => {
    if (dktMatch(label, definition)) total += count;
  });
  return total;
}

export default function BrainMRIExplorer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [manifest, setManifest] = useState<BrainManifest | null>(null);
  const [subjectId, setSubjectId] = useState("sub-010003");
  const [volumes, setVolumes] = useState<VolumeSet | null>(null);
  const [loadedSubjectId, setLoadedSubjectId] = useState("");
  const [view, setView] = useState<BrainView>("tissue");
  const [orientation, setOrientation] = useState<Orientation>("axial");
  const [slice, setSlice] = useState(128);
  const [tissueId, setTissueId] = useState("cortical_gm");
  const [dktId, setDktId] = useState("ventricles");
  const [overlayOpacity, setOverlayOpacity] = useState(0.58);
  const [loadErrorId, setLoadErrorId] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/mri/lemon/manifest.json")
      .then((response) => {
        if (!response.ok) throw new Error("Manifest unavailable");
        return response.json() as Promise<BrainManifest>;
      })
      .then((nextManifest) => {
        if (active) setManifest(nextManifest);
      })
      .catch(() => {
        if (active) setLoadErrorId("manifest");
      });
    return () => {
      active = false;
    };
  }, []);

  const scan = manifest?.scans.find((item) => item.id === subjectId) ?? manifest?.scans[0] ?? null;
  const tissue = manifest?.tissues.find((item) => item.id === tissueId) ?? null;
  const dkt = manifest?.dktGroups.find((item) => item.id === dktId) ?? null;
  const activeVolumes = scan?.id === loadedSubjectId ? volumes : null;
  const loadError = loadErrorId === "manifest" || Boolean(scan && loadErrorId === scan.id);

  useEffect(() => {
    if (!scan) return;
    let active = true;
    loadVolumes(scan)
      .then((nextVolumes) => {
        if (active) {
          setVolumes(nextVolumes);
          setLoadedSubjectId(scan.id);
          setLoadErrorId("");
        }
      })
      .catch(() => {
        if (active) setLoadErrorId(scan.id);
      });
    return () => {
      active = false;
    };
  }, [scan]);

  const plane = useMemo(
    () => dimensionFor(orientation, activeVolumes?.t1.dims ?? scan?.shape ?? [256, 256, 256]),
    [activeVolumes?.t1.dims, orientation, scan?.shape],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeVolumes) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = plane.width;
    canvas.height = plane.height;
    const frame = context.createImageData(plane.width, plane.height);
    const [low, high] = activeVolumes.intensity;
    const selectedLabel = tissue?.label ?? -1;

    for (let row = 0; row < plane.height; row += 1) {
      for (let column = 0; column < plane.width; column += 1) {
        const sourceIndex = voxelIndex(orientation, column, row, slice, activeVolumes.t1.dims);
        const targetIndex = (column + plane.width * row) * 4;
        const raw = Number(activeVolumes.t1.values[sourceIndex]);
        const gray = Math.max(0, Math.min(255, Math.round(((raw - low) / (high - low)) * 255)));
        let red = gray;
        let green = gray;
        let blue = gray;
        let highlighted = false;
        if (view === "tissue") highlighted = Number(activeVolumes.atropos.values[sourceIndex]) === selectedLabel;
        if (view === "dkt") highlighted = dktMatch(Number(activeVolumes.dkt.values[sourceIndex]), dkt);
        if (highlighted) {
          const color = view === "dkt" ? [212, 35, 106] : [0, 166, 126];
          red = Math.round(gray * (1 - overlayOpacity) + color[0] * overlayOpacity);
          green = Math.round(gray * (1 - overlayOpacity) + color[1] * overlayOpacity);
          blue = Math.round(gray * (1 - overlayOpacity) + color[2] * overlayOpacity);
        }
        frame.data[targetIndex] = red;
        frame.data[targetIndex + 1] = green;
        frame.data[targetIndex + 2] = blue;
        frame.data[targetIndex + 3] = 255;
      }
    }
    context.putImageData(frame, 0, 0);
  }, [activeVolumes, dkt, orientation, overlayOpacity, plane.height, plane.width, slice, tissue?.label, view]);

  const selectedCount = activeVolumes
    ? view === "dkt"
      ? selectedDktCount(dkt, activeVolumes.dktCounts)
      : view === "tissue" && tissue
        ? activeVolumes.tissueCounts.get(tissue.label) ?? 0
        : 0
    : 0;
  const activeName = view === "t1" ? "Native T1 intensity" : view === "tissue" ? tissue?.name : dkt?.name;

  return (
    <section className="scan-explorer brain-explorer" aria-labelledby="brain-explorer-title">
      <div className="scan-topbar">
        <div>
          <span className="scan-sequence">02 / BRAIN MRI</span>
          <span><strong id="brain-explorer-title">Interactive structural scan</strong><small>LEMON MP2RAGE T1 · ANTs segmentation</small></span>
        </div>
        <label className="scan-record-select">
          <span>Reference record</span>
          <select value={scan?.id ?? subjectId} onChange={(event) => { setSubjectId(event.target.value); setSlice(128); }}>
            {manifest?.scans.map((item) => (
              <option key={item.id} value={item.id}>{item.id} · {item.ageBin} y</option>
            ))}
          </select>
        </label>
        <span className="scan-ready"><i /> {activeVolumes ? "256³ volume ready" : loadError ? "Load failed" : "Loading NIfTI"}</span>
      </div>

      <div className="scan-layout">
        <nav className="scan-nav" aria-label="Brain segmentation regions">
          <span>Layer</span>
          <div className="scan-layer-tabs" role="group" aria-label="MRI display layer">
            <button type="button" aria-pressed={view === "t1"} onClick={() => setView("t1")}>T1</button>
            <button type="button" aria-pressed={view === "tissue"} onClick={() => setView("tissue")}>Tissue</button>
            <button type="button" aria-pressed={view === "dkt"} onClick={() => setView("dkt")}>DKT</button>
          </div>
          <span>{view === "dkt" ? "Parcellation groups" : "Tissue classes"}</span>
          {(view === "dkt" ? manifest?.dktGroups : manifest?.tissues)?.map((item) => {
            const pressed = view === "dkt" ? dktId === item.id : tissueId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={pressed ? "active" : ""}
                aria-pressed={pressed}
                onClick={() => {
                  if (view === "dkt") setDktId(item.id);
                  else setTissueId(item.id);
                }}
              >
                <i className={view === "dkt" ? "dkt" : "tissue"} />
                <span><strong>{item.name}</strong><small>{view === "dkt" ? "DKT label group" : `Atropos label ${(item as TissueDefinition).label}`}</small></span>
              </button>
            );
          })}
          <p>Scroll over the scan or drag the slice control. Every frame is rendered from the committed 3D NIfTI volume.</p>
        </nav>

        <div className="scan-stage">
          <div className="scan-view-tabs" role="group" aria-label="MRI orientation">
            {(["axial", "coronal", "sagittal"] as Orientation[]).map((item) => (
              <button key={item} type="button" aria-pressed={orientation === item} onClick={() => { setOrientation(item); setSlice(128); }}>{item}</button>
            ))}
          </div>
          <div className="mri-canvas-wrap">
            <canvas
              ref={canvasRef}
              aria-label={`${orientation} MRI slice ${slice + 1} of ${plane.slices} for ${scan?.id ?? "LEMON scan"}`}
              onWheel={(event) => {
                event.preventDefault();
                const direction = event.deltaY > 0 ? 1 : -1;
                setSlice((current) => Math.max(0, Math.min(plane.slices - 1, current + direction)));
              }}
            />
            {!activeVolumes && !loadError && <div className="scan-loading"><i /><span>Decoding the real MRI volume…</span></div>}
            {loadError && <div className="scan-loading"><span>The MRI volume could not be loaded.</span></div>}
            <span className="mri-orientation-label">{orientation.toUpperCase()} · {slice + 1}/{plane.slices}</span>
          </div>
          <div className="scan-scrubber">
            <span>SLICE 001</span>
            <input aria-label="MRI slice" type="range" min="0" max={plane.slices - 1} value={slice} onChange={(event) => setSlice(Number(event.target.value))} />
            <span>SLICE {String(plane.slices).padStart(3, "0")}</span>
          </div>
          <label className="scan-opacity">
            <span>Overlay opacity</span>
            <input type="range" min="0.2" max="0.9" step="0.05" value={overlayOpacity} disabled={view === "t1"} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
            <strong>{Math.round(overlayOpacity * 100)}%</strong>
          </label>
        </div>

        <aside className="scan-detail" aria-live="polite">
          <span className="scan-detail-kicker">Selected segmentation</span>
          <h3>{activeName ?? "Loading scan"}</h3>
          <p>{view === "t1" ? "Original skull-stripped MP2RAGE intensity volume" : "Label overlay on the same 1 mm MRI grid"}</p>

          <div className="scan-metrics">
            <div><span>Reference</span><strong>{scan?.id ?? "—"}</strong><small>{scan?.ageBin ?? "—"} year bin</small></div>
            <div><span>Voxel grid</span><strong>256³</strong><small>1 mm isotropic</small></div>
            <div><span>Selected volume</span><strong>{selectedCount ? `${(selectedCount / 1_000).toFixed(1)} mL` : "—"}</strong><small>{selectedCount ? `${selectedCount.toLocaleString()} voxels` : "native intensity"}</small></div>
            <div><span>Brain-age model</span><strong>{scan ? `${scan.brainAge.toFixed(1)} y` : "—"}</strong><small>exploratory output</small></div>
          </div>

          <div className="scan-source-slices">
            <div><span>GM fraction</span><strong>{scan ? scan.gmFraction.toFixed(3) : "—"}</strong></div>
            <div><span>CSF fraction</span><strong>{scan ? scan.csfFraction.toFixed(3) : "—"}</strong></div>
            <div><span>Ventricles</span><strong>{scan ? `${(scan.ventricleVolumeMm3 / 1_000).toFixed(1)} mL` : "—"}</strong></div>
          </div>

          <div className="scan-proof">
            <p><strong>Real MRI, not a screenshot.</strong> The canvas reads the complete T1 NIfTI and its co-registered Deep Atropos and DKT label volumes.</p>
          </div>
          <div className="scan-boundary"><span>Reference MRI cohort</span><p>This LEMON scan is not the selected PTB-XL ECG participant or the TotalSegmentator CT subject.</p></div>
          <a href="https://fcon_1000.projects.nitrc.org/indi/retro/MPI_LEMON.html" target="_blank" rel="noreferrer">MPI LEMON · PDDL · dataset record ↗</a>
        </aside>
      </div>
    </section>
  );
}
