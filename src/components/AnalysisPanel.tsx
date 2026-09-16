import { AlertTriangle, Check, Clock3, Route, Sprout } from 'lucide-react'
import type { Analysis, SimulationState } from '../types'

const time = (seconds: number | null) => seconds === null ? '—' : `${(seconds / 60).toFixed(1)} min`

export function AnalysisPanel({ analysis, state }: { analysis: Analysis; state: SimulationState }) {
  const classTone = analysis.infiltrationClass === 'Normal' ? 'good' : analysis.infiltrationClass === 'Excess irrigation' || analysis.infiltrationClass === 'Poor penetration' ? 'warn' : 'watch'
  return <section className="analysis-panel panel">
    <div className="panel-heading"><div><span className="eyebrow">Event extraction</span><h2>Wetting-front analysis</h2></div><Route size={20}/></div>
    <div className="arrival-timeline">
      {[['S1', state.arrivals.s1, '10 cm'], ['S2', state.arrivals.s2, '20 cm'], ['S3', state.arrivals.s3, '30 cm']].map(([name, value, depth], i) => <div className={value !== null ? 'arrived' : ''} key={String(name)}>
        <span className="timeline-node">{value !== null ? <Check size={13}/> : i + 1}</span><b>{name}</b><small>{depth}</small><strong>{time(value as number | null)}</strong>
      </div>)}
    </div>
    <div className="analysis-grid">
      <div><Clock3/><span>S1 → S2 delay<strong>{analysis.delay12 === null ? '—' : `${analysis.delay12.toFixed(1)} min`}</strong></span></div>
      <div><Clock3/><span>S2 → S3 delay<strong>{analysis.delay23 === null ? '—' : `${analysis.delay23.toFixed(1)} min`}</strong></span></div>
      <div><Route/><span>Mean front velocity<strong>{analysis.velocity === null ? '—' : `${analysis.velocity.toFixed(2)} cm/min`}</strong></span></div>
      <div><Sprout/><span>Root zone reached<strong>{analysis.rootReached ? 'YES' : 'NO'}</strong></span></div>
    </div>
    <div className="class-row"><span>Infiltration class</span><strong className={`class-badge ${classTone}`}>{analysis.infiltrationClass}</strong></div>
    <div className="class-row"><span>Water-stress estimate</span><strong className={`class-badge ${analysis.stressClass === 'Normal' ? 'good' : 'warn'}`}>{analysis.stressClass}</strong></div>
    <div className="recommendation"><AlertTriangle size={20}/><div><span>Controller recommendation</span><strong>{analysis.recommendation}</strong><p>{analysis.reason}</p></div></div>
  </section>
}
