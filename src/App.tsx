import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CloudSun, Download, Droplet, FlaskConical, Leaf, Menu, Moon, Radio, Sun, Thermometer, Timer, Waves, X } from 'lucide-react'
import { AnalysisPanel } from './components/AnalysisPanel'
import { FrontChart, MoistureChart } from './components/Charts'
import { ControlPanel } from './components/ControlPanel'
import { ExperimentPage } from './components/ExperimentPage'
import { MetricCard } from './components/MetricCard'
import { SoilVisualization } from './components/SoilVisualization'
import { DEFAULT_CONFIG, SCENARIO_CONFIGS } from './data/config'
import { analyze, createInitialState, makeLogEntry, stepSimulation } from './lib/simulation'
import type { ScenarioName, SimulationConfig, SimulationState } from './types'
import './styles.css'

type Page = 'simulator' | 'research' | 'method'

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60)
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function downloadCSV(state: SimulationState, seed: number) {
  if (!state.log.length) return
  const keys = Object.keys(state.log[0]) as (keyof typeof state.log[0])[]
  const rows = state.log.map(row => keys.map(key => JSON.stringify(row[key])).join(','))
  const blob = new Blob([[keys.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wetting_front_run_seed_${seed}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

function MethodPage() {
  return <main className="page-shell method-page">
    <section className="research-hero"><div><span className="eyebrow">Transparent by design</span><h1>Model & assumptions</h1><p>A compact physical interpretation suitable for demonstration, sensitivity studies, and synthetic hypothesis generation.</p></div></section>
    <div className="method-grid">
      <section className="panel equation-card"><span>01</span><h2>Infiltration capacity</h2><code>f<sub>c</sub> = K<sub>s</sub> [1 + (ψ<sub>f</sub> Δθ) / F]</code><p>Green–Ampt-inspired capacity couples saturated conductivity, capillary suction, moisture deficit, and cumulative infiltration. Applied water above capacity is temporarily ponded.</p></section>
      <section className="panel equation-card"><span>02</span><h2>Wetting depth</h2><code>z<sub>f</sub> = F / (10 Δθ m)</code><p>Water depth F (mm) is converted to front depth (cm). The mobile pore fraction m represents a partially wetted profile behind the front.</p></section>
      <section className="panel equation-card"><span>03</span><h2>Sensor response</h2><code>θ̇<sub>i</sub> = k(θ*<sub>i</sub> − θ<sub>i</sub>) − D − E</code><p>Each sensor approaches a front-dependent target with a soil-specific first-order response, while gravity drainage and atmospheric loss remove water.</p></section>
      <section className="panel equation-card"><span>04</span><h2>Decision layer</h2><code>x = [θ₁, θ₂, θ₃, Δt, v<sub>f</sub>, F, T, RH]</code><p>Rules remain visible and auditable. The optional Python Random Forest evaluates whether those synthetic labels can be recovered from derived features.</p></section>
    </div>
    <section className="panel limitations"><h2>Scientific scope</h2><div><p><strong>Appropriate for</strong><br/>Teaching, algorithm prototyping, parameter sensitivity, generating explicitly synthetic comparisons, and testing closed-loop logic.</p><p><strong>Not a substitute for</strong><br/>Field calibration, crop-specific stress thresholds, Richards-equation solvers, preferential-flow models, or measured validation data.</p><p><strong>Reproducibility</strong><br/>All stochastic sensor perturbations use a recorded xorshift32 seed. The default integration step is 5 seconds and every minute is logged.</p></div></section>
  </main>
}

export default function App() {
  const [page, setPage] = useState<Page>('simulator')
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG)
  const [state, setState] = useState<SimulationState>(() => createInitialState(DEFAULT_CONFIG))
  const [speed, setSpeed] = useState(5)
  const [light, setLight] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const configRef = useRef(config)
  const analysis = useMemo(() => analyze(state, config), [state, config])

  useEffect(() => { configRef.current = config }, [config])

  useEffect(() => {
    if (!state.running) return
    const timer = window.setInterval(() => {
      setState(current => {
        let next = current
        const steps = speed
        for (let i = 0; i < steps && !next.complete; i++) next = stepSimulation(next, configRef.current)
        if (Math.floor(next.time / 60) > Math.floor(current.time / 60) || next.complete) next = { ...next, log: [...next.log, makeLogEntry(next, configRef.current)] }
        return next
      })
    }, 100)
    return () => window.clearInterval(timer)
  }, [state.running, speed])

  const reset = (nextConfig = config, keepMode = state.pumpMode) => {
    setState(createInitialState(nextConfig, keepMode))
  }
  const updateConfig = (patch: Partial<SimulationConfig>) => {
    const next = { ...config, ...patch }; setConfig(next); reset(next)
  }
  const selectScenario = (scenario: ScenarioName) => {
    const next = { ...config, ...SCENARIO_CONFIGS[scenario], scenario }
    setConfig(next); reset(next)
  }
  const startPause = () => setState(s => {
    if (s.complete) { const fresh = createInitialState(config, s.pumpMode); return { ...fresh, running: true, pumpOn: s.pumpMode === 'manual' } }
    return { ...s, running: !s.running, pumpOn: !s.running && s.time === 0 && s.pumpMode === 'manual' ? true : s.pumpOn }
  })
  const setMode = (pumpMode: SimulationState['pumpMode']) => setState(s => ({ ...s, pumpMode, pumpOn: false, pumpRunSeconds: 0 }))

  const navigate = (p: Page) => { setPage(p); setMobileNav(false) }
  return <div className={light ? 'app light' : 'app'}>
    <header className="topbar">
      <button className="brand" onClick={() => navigate('simulator')}><span><Leaf/></span><div><strong>RHIZOME</strong><small>ROOT-ZONE RESEARCH LAB</small></div></button>
      <nav className={mobileNav ? 'open' : ''}>
        <button className={page === 'simulator' ? 'active' : ''} onClick={() => navigate('simulator')}><Radio/>Live simulation</button>
        <button className={page === 'research' ? 'active' : ''} onClick={() => navigate('research')}><FlaskConical/>Research results</button>
        <button className={page === 'method' ? 'active' : ''} onClick={() => navigate('method')}><BookOpen/>Model & method</button>
      </nav>
      <div className="top-actions"><span className="synthetic-tag">SIMULATION-GENERATED</span><button title="Toggle theme" onClick={() => setLight(x => !x)}>{light ? <Moon/> : <Sun/>}</button><button className="menu" onClick={() => setMobileNav(x => !x)}>{mobileNav ? <X/> : <Menu/>}</button></div>
    </header>

    {page === 'research' ? <ExperimentPage/> : page === 'method' ? <MethodPage/> : <main className="dashboard page-shell">
      <section className="dashboard-title"><div><span className="eyebrow">AI-assisted irrigation research platform</span><h1>Root-zone wetting front</h1><p>Interpretable infiltration physics · virtual sensors · closed-loop stress control</p></div><div className="session-status"><i className={state.running ? 'pulse' : ''}/><span>{state.complete ? 'RUN COMPLETE' : state.running ? 'SIMULATION ACTIVE' : 'SYSTEM READY'}</span><strong>SEED {config.seed}</strong></div></section>
      <section className="metric-strip">
        <MetricCard icon={Timer} label="Simulation time" value={formatTime(state.time)} meta={`/ ${config.totalDuration}:00`} />
        <MetricCard icon={Droplet} label="Surface · S1" value={`${(state.sensors.surface*100).toFixed(1)}%`} meta={state.arrivals.s1 ? 'front detected' : 'awaiting front'} tone={state.arrivals.s1 ? 'aqua' : 'neutral'} />
        <MetricCard icon={Waves} label="Middle · S2" value={`${(state.sensors.middle*100).toFixed(1)}%`} meta={state.arrivals.s2 ? 'front detected' : 'awaiting front'} tone={state.arrivals.s2 ? 'amber' : 'neutral'} />
        <MetricCard icon={Leaf} label="Root zone · S3" value={`${(state.sensors.root*100).toFixed(1)}%`} meta={analysis.stressClass} tone={analysis.rootReached ? 'green' : 'neutral'} />
        <MetricCard icon={Thermometer} label="Environment" value={`${config.temperature}°C`} meta={`${config.humidity}% RH`} />
        <MetricCard icon={CloudSun} label="Wetting front" value={`${state.wettingFront.toFixed(1)} cm`} meta={`${state.infiltrationRate.toFixed(1)} mm/h`} tone="aqua" />
      </section>
      <div className="main-grid">
        <ControlPanel config={config} state={state} speed={speed} onConfig={updateConfig} onScenario={selectScenario} onStart={startPause} onPause={startPause} onReset={() => reset()} onPump={() => setState(s => ({...s, pumpOn: !s.pumpOn}))} onMode={setMode} onSpeed={setSpeed}/>
        <SoilVisualization state={state} config={config}/>
        <AnalysisPanel analysis={analysis} state={state}/>
      </div>
      <section className="chart-section-heading"><div><span className="eyebrow">Time-series record</span><h2>Live measurements</h2></div><button onClick={() => downloadCSV(state, config.seed)} disabled={!state.log.length}><Download/>Export run CSV</button></section>
      <div className="charts-grid"><MoistureChart data={state.log}/><FrontChart data={state.log}/></div>
      <footer><span>RHIZOME LAB · RESEARCH SIMULATOR v1.0</span><span>All outputs are simulation-generated · Δt = {config.timeStep}s · Seed = {config.seed}</span></footer>
    </main>}
  </div>
}
