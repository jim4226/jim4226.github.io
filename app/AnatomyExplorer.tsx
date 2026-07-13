"use client";

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
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useEffect, useMemo, useRef, useState } from "react";
import bodyJson from "./data/ctBodyAssociations.json";
import skeletonJson from "./data/ctSkeletonAssociations.json";

type AnatomyMode = "skeleton" | "body";

type AnatomyExplorerProps = {
  initialMode?: AnatomyMode;
  showModeToggle?: boolean;
  guidedMotion?: boolean;
};

type StructureAssociation = {
  group: string;
  layer: "skeleton" | "organ";
  rho: number;
  color: string;
  n_voxels: number;
};

type GroupAssociation = {
  group: string;
  layer: "skeleton" | "organ";
  rho: number;
};

type AssociationData = {
  region: string;
  cmap: string;
  clim: [number, number];
  groups: GroupAssociation[];
  structures: Record<string, StructureAssociation>;
  caveat: string;
};

const datasets: Record<AnatomyMode, { src: string; data: AssociationData }> = {
  skeleton: {
    src: "/models/ct-skeleton.glb",
    data: skeletonJson as unknown as AssociationData,
  },
  body: {
    src: "/models/ct-whole-body.glb",
    data: bodyJson as unknown as AssociationData,
  },
};

const featuredBodyGroups = [
  "heart",
  "aorta",
  "lung",
  "liver",
  "kidney",
  "brain",
  "pancreas",
  "spleen",
  "pelvis",
  "femur",
];

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function materialList(mesh: Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function styleSelection(root: Group | null, data: AssociationData, group: string | null, structure: string | null) {
  if (!root) return;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const meta = data.structures[object.name];
    const inGroup = Boolean(meta && group && meta.group === group);
    const isStructure = Boolean(structure && object.name === structure);
    const baseMaterials = object.userData.baseMaterials as Material[] | undefined;
    const liveMaterials = materialList(object);

    liveMaterials.forEach((material, index) => {
      const base = baseMaterials?.[index];
      if (base) material.copy(base);
      material.transparent = Boolean(group);
      material.opacity = group ? (inGroup ? 1 : 0.1) : 1;
      material.depthWrite = !group || inGroup;

      if (material instanceof MeshStandardMaterial) {
        material.emissive = new Color(isStructure ? "#fff1bd" : inGroup ? "#ef8d7e" : "#000000");
        material.emissiveIntensity = isStructure ? 0.72 : inGroup ? 0.28 : 0;
      }
      material.needsUpdate = true;
    });
  });
}

