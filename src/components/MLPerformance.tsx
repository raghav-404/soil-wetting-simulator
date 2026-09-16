import { useEffect, useState } from 'react'
import { BrainCircuit, Info } from 'lucide-react'

interface Metrics {
  notice: string; model: string; seed: number; samples: number; test_samples: number; accuracy: number
  classes: string[]
  per_class: { class: string; precision: number; recall: number; f1: number; support: number }[]
  confusion_matrix: number[][]
  feature_importance: { feature: string; importance: number }[]
}

export function MLPerformance() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  useEffect(() => { fetch('/ml_metrics.json').then(r => r.ok ? r.json() : null).then(setMetrics).catch(() => setMetrics(null)) }, [])
  if (!metrics) return null
  return <section className="ml-section panel">
    <div className="panel-heading"><div><span className="eyebrow">Synthetic-label evaluation</span><h2>Interpretable ML benchmark</h2></div><BrainCircuit/></div>
    <div className="ml-summary">
      <div><span>Model</span><strong>{metrics.model}</strong></div><div><span>Test accuracy</span><strong>{(metrics.accuracy*100).toFixed(1)}%</strong></div><div><span>Synthetic runs</span><strong>{metrics.samples.toLocaleString()}</strong></div><div><span>Held-out test</span><strong>{metrics.test_samples}</strong></div>
    </div>
    <div className="ml-grid">
      <div><h3>Per-class performance</h3><table className="metrics-table"><thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>{metrics.per_class.map(row => <tr key={row.class}><td>{row.class}</td><td>{row.precision.toFixed(2)}</td><td>{row.recall.toFixed(2)}</td><td>{row.f1.toFixed(2)}</td></tr>)}</tbody></table></div>
      <div><h3>Confusion matrix · actual rows / predicted columns</h3><div className="confusion-wrap"><div className="confusion-labels">{metrics.classes.map(c => <span key={c}>{c.slice(0,4)}</span>)}</div>{metrics.confusion_matrix.map((row,i) => <div className="confusion-row" key={metrics.classes[i]}><b>{metrics.classes[i].slice(0,4)}</b>{row.map((n,j) => <span key={j} className={i === j ? 'diagonal' : ''} style={{'--intensity': Math.max(.06,n/80)} as React.CSSProperties}>{n}</span>)}</div>)}</div></div>
      <div><h3>Leading feature importance</h3><div className="importance-list">{metrics.feature_importance.slice(0,6).map(item => <div key={item.feature}><span>{item.feature.replaceAll('_',' ')}</span><i><b style={{width:`${item.importance / metrics.feature_importance[0].importance * 100}%`}}/></i><strong>{item.importance.toFixed(3)}</strong></div>)}</div></div>
    </div>
    <div className="ml-notice"><Info/><span>{metrics.notice} Accuracy measures recovery of embedded synthetic patterns, not field validity.</span><strong>Seed {metrics.seed}</strong></div>
  </section>
}
