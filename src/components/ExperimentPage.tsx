import { useMemo, useState } from 'react'
import { BarChart3, Beaker, Download, Play, Table2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DEFAULT_CONFIG, SOIL_NAMES, SOILS } from '../data/config'
import { analyze, runToEnd } from '../lib/simulation'
import type { ExperimentResult } from '../types'
import { MLPerformance } from './MLPerformance'

const initialLevels = [{ label: 'Dry', offset: -0.035 }, { label: 'Moderate', offset: 0 }, { label: 'Wet', offset: 0.045 }]
const durations = [5, 10, 15, 20]
const colors = ['#55c9ba', '#d4a756', '#87bb66', '#a587d4']

function csvDownload(results: ExperimentResult[]) {
  const keys = Object.keys(results[0] ?? {}) as (keyof ExperimentResult)[]
  const csv = [keys.join(','), ...results.map(r => keys.map(k => r[k] ?? '').join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'synthetic_experiment_results.csv'; a.click(); URL.revokeObjectURL(a.href)
}

export function ExperimentPage() {
  const [results, setResults] = useState<ExperimentResult[]>([])
  const [running, setRunning] = useState(false)
  const run = () => {
    setRunning(true)
    requestAnimationFrame(() => {
      let id = 0; const rows: ExperimentResult[] = []
      for (const soilType of SOIL_NAMES) for (const duration of durations) for (const level of initialLevels) {
        const soil = SOILS[soilType]
        const config = { ...DEFAULT_CONFIG, soilType, scenario: 'Normal infiltration' as const, irrigationRate: 180, irrigationDuration: duration, totalDuration: 55, initialMoisture: Math.max(soil.wiltingPoint + .015, soil.fieldCapacity + level.offset - .08), seed: 8000 + id, timeStep: 10 }
        const state = runToEnd(config); const a = analyze(state, config)
        rows.push({ id: ++id, soilType, irrigationDuration: duration, initialLabel: level.label, initialMoisture: config.initialMoisture, rootArrival: state.arrivals.s3, finalRootMoisture: state.sensorTruth.root, velocity: a.velocity, infiltration: state.cumulativeInfiltration, infiltrationClass: a.infiltrationClass, stressClass: a.stressClass, waterUsed: state.cumulativeIrrigation, drainage: state.cumulativeDrainage })
      }
      setResults(rows); setRunning(false)
    })
  }
  const aggregated = useMemo(() => SOIL_NAMES.map(soil => {
    const set = results.filter(r => r.soilType === soil)
    return { soil, arrival: set.filter(r => r.rootArrival !== null).reduce((s, r) => s + (r.rootArrival ?? 0) / 60, 0) / Math.max(1, set.filter(r => r.rootArrival !== null).length), infiltration: set.reduce((s,r) => s + r.infiltration, 0) / Math.max(1,set.length) }
  }), [results])

  return <main className="page-shell research-page">
    <section className="research-hero"><div><span className="eyebrow">Phase 2 · factorial study</span><h1>Research experiment runner</h1><p>Runs 48 deterministic, simulation-generated treatments: 4 soils × 4 irrigation durations × 3 initial-moisture states. Fixed application rate: 180 mm/h.</p></div><button className="run-experiment" onClick={run} disabled={running}><Play/>{running ? 'Running 48 treatments…' : results.length ? 'Run again' : 'Run experiment'}</button></section>
    <div className="synthetic-banner"><Beaker/><div><strong>Synthetic dataset</strong><span>These values come from the documented numerical model—not field measurements or universal crop thresholds.</span></div>{results.length > 0 && <button onClick={() => csvDownload(results)}><Download/>Export CSV</button>}</div>
    {results.length === 0 ? <section className="empty-experiment panel"><BarChart3/><h2>Ready to generate the comparison set</h2><p>The batch is calculated locally in your browser using the same engine as the live simulator.</p></section> : <>
      <div className="research-charts">
        <div className="chart-card panel"><div className="chart-heading"><div><span className="eyebrow">Reached treatments only</span><h3>Mean root arrival time</h3></div></div><div className="chart-wrap tall"><ResponsiveContainer><BarChart data={aggregated}><CartesianGrid stroke="#25342f" vertical={false}/><XAxis dataKey="soil" stroke="#70817b" fontSize={11}/><YAxis stroke="#70817b" fontSize={11}/><Tooltip contentStyle={{background:'#0f1c19',border:'1px solid #30423d'}}/><Bar dataKey="arrival" radius={[5,5,0,0]}>{aggregated.map((_,i)=><Cell key={i} fill={colors[i]}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
        <div className="chart-card panel"><div className="chart-heading"><div><span className="eyebrow">All treatment means</span><h3>Cumulative infiltration</h3></div></div><div className="chart-wrap tall"><ResponsiveContainer><BarChart data={aggregated}><CartesianGrid stroke="#25342f" vertical={false}/><XAxis dataKey="soil" stroke="#70817b" fontSize={11}/><YAxis stroke="#70817b" fontSize={11}/><Tooltip contentStyle={{background:'#0f1c19',border:'1px solid #30423d'}}/><Bar dataKey="infiltration" radius={[5,5,0,0]}>{aggregated.map((_,i)=><Cell key={i} fill={colors[i]}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
      </div>
      <section className="results-table panel"><div className="panel-heading"><div><span className="eyebrow">Simulation-generated observations</span><h2>Comparison table</h2></div><Table2/></div><div className="table-scroll"><table><thead><tr><th>Soil</th><th>Duration</th><th>Initial</th><th>Root arrival</th><th>Final S3</th><th>Velocity</th><th>Infiltrated</th><th>Class</th><th>Stress</th><th>Water</th></tr></thead><tbody>{results.map(r => <tr key={r.id}><td><i style={{background: SOILS[r.soilType].color}}/>{r.soilType}</td><td>{r.irrigationDuration} min</td><td>{r.initialLabel}</td><td>{r.rootArrival ? `${(r.rootArrival/60).toFixed(1)} min` : 'Not reached'}</td><td>{(r.finalRootMoisture*100).toFixed(1)}%</td><td>{r.velocity ? `${r.velocity.toFixed(2)} cm/min` : '—'}</td><td>{r.infiltration.toFixed(1)} mm</td><td><span>{r.infiltrationClass}</span></td><td>{r.stressClass}</td><td>{r.waterUsed.toFixed(1)} mm</td></tr>)}</tbody></table></div></section>
      <MLPerformance />
    </>}
  </main>
}