function AnatomyExplorerInner({ initialMode = "skeleton", showModeToggle = true, guidedMotion = false }: AnatomyExplorerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<Group | null>(null);
  const kickRotationRef = useRef<(() => void) | null>(null);
  const selectedGroupRef = useRef<string | null>(null);
  const selectedStructureRef = useRef<string | null>(null);
  const [mode, setMode] = useState<AnatomyMode>(initialMode);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialMode === "body" ? "heart" : null);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [loadedMode, setLoadedMode] = useState<AnatomyMode | null>(null);
  const [loadError, setLoadError] = useState(false);

  const dataset = datasets[mode];
  const groupOptions = useMemo(() => {
    if (mode === "skeleton") return dataset.data.groups;
    const lookup = new Map(dataset.data.groups.map((item) => [item.group, item]));
    return featuredBodyGroups.map((name) => lookup.get(name)).filter((item): item is GroupAssociation => Boolean(item));
  }, [dataset, mode]);

  const groupMeta = dataset.data.groups.find((item) => item.group === selectedGroup) ?? null;
  const structureMeta = selectedStructure ? dataset.data.structures[selectedStructure] : null;
  const groupStructures = useMemo(
    () => Object.entries(dataset.data.structures).filter(([, meta]) => !selectedGroup || meta.group === selectedGroup),
    [dataset, selectedGroup],
  );
  const groupVoxelCount = groupStructures.reduce((total, [, meta]) => total + meta.n_voxels, 0);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
    selectedStructureRef.current = selectedStructure;
    styleSelection(rootRef.current, dataset.data, selectedGroup, selectedStructure);
  }, [dataset, selectedGroup, selectedStructure]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let pointerStart: { x: number; y: number } | null = null;
    let rotationUntil = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLoadError(false);

    const scene = new Scene();
    const camera = new PerspectiveCamera(43, 1, 0.1, 100_000);
    camera.up.set(0, 0, 1);
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new HemisphereLight(0xf8fcff, 0xdce9e6, 1.6));
    const keyLight = new DirectionalLight(0xffffff, 2);
    keyLight.position.set(1.5, -2, 3);
    scene.add(keyLight);
    const fillLight = new DirectionalLight(0xc8e7ff, 1);
    fillLight.position.set(-2, 1, 1);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 10;
    controls.maxDistance = 10_000;
    controls.autoRotateSpeed = 0.45;

    const kickRotation = () => {
      if (!guidedMotion || reducedMotion) return;
      rotationUntil = performance.now() + 5_500;
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
      dataset.src,
      (gltf) => {
        if (disposed) return;
        const root = gltf.scene;
        root.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const originals = materialList(object);
          originals.forEach((material) => {
            if (!(material instanceof MeshStandardMaterial)) return;
            material.side = DoubleSide;
            material.roughness = 0.76;
            material.metalness = 0;
          });
          object.userData.baseMaterials = originals.map((material) => material.clone());
          const live = originals.map((material) => material.clone());
          object.material = Array.isArray(object.material) ? live : live[0];
        });
        scene.add(root);
        rootRef.current = root;

        const box = new Box3().setFromObject(root);
        const center = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 0.52;
        camera.near = Math.max(radius / 1_000, 0.05);
        camera.far = Math.max(radius * 20, 1_000);
        camera.position.set(center.x + radius * 0.62, center.y - radius * 2.65, center.z + radius * 0.32);
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.minDistance = radius * 0.35;
        controls.maxDistance = radius * 5;
        controls.update();
        styleSelection(root, dataset.data, selectedGroupRef.current, selectedStructureRef.current);
        kickRotation();
        setLoadedMode(mode);
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
      if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5 || !rootRef.current) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(rootRef.current, true).find((entry) => dataset.data.structures[entry.object.name]);
      if (!hit) return;
      const name = hit.object.name;
      const meta = dataset.data.structures[name];
      selectedGroupRef.current = meta.group;
      selectedStructureRef.current = name;
      setSelectedGroup(meta.group);
      setSelectedStructure(name);
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
        (object.userData.baseMaterials as Material[] | undefined)?.forEach((material) => material.dispose());
        object.geometry.dispose();
      });
      rootRef.current = null;
      kickRotationRef.current = null;
      renderer.dispose();
    };
  }, [dataset, guidedMotion, mode]);

  const changeMode = (nextMode: AnatomyMode) => {
    if (nextMode === mode) return;
    const nextGroup = nextMode === "skeleton" ? null : "heart";
    setLoadedMode(null);
    setMode(nextMode);
    setSelectedGroup(nextGroup);
    selectedGroupRef.current = nextGroup;
    setSelectedStructure(null);
    selectedStructureRef.current = null;
    kickRotationRef.current?.();
  };

  const chooseGroup = (group: string | null) => {
    setSelectedGroup(group);
    selectedGroupRef.current = group;
    setSelectedStructure(null);
    selectedStructureRef.current = null;
    kickRotationRef.current?.();
  };

  const rho = structureMeta?.rho ?? groupMeta?.rho ?? null;

  return (
    <section className="anatomy-explorer" aria-labelledby="anatomy-explorer-title">
      <div className="anatomy-topbar scan-topbar">
        <div>
          <span className="scan-sequence" aria-hidden="true">03 / CT</span>
          <span><strong id="anatomy-explorer-title">Scan-derived anatomy explorer</strong><small>TotalSegmentator v2 · reference CT s1045</small></span>
        </div>
        {showModeToggle && (
          <div className="anatomy-mode-toggle" role="group" aria-label="Anatomy dataset">
            <button type="button" aria-pressed={mode === "skeleton"} onClick={() => changeMode("skeleton")}><span aria-hidden="true">01</span> Skeleton</button>
            <button type="button" aria-pressed={mode === "body"} onClick={() => changeMode("body")}><span aria-hidden="true">02</span> Whole body</button>
          </div>
        )}
        <span className="anatomy-ready scan-ready"><i /> {loadedMode === mode ? "3D segmentation ready" : loadError ? "Load failed" : "Loading mesh"}</span>
      </div>

      <div className="anatomy-layout">
        <nav className="anatomy-nav" aria-label="Segment groups">
          <span>{mode === "skeleton" ? "Bone regions" : "Organ systems"}</span>
          <button type="button" className={!selectedGroup ? "active" : ""} onClick={() => chooseGroup(null)} aria-pressed={!selectedGroup}>
            <strong>All structures</strong><small>{Object.keys(dataset.data.structures).length} named meshes</small>
          </button>
          {groupOptions.map((item) => (
            <button key={item.group} type="button" className={selectedGroup === item.group ? "active" : ""} onClick={() => chooseGroup(item.group)} aria-pressed={selectedGroup === item.group}>
              <i style={{ background: dataset.data.structures[Object.keys(dataset.data.structures).find((name) => dataset.data.structures[name].group === item.group) ?? ""]?.color }} />
              <span><strong>{humanize(item.group)}</strong><small>ρ {item.rho >= 0 ? "+" : ""}{item.rho.toFixed(3)}</small></span>
            </button>
          ))}
          {mode === "body" && <p>Click any visible structure to inspect all 115 labels, including vessels and muscle groups.</p>}
        </nav>

        <div className="anatomy-stage">
          <div className="anatomy-stage-label"><span aria-hidden="true">360°</span><span>Drag to rotate · scroll to zoom · click a structure</span></div>
          <canvas ref={canvasRef} aria-label={`Interactive ${mode === "skeleton" ? "63-part skeleton" : "115-structure whole-body"} segmentation from reference CT subject s1045`} />
          {!loadError && loadedMode !== mode && <div className="anatomy-loading"><i /><span>Loading real segmented geometry…</span></div>}
          {loadError && <div className="anatomy-loading anatomy-error"><span>The 3D mesh could not be loaded.</span></div>}
          <div className="anatomy-scale"><span>ρ −0.344</span><i /><span>ρ +0.344</span></div>
        </div>

        <aside className="anatomy-detail" aria-live="polite">
          <span className="anatomy-detail-kicker">Selected segmentation</span>
          <h3>{humanize(selectedStructure ?? selectedGroup ?? "All structures")}</h3>
          <p>{selectedStructure ? `Exact CT mask structure · ${humanize(structureMeta?.layer ?? "")}` : selectedGroup ? `${groupStructures.length} linked mesh${groupStructures.length === 1 ? "" : "es"}` : "Complete scan-derived geometry"}</p>

          <div className="anatomy-metrics">
            <div><span>Volume–age ρ</span><strong>{rho === null ? "—" : `${rho >= 0 ? "+" : ""}${rho.toFixed(3)}`}</strong><small>Spearman, cohort-level</small></div>
            <div><span>Mask voxels</span><strong>{(structureMeta?.n_voxels ?? groupVoxelCount).toLocaleString()}</strong><small>{selectedStructure ? "selected label" : "group total"}</small></div>
            <div><span>Source cohort</span><strong>n = 1,227</strong><small>CT exams with age</small></div>
            <div><span>Reference scan</span><strong>s1045</strong><small>real CT geometry</small></div>
          </div>

          <div className="anatomy-association">
            <span style={{ background: structureMeta?.color ?? groupStructures[0]?.[1].color ?? "#80b7d4" }} />
            <p>{rho === null ? "Original association colors are preserved on every structure." : `${rho >= 0 ? "Positive" : "Negative"} cross-sectional volume–age association.`}</p>
          </div>

          <div className="anatomy-proof">
            <span aria-hidden="true">PROOF</span>
            <p><strong>Not an illustration.</strong> The geometry was generated from a multi-label CT mask; the color is a separate population statistic projected onto that anatomy.</p>
          </div>
          <a href="https://zenodo.org/records/10047292" target="_blank" rel="noreferrer">Dataset record · CC BY 4.0 ↗</a>
        </aside>
      </div>
    </section>
  );
}

export default function AnatomyExplorer(props: AnatomyExplorerProps) {
  const initialMode = props.initialMode ?? "skeleton";
  return <AnatomyExplorerInner key={initialMode} {...props} initialMode={initialMode} />;
}
