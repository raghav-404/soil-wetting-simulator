# Rhizome Lab — AI-assisted root-zone wetting-front simulator

A polished, deterministic research simulator for the sequence:

**Irrigation → surface wetting → middle wetting → root-zone wetting → wetting-front analysis → stress estimation → irrigation decision**

All displayed and exported observations are **simulation-generated**. Nothing in this project is represented as field-measured data.

## Quick start on macOS (Apple Silicon)

Open the project folder in VS Code, then run:

```bash
cd /Users/shadow/Projects/EMB/soil_wetting_ui
npm install
npm run dev
```

Open the local URL printed by Vite (normally <http://localhost:5173>). To make a production build:

```bash
npm run build
npm run preview
```

## Project structure

```text
soil_wetting_ui/
├── public/
│   ├── ml_metrics.json              # generated ML evaluation
│   └── synthetic_training_data.csv  # generated synthetic feature set
├── scripts/
│   └── train_model.py               # reproducible scikit-learn pipeline
├── src/
│   ├── components/
│   │   ├── AnalysisPanel.tsx
│   │   ├── Charts.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── ExperimentPage.tsx
│   │   ├── MetricCard.tsx
│   │   └── SoilVisualization.tsx
│   ├── data/config.ts               # soil and scenario parameter tables
│   ├── lib/simulation.ts            # numerical model and decision rules
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── index.html
├── package.json
├── requirements-ml.txt
└── vite.config.ts
```

## Features

- Numerical wetting front linked directly to the visual cross-section
- Three noisy but reproducible virtual probes at 10, 20, and 30 cm
- Sandy, loamy, clay, and compacted parameterizations
- Start, pause, resume, reset, 1×–10× speed, manual/automatic pump modes
- Arrival-time detection, inter-sensor delays, mean front velocity, and root-zone detection
- Configurable stress thresholds with transparent rule-based recommendations
- Closed-loop controller with maximum runtime, minimum OFF time, and drainage protection
- Five scenario presets that alter model inputs rather than labels
- Live moisture and wetting-front plots; timestep-level CSV logging
- A 48-treatment factorial experiment runner with paper-friendly comparison charts and CSV export
- A separate scikit-learn Random Forest pipeline and confusion matrix for synthetic labels
- Dark/light responsive scientific UI

## Simulation assumptions

1. The soil profile is vertically homogeneous within a run and one-dimensional.
2. Irrigation is spatially uniform over the represented surface area.
3. The profile behind the front is partially wetted, not fully saturated. A soil-specific mobile-pore fraction captures this simplification.
4. Macropore flow, hysteresis, lateral flow, layered horizons, salinity, and rainfall are not represented.
5. Temperature and relative humidity only affect a small atmospheric-loss term; this is not a full Penman–Monteith crop evapotranspiration model.
6. Default stress thresholds are demonstration assumptions, not universal crop thresholds.

## Equations used

### 1. Green–Ampt-inspired infiltration capacity

```text
f_c = K_s [1 + (ψ_f Δθ) / F]
```

- `f_c`: infiltration capacity (mm h⁻¹)
- `K_s`: saturated hydraulic conductivity (mm h⁻¹)
- `ψ_f`: effective suction at the front (mm)
- `Δθ = θ_s − θ_i`: initial moisture deficit (m³ m⁻³)
- `F`: cumulative infiltration (mm)

At each timestep, infiltration is the smaller of available surface water and `f_c Δt`. Up to 8 mm may pond; remaining excess contributes to the reported loss term.

### 2. Wetting-front depth

```text
z_f = F / (10 Δθ m)
```

`z_f` is in cm and `m` is the soil-specific mobile-pore fraction. The factor 10 converts a centimetre of profile water depth to millimetres.

### 3. Sensor moisture response

The equilibrium value at each sensor is blended with a sigmoid of `(z_f − z_sensor)`. Its state follows:

```text
dθ_i/dt = k_i(θ*_i − θ_i) − D_i − E_i
```

where `k_i` is the soil hydraulic response, `D_i` is gravity drainage above field capacity, and `E_i` is the small atmospheric/root uptake term. Reported readings add zero-mean Gaussian noise (σ = 0.0018 m³ m⁻³) from seeded `xorshift32` random numbers. Decisions use the noise-free internal state.

## Parameter definitions

| Soil | Ks (mm/h) | Suction (cm) | Saturation | Field capacity | Wilting point | Mobile fraction |
|---|---:|---:|---:|---:|---:|---:|
| Sandy | 92 | 7.5 | 0.41 | 0.22 | 0.08 | 0.54 |
| Loamy | 42 | 11 | 0.46 | 0.31 | 0.13 | 0.58 |
| Clay | 14 | 19 | 0.52 | 0.41 | 0.22 | 0.68 |
| Compacted | 6.5 | 8 | 0.43 | 0.34 | 0.18 | 0.78 |

These are plausible illustrative values, not values calibrated to a specific site.

## Decision layer

The browser uses a transparent rule baseline:

- excessive root moisture or drainage → **Excess irrigation**
- wet S1 with a shallow/delayed front → **Poor penetration**
- no detected S3 response late in a run → **Root not reached**
- large delays / low front velocity / clay response → **Slow**
- otherwise → **Normal**

Stress is categorized as Normal, Mild, High, or Critical from root-zone moisture, trend, soil wilting point, and configurable low/target thresholds. These rules are intentionally auditable and are not called AI.

## Closed-loop controller

In automatic mode, the pump starts when root moisture is below `stressLow` and the minimum OFF time has elapsed. It stops when the target is met, the maximum continuous pump duration is reached, or drainage protection activates. Pump state feeds back into the same numerical engine, so the observed recovery is model-driven.

## Train the optional ML classifier

Create an isolated Python environment (Python 3.11–3.14):

```bash
cd /Users/shadow/Projects/EMB/soil_wetting_ui
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-ml.txt
python scripts/train_model.py
```

The script creates 1,600 class-balanced synthetic simulations, uses a fixed stratified 75/25 split, trains a depth-limited Random Forest, and writes accuracy, per-class precision/recall/F1, a confusion matrix, feature importance, and the synthetic CSV under `public/`.

The target labels are **simulator scenario labels, not real-world ground truth**. High accuracy only shows that the model can recover patterns embedded by this simulator; it does not establish field validity.

## How to generate paper results

1. Run the app and open **Research results**.
2. Select **Run experiment** to calculate all 48 treatments locally. The default factorial study holds application rate at 180 mm/h while varying soil, 5/10/15/20-minute duration, and initial state.
3. Export the table using **Export CSV**.
4. Use the comparison charts for figures and the table for downstream statistics.
5. For a focused run, choose a preset on **Live simulation**, record the displayed seed and timestep, run to completion, and export its CSV.
6. Run `scripts/train_model.py` whenever classifier parameters or synthetic generation assumptions change.

Always caption outputs as “simulation-generated” or “synthetic.” Report the soil table, seed, timestep, initial state, irrigation rate/duration, and equations with every experiment.

## Reproducibility

- Browser default seed: `42017`
- ML seed: `42017`
- Browser numerical timestep: `5 s` (experiment runner: `10 s`)
- Browser logging interval: approximately `60 s`, plus final state
- ML sample count: `1,600`; stratified test fraction: `25%`

Changing the seed changes only the small sensor perturbations in the live app; the physical truth remains deterministic for identical parameters.

## Limitations

This is a research-demonstration model, not HYDRUS and not an irrigation prescription tool. Before drawing agronomic conclusions, calibrate against measured moisture profiles, conduct sensitivity/uncertainty analysis, add site-specific boundary conditions, and validate crop-specific stress thresholds independently.
