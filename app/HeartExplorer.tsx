"use client";

import {
  Box3,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useEffect, useRef, useState } from "react";

type HeartRegionId =
  | "left_atrium"
  | "right_atrium"
  | "left_ventricle"
  | "right_ventricle"
  | "epicardium";

type HeartPhase = "anatomy" | "P" | "AV" | "QRS" | "STT";

type HeartRegion = {
  id: HeartRegionId;
  shortName: string;
  name: string;
  surface: string;
  vertices: number;
  faces: number;
  areaMm2: number;
  volumeMl: number;
  color: string;
};

type PhaseDefinition = {
  id: HeartPhase;
  label: string;
  title: string;
  description: string;
  regions: HeartRegionId[];
  tone: "neutral" | "atrial" | "av" | "ventricular" | "recovery";
  accent: string;
  surfaceColor: string;
  emissive: string;
  tint: string;
};

const regions: HeartRegion[] = [
  {
    id: "left_atrium",
    shortName: "LA",
    name: "Left atrium",
    surface: "Chamber cavity surface",
    vertices: 1_646,
    faces: 3_288,
    areaMm2: 9_392.2,
    volumeMl: 70.41,
    color: "#b9d8d1",
  },
  {
    id: "right_atrium",
    shortName: "RA",
    name: "Right atrium",
    surface: "Chamber cavity surface",
    vertices: 2_130,
    faces: 4_256,
    areaMm2: 12_659.6,
    volumeMl: 98.55,
    color: "#bfdce4",
  },
  {
    id: "left_ventricle",
    shortName: "LV",
    name: "Left ventricle",
    surface: "Chamber cavity surface",
    vertices: 3_190,
    faces: 6_376,
    areaMm2: 19_393.9,
    volumeMl: 200.56,
    color: "#d2e1dc",
  },
  {
    id: "right_ventricle",
    shortName: "RV",
    name: "Right ventricle",
    surface: "Chamber cavity surface",
    vertices: 3_518,
    faces: 7_032,
    areaMm2: 20_785.7,
    volumeMl: 188.51,
    color: "#d6e6ea",
  },
  {
    id: "epicardium",
    shortName: "EPI",
    name: "Epicardium",
    surface: "Outer cardiac surface",
    vertices: 9_910,
    faces: 19_816,
    areaMm2: 57_431.8,
    volumeMl: 963.58,
    color: "#e7ece8",
  },
];

const regionById = Object.fromEntries(regions.map((region) => [region.id, region])) as Record<HeartRegionId, HeartRegion>;

const phases: PhaseDefinition[] = [
  {
    id: "anatomy",
    label: "Base",
    title: "Neutral anatomy",
    description: "Original neutral surfaces; no phase emphasis.",
    regions: [],
    tone: "neutral",
    accent: "#697873",
    surfaceColor: "#d8e2de",
    emissive: "#69877f",
    tint: "rgba(105, 120, 115, .1)",
  },
  {
    id: "P",
    label: "P",
    title: "Atria",
    description: "Atrial cavity surfaces shown in coral.",
    regions: ["left_atrium", "right_atrium"],
    tone: "atrial",
    accent: "#c85f54",
    surfaceColor: "#e9a096",
    emissive: "#a94338",
    tint: "rgba(200, 95, 84, .11)",
  },
  {
    id: "AV",
    label: "AV",
    title: "AV interval",
    description: "Amber marks this control state only; no AV-node mesh exists.",
    regions: [],
    tone: "av",
    accent: "#b77b17",
    surfaceColor: "#e5bd70",
    emissive: "#8f5e0e",
    tint: "rgba(183, 123, 23, .11)",
  },
  {
    id: "QRS",
    label: "QRS",
    title: "Ventricles",
    description: "Ventricular cavity surfaces shown in blue–indigo.",
    regions: ["left_ventricle", "right_ventricle"],
    tone: "ventricular",
    accent: "#4768ad",
    surfaceColor: "#91a9df",
    emissive: "#294b93",
    tint: "rgba(71, 104, 173, .11)",
  },
  {
    id: "STT",
    label: "ST–T",
    title: "Recovery",
    description: "Ventricles and epicardium shown in magenta.",
    regions: ["left_ventricle", "right_ventricle", "epicardium"],
    tone: "recovery",
    accent: "#b93172",
    surfaceColor: "#df86af",
    emissive: "#8d2058",
    tint: "rgba(185, 49, 114, .11)",
  },
];

