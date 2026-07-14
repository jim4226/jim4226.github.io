# HumanVector Atlas

**Interactive companion to _From Clocks to Coordinates_**

**Primary research artifact:** [54-page full paper](https://jim4226.github.io/papers/from-clocks-to-coordinates-full-paper.pdf)

[Interactive atlas](https://jim4226.github.io/) · [6-page judge brief](https://jim4226.github.io/papers/from-clocks-to-coordinates-judge-brief.pdf) · [Research repository](https://github.com/jim4226/ClaudeScienceHackathon_2026)

HumanVector Atlas is the reviewer-facing demo for **From Clocks to Coordinates**. It turns the research repository into a guided, interactive story: begin with one real ECG, split the heartbeat into electrical subsystem clocks, follow the null-to-mechanism-to-transport discovery arc, and then explore how the same coordinate question was tested across brain MRI, skeleton CT, organ systems, movement, and regulatory genomics.

The product framing is deliberately precise: this is a **cross-cohort evidence atlas plus a future whole-person blueprint**, not a multimodal patient digital twin.

## Reviewer flow

1. On `/`, use the unified Atlas Viewer to switch among a real five-surface heart, complete LEMON MRI volumes, a 63-part skeleton, and a 115-structure whole-body CT.
2. In Brain MRI, choose a released LEMON record, scrub all 256 axial/coronal/sagittal slices, and switch among native T1, six-tissue Atropos, and DKT groups.
3. In Heart MRI, click a chamber surface or choose a named chamber; phase buttons project an explicitly explanatory localization map onto the real MRI segmentation.
4. In Skeleton CT or Whole-body CT, rotate, zoom, click, and filter the named TotalSegmentator masks and their population-level volume–age associations.
5. Open `/participant` to filter one of three real, de-identified PTB-XL ECG examples inside the same workstation-style shell and inspect the measured trace, subsystem clocks, A/D geometry, and signed q coordinates.
6. Open `/results` with the participant selection preserved in the URL. Present the six-slide evidence deck with its numbered rail, Previous/Next controls, or the arrow keys; every slide keeps the result and its scientific boundary together.

## Scientific boundaries

- The ECG, MRI, CT, NHANES, motion, and genomics panels come from independent datasets. They are not measurements from one person.
- The three selectable profiles contain real ECG inputs and frozen HeartVector outputs only. Other modalities are clearly labeled as separate-cohort evidence.
- The 3D heart contains four chamber-cavity surfaces and an epicardial surface manually segmented from a separate 1.5 T MRI. The phase colors are explanatory overlays, not voltage measurements, causal saliency, or an ECG reconstruction.
- The LEMON viewer loads complete 256³ released MRI records and their processed segmentations. The displayed chronological values are source age bins; model-derived brain age is labeled separately. Records are different participants, not before/after scans.
- The whole-body and skeleton explorers use scan-derived meshes from representative TotalSegmentator CT subject `s1045`. Their colors are cross-sectional population correlations from 1,227 CT exams; they are not that subject's disease map or longitudinal aging trajectory.
- The external QT-label association is conditional. The marginal association was null, and the demo makes no diagnostic claim.
- Motion includes a prespecified null, and Skeletome remains a prospective hypothesis screen.

## Evidence sources used in the interface

| Surface | Source in the research project | Demo treatment |
|---|---|---|
| ECG profiles | PTB-XL examples `00233_hr`, `00420_hr`, `00176_hr` | Real 500 Hz lead-II waveform, phase ages, A, D, and q geometry |
| Heart anatomy | Gerach et al. Four-Chamber Human Heart Model, Zenodo `10.5281/zenodo.5573921` | Five separately named MRI-segmented surfaces with interactive, explanatory phase coloring |
| Brain | LEMON skull-stripped MP2RAGE T1, ANTsPyNet Atropos tissue masks, DKT parcellation, and `lemon_disagreement_result.json` | Four complete, interactive 256³ volumes plus aggregate cohort result |
| CT anatomy | TotalSegmentator v2 subject `s1045`, 117-class mask, and 1,227-exam cohort associations | Interactive 63-mesh skeleton / 115-mesh whole body, exact structure filters, voxel counts, rho values, and raw CT/mask proof |
| Organ systems | `nhanes_cox_results.csv`, canonical survey Cox table, CV ladder, and leave-one-system-out table | Filterable aggregate dashboard; original available-case per-system estimates are kept separate from canonical survey-weighted A/D results |
| Perturbation | Randomized IKr blockade analysis | Frozen signed-direction figure and summary |
| External transport | Chapman–Shaoxing / Ningbo analysis | Conditional frozen-direction result |
| Motion | NHANES MotionVector | Prespecified null boundary result |
| Genomics | Skeletome / Borzoi screen | Prospective hypothesis-screen result |

## Headline numbers

- Confirmatory disagreement-radius result: HR 1.010, 95% CI 0.983–1.039, LRT p = .478; n = 74,715, 2,583 deaths.
- IKr direction: bootstrap median cosine 0.941 with 99.99% sign stability; nominal permutation p = .033.
- External conditional association: OR 1.225/SD, 95% CI 1.10–1.364, p = 1.92 × 10⁻⁴; n = 44,550, 386 cases.
- Brain: older D 0.517 versus young D 0.340; difference +0.177, p = 4.3 × 10⁻⁸, d = 0.844; n = 220. Balanced 69-versus-69 resampling kept the contrast positive in all 5,000 resamples (median d = 0.60), supporting an age-group shift rather than universal dysregulation.
- CT atlas: a multi-region volume-only model achieved age MAE 8.56 years and R² = .432 in 1,227 exams. Skeleton panels show cross-sectional volume associations, not bone density or structure-specific aging rates.
- NHANES: A_body HR 1.206, D_body HR 1.213; cross-validated C-index 0.8127 → 0.8262 → 0.8304.
- Motion primary reserve test: OR 1.10, 95% CI 0.99–1.23, p = .070.
- Skeletome: 1,955 HAR substitutions screened, 722 candidates retained; matched enrichment null p = .24.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
npm run build
```

The GitHub Pages build is a static Next.js export. All scientific figures, ECG samples, named 3D anatomy, and aggregate association metadata are committed under `public/` or `app/data/`; the demo does not depend on a research-data API. `.github/workflows/pages.yml` builds and publishes `out/` whenever `main` changes.

## Key files

- `app/AtlasDashboard.tsx` — unified text-first system selector and cross-cohort boundary.
- `app/HeartExplorer.tsx` — clickable Three.js viewer for five named MRI-segmented heart surfaces.
- `app/BrainMRIExplorer.tsx` — direct browser rendering of complete T1, tissue, and DKT NIfTI volumes.
- `app/HumanVectorAtlas.tsx` — participant explorer, real ECG filters, synchronized phase views, and reference heart.
- `app/ResultsDeck.tsx` — presenter-first, keyboard-accessible six-slide evidence deck.
- `app/ResultsStory.tsx` — retained long-form evidence narrative and scientific boundaries.
- `app/AnatomyExplorer.tsx` — Three.js viewer for clickable scan-derived skeleton and whole-body meshes.
- `app/OrganExplorer.tsx` — filterable aggregate NHANES organ-system dashboard.
- `app/data/ecgProfiles.json` — real example ECG traces and frozen outputs.
- `app/data/organSystems.json` — committed aggregate per-system values transcribed from the project result tables.
- `app/data/ct*Associations.json` — exact CT structure groups, voxel counts, colors, and cohort-level rho values.
- `app/globals.css` — responsive visual system.
- `public/evidence/` — supporting cohort anatomy and retained source figures.
- `public/models/heart-four-chamber-*.glb` — MRI-segmented four-chamber reference heart with neutral and phase-highlight variants, CC BY-NC 4.0.
- `public/models/ct-skeleton.glb`, `public/models/ct-whole-body.glb` — real TotalSegmentator CT-derived meshes, CC BY 4.0.
- `public/mri/lemon/` — canonical RAS LEMON T1/Atropos/DKT NIfTI volumes and their manifest.
- `public/og.png` — typography-only social-preview artwork with no synthetic anatomy or linked-patient implication.
- `PRESENTER_SCRIPT_LAST_TWO_MINUTES.md` — committed 1:00–3:00 click sequence, spoken copy, timings, and claim guardrails.

## License and attribution

The project code follows the parent repository's MIT license. The three ECG examples come from [PTB-XL v1.0.3](https://physionet.org/content/ptb-xl/1.0.3/) by Wagner et al. and are redistributed under CC BY 4.0. TotalSegmentator v2 assets are also CC BY 4.0. The MRI files were obtained from the public [MPI-LEMON release on the canonical INDI portal](https://fcon_1000.projects.nitrc.org/indi/retro/MPI_LEMON.html), which lists PDDL as its data-sharing license; Atropos and DKT volumes are locally generated derivatives and are identified as such. The CardioMechanics heart is CC BY-NC 4.0 and is suitable here only for attributed, noncommercial hackathon display. Each redistributed scientific asset retains the source citation, license note, and scientific boundary appropriate to that source.

The authoritative asset-by-asset record is [`ASSET_PROVENANCE.md`](ASSET_PROVENANCE.md). The full paper committed under `public/papers/` is the primary write-up for judging; the shorter brief is a navigation aid, not a replacement for the paper.