const phaseById = Object.fromEntries(phases.map((phase) => [phase.id, phase])) as Record<HeartPhase, PhaseDefinition>;

function materialList(mesh: Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function isHeartRegion(value: string): value is HeartRegionId {
  return value in regionById;
}

function applyHeartStyle(root: Group | null, selectedRegion: HeartRegionId, phase: HeartPhase) {
  if (!root) return;
  const phaseDefinition = phaseById[phase];
  const localized = new Set(phaseDefinition.regions);
  const hasLocalization = localized.size > 0;

  root.traverse((object) => {
    if (!(object instanceof Mesh) || !isHeartRegion(object.name)) return;
    const region = regionById[object.name];
    const selected = object.name === selectedRegion;
    const phaseRegion = localized.has(object.name);
    const epicardium = object.name === "epicardium";

    materialList(object).forEach((material) => {
      if (!(material instanceof MeshStandardMaterial)) return;
      material.color.set(phaseRegion ? phaseDefinition.surfaceColor : region.color);
      material.emissive.set(phaseRegion ? phaseDefinition.emissive : selected ? "#69877f" : "#000000");
      material.emissiveIntensity = phaseRegion ? (selected ? 0.62 : 0.38) : selected ? 0.2 : 0;
      material.transparent = true;

      if (epicardium) {
        material.opacity = phaseRegion ? (selected ? 0.62 : 0.38) : selected ? 0.6 : 0.16;
        material.depthWrite = false;
      } else {
        material.opacity = phaseRegion ? 1 : hasLocalization ? (selected ? 0.56 : 0.3) : selected ? 1 : 0.86;
        material.depthWrite = material.opacity > 0.5;
      }
      material.needsUpdate = true;
    });
  });
}

type HeartExplorerProps = {
  guidedMotion?: boolean;
};

export default function HeartExplorer({ guidedMotion = false }: HeartExplorerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<Group | null>(null);
  const kickRotationRef = useRef<(() => void) | null>(null);
  const selectedRegionRef = useRef<HeartRegionId>("left_ventricle");
  const phaseRef = useRef<HeartPhase>("anatomy");
  const [selectedRegion, setSelectedRegion] = useState<HeartRegionId>("left_ventricle");
  const [phase, setPhase] = useState<HeartPhase>("anatomy");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const selected = regionById[selectedRegion];
  const phaseDefinition = phaseById[phase];

  useEffect(() => {
    selectedRegionRef.current = selectedRegion;
    phaseRef.current = phase;
    applyHeartStyle(rootRef.current, selectedRegion, phase);
  }, [phase, selectedRegion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let pointerStart: { x: number; y: number } | null = null;
    let rotationUntil = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 10_000);
    camera.up.set(0, 0, 1);
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new HemisphereLight(0xffffff, 0xd8e7e3, 1.7));
    const keyLight = new DirectionalLight(0xffffff, 2.15);
    keyLight.position.set(2.2, -2.4, 3.4);
    scene.add(keyLight);
    const fillLight = new DirectionalLight(0xc7e6e0, 1.05);
    fillLight.position.set(-2.4, 1.2, 1.4);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 10_000;
    controls.autoRotateSpeed = 0.6;

    const kickRotation = () => {
      if (!guidedMotion || reducedMotion) return;
      rotationUntil = performance.now() + 4_500;
    };
    const stopRotation = () => {
      rotationUntil = 0;
      controls.autoRotate = false;
    };
    kickRotationRef.current = kickRotation;
    controls.addEventListener("start", stopRotation);

    const raycaster = new Raycaster();
    const pointer = new Vector2();

    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const loader = new GLTFLoader();
    loader.load(
      "/models/heart-four-chamber-neutral.glb",
      (gltf) => {
        if (disposed) return;
        const root = gltf.scene;
        root.traverse((object) => {
          if (!(object instanceof Mesh) || !isHeartRegion(object.name)) return;
          // The source GLB intentionally stores compact positions/indices only.
          // Generate smooth vertex normals in-browser so lit chamber surfaces do
          // not render black while preserving the released mesh coordinates.
          object.geometry.computeVertexNormals();
          object.geometry.normalizeNormals();
          const originalMaterials = materialList(object);
          object.userData.originalMaterials = originalMaterials;
          const material = new MeshStandardMaterial({
            color: regionById[object.name].color,
            roughness: 0.7,
            metalness: 0,
            side: DoubleSide,
            transparent: true,
          });
          object.material = material;
          object.renderOrder = object.name === "epicardium" ? 2 : 1;
        });
        scene.add(root);
        rootRef.current = root;

        const box = new Box3().setFromObject(root);
        const center = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 0.52;
        camera.near = Math.max(radius / 1_000, 0.02);
        camera.far = Math.max(radius * 30, 1_000);
        camera.position.set(center.x + radius * 1.28, center.y - radius * 2.35, center.z + radius * 0.58);
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.minDistance = radius * 0.55;
        controls.maxDistance = radius * 4.5;
        controls.update();

        applyHeartStyle(root, selectedRegionRef.current, phaseRef.current);
        kickRotation();
        setLoaded(true);
      },
      undefined,
      () => {
        if (!disposed) setLoadError(true);
      },
    );

    const onPointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerStart;
      pointerStart = null;
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5 || !rootRef.current) return;

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(rootRef.current, true).filter((entry) => isHeartRegion(entry.object.name));
      const hit = intersections.find((entry) => entry.object.name !== "epicardium") ?? intersections[0];
      if (!hit || !isHeartRegion(hit.object.name)) return;
      selectedRegionRef.current = hit.object.name;
      setSelectedRegion(hit.object.name);
      kickRotation();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    const animate = () => {
      controls.autoRotate = guidedMotion && !reducedMotion && performance.now() < rotationUntil;
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      controls.removeEventListener("start", stopRotation);
      observer.disconnect();
      controls.dispose();
      rootRef.current?.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        materialList(object).forEach((material) => material.dispose());
        (object.userData.originalMaterials as Material[] | undefined)?.forEach((material) => material.dispose());
        object.geometry.dispose();
      });
      rootRef.current = null;
      kickRotationRef.current = null;
      renderer.dispose();
    };
  }, [guidedMotion]);

  const chooseRegion = (region: HeartRegionId) => {
    selectedRegionRef.current = region;
    setSelectedRegion(region);
    kickRotationRef.current?.();
  };

  const choosePhase = (nextPhase: HeartPhase) => {
    const nextDefinition = phaseById[nextPhase];
    if (nextDefinition.regions.length > 0 && !nextDefinition.regions.includes(selectedRegionRef.current)) {
      const nextRegion = nextDefinition.regions[0];
      selectedRegionRef.current = nextRegion;
      setSelectedRegion(nextRegion);
    }
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    kickRotationRef.current?.();
  };

  return (
    <section className="scan-explorer heart-explorer" data-phase={phase} data-phase-tone={phaseDefinition.tone} aria-labelledby="heart-explorer-title">
      <div className="scan-topbar">
        <div>
          <span className="scan-sequence">01 / CARDIAC MRI</span>
          <span>
            <strong id="heart-explorer-title">Four-chamber reference anatomy</strong>
            <small>CardioMechanics · manually segmented 1.5 T MRI</small>
          </span>
        </div>
        <div className="scan-record-select heart-record">
          <span>Reference model</span>
          <strong>Gerach 4CH · MRI</strong>
        </div>
        <span className="scan-ready"><i /> {loaded ? "5 named surfaces ready" : loadError ? "Load failed" : "Loading GLB"}</span>
      </div>

      <div className="scan-layout">
        <nav className="scan-nav" aria-label="Cardiac surface selection">
          <span>Named surfaces</span>
          {regions.map((region) => (
            <button
              key={region.id}
              type="button"
              className={selectedRegion === region.id ? "active" : ""}
              aria-pressed={selectedRegion === region.id}
              onClick={() => chooseRegion(region.id)}
            >
              <i style={{ background: region.color }} />
              <span><strong>{region.name}</strong><small>{region.shortName} · {region.faces.toLocaleString()} faces</small></span>
            </button>
          ))}
          <p>Click a named mesh or select it here. Drag to rotate and scroll to zoom. The epicardium remains translucent so the chamber surfaces stay visible.</p>
          <div className="heart-source-note">
            <strong>Five source surfaces</strong>
            <span>Four chamber cavities plus one epicardial surface. This model contains no valves, AV node, or conduction-system mesh.</span>
          </div>
        </nav>

        <div className="scan-stage">
          <div className="scan-view-tabs heart-phase-tabs" role="group" aria-label="Explanatory ECG localization">
            {phases.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`heart-phase-option phase-${item.tone}`}
                data-phase={item.id}
                data-phase-tone={item.tone}
                aria-label={`${item.label}: ${item.title}`}
                aria-pressed={phase === item.id}
                style={phase === item.id ? { color: item.accent, background: item.tint, boxShadow: `inset 0 -2px ${item.accent}` } : undefined}
                onClick={() => choosePhase(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="heart-canvas-wrap">
            <canvas ref={canvasRef} aria-label={`Interactive MRI-segmented four-chamber heart with ${selected.name} selected; ${phaseDefinition.title} explanatory state`} />
            {!loaded && !loadError && <div className="scan-loading"><i /><span>Loading the segmented cardiac surfaces…</span></div>}
            {loadError && <div className="scan-loading"><span>The cardiac model could not be loaded.</span></div>}
            <span className="heart-view-label">DRAG TO ROTATE · SCROLL TO ZOOM · CLICK A SURFACE</span>
          </div>

          <div
            className={`heart-phase-readout phase-${phaseDefinition.tone}`}
            data-phase={phase}
            data-phase-tone={phaseDefinition.tone}
            style={{ borderColor: phaseDefinition.tint, boxShadow: `inset 3px 0 ${phaseDefinition.accent}` }}
            aria-live="polite"
          >
            <span style={{ color: phaseDefinition.accent }}>{phaseDefinition.label}</span>
            <div><strong>{phaseDefinition.title}</strong><p>{phaseDefinition.description}</p></div>
          </div>
          <p className="heart-phase-disclaimer"><strong>Explanatory localization only.</strong> Phase emphasis is conventional anatomy guidance—not measured activation, voltage, participant-specific reconstruction, causal attribution, or model saliency.</p>
        </div>

        <aside className="scan-detail" aria-live="polite">
          <span className="scan-detail-kicker">Selected source mesh</span>
          <h3>{selected.name}</h3>
          <p>{selected.surface} · node <code>{selected.id}</code></p>

          <div className="scan-metrics heart-metrics">
            <div><span>Vertices</span><strong>{selected.vertices.toLocaleString()}</strong><small>source STL mesh</small></div>
            <div><span>Faces</span><strong>{selected.faces.toLocaleString()}</strong><small>triangles</small></div>
            <div><span>Surface area</span><strong>{selected.areaMm2.toLocaleString("en-US", { maximumFractionDigits: 1 })}</strong><small>mm²</small></div>
            <div><span>Enclosed volume</span><strong>{selected.volumeMl.toFixed(2)}</strong><small>mL</small></div>
          </div>

          <div className="scan-source-slices heart-surface-summary">
            <div><span>Selected label</span><strong>{selected.shortName}</strong></div>
            <div><span>Model surfaces</span><strong>5</strong></div>
            <div><span>Modality</span><strong>1.5 T MRI</strong></div>
          </div>

          <div className="scan-proof">
            <p><strong>Real segmented geometry.</strong> The neutral GLB is built from five separately named STL surfaces in the published CardioMechanics four-chamber model.</p>
          </div>
          <div className="scan-boundary">
            <span>Reference-anatomy boundary</span>
            <p>This consenting 33-year-old male MRI volunteer is not the selected PTB-XL ECG participant. Chamber metrics describe this reference mesh only.</p>
          </div>
          <a href="https://zenodo.org/records/5573921" target="_blank" rel="noreferrer">Gerach et al. · DOI 10.5281/zenodo.5573921 · CC BY-NC 4.0</a>
        </aside>
      </div>
    </section>
  );
}
