import { Droplets } from 'lucide-react'
import { SENSOR_DEPTHS, SOILS } from '../data/config'
import type { SimulationConfig, SimulationState } from '../types'

interface Props { state: SimulationState; config: SimulationConfig }

const roots = [
  'M250 86 C244 130 252 150 230 185 C215 210 226 240 204 278',
  'M253 90 C266 132 265 167 284 205 C300 236 289 270 310 306',
  'M250 118 C220 142 210 176 177 194 C156 205 160 231 138 246',
  'M258 145 C292 166 309 188 337 195 C361 201 365 222 383 234',
  'M238 185 C252 220 246 260 257 320',
  'M221 222 C196 242 190 273 174 305',
]

function Sensor({ depth, label, moisture, reached }: { depth: number; label: string; moisture: number; reached: boolean }) {
  const y = 92 + depth * 8
  return <g className={reached ? 'sensor reached' : 'sensor'}>
    <line x1="75" x2="430" y1={y} y2={y} className="depth-line" />
    <text x="22" y={y + 4} className="depth-label">{depth} cm</text>
    <g transform={`translate(390 ${y - 15})`}>
      <circle cx="15" cy="15" r="20" className="sensor-halo" />
      <rect x="0" y="4" width="30" height="22" rx="6" className="sensor-body" />
      <circle cx="9" cy="15" r="3" className="sensor-dot" />
      <path d="M30 15h20" className="sensor-wire" />
    </g>
    <text x="332" y={y - 11} className="sensor-label">{label}</text>
    <text x="332" y={y + 4} className="sensor-reading">{(moisture * 100).toFixed(1)}%</text>
  </g>
}

export function SoilVisualization({ state, config }: Props) {
  const soil = SOILS[config.soilType]
  const frontY = Math.min(428, 92 + state.wettingFront * 8)
  const wetHeight = Math.max(0, frontY - 92)
  return <section className="soil-card panel">
    <div className="panel-heading">
      <div><span className="eyebrow">Live profile · 0–42 cm</span><h2>Soil cross-section</h2></div>
      <div className="live-pill"><i /> Physics linked</div>
    </div>
    <div className="soil-stage" style={{ '--soil-color': soil.color } as React.CSSProperties}>
      <svg viewBox="0 0 460 450" role="img" aria-label={`Soil profile with wetting front at ${state.wettingFront.toFixed(1)} centimetres`}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#bce2d2"/><stop offset="1" stopColor="#e9e4c9"/></linearGradient>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop stopColor={soil.color}/><stop offset="1" stopColor="#2a211d"/></linearGradient>
          <linearGradient id="wet" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2e8190" stopOpacity=".78"/><stop offset="1" stopColor="#24606f" stopOpacity=".38"/></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="soilClip"><rect x="0" y="92" width="460" height="358" rx="0"/></clipPath>
          <pattern id="texture" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="5" cy="6" r="1" fill="#fff" opacity=".12"/><circle cx="18" cy="16" r="1.5" fill="#000" opacity=".15"/></pattern>
        </defs>
        <rect width="460" height="92" fill="url(#sky)" />
        <circle cx="50" cy="30" r="19" fill="#f8d67b" opacity=".65" />
        <path d="M0 87 Q80 78 150 88T300 86T460 83V100H0Z" fill="#446631"/>
        <rect x="0" y="92" width="460" height="358" fill="url(#soil)" />
        <rect x="0" y="92" width="460" height="358" fill="url(#texture)" />
        <g clipPath="url(#soilClip)">
          <rect x="0" y="92" width="460" height={wetHeight} fill="url(#wet)" className="wet-region" />
          {state.wettingFront > 0.3 && <path d={`M0 ${frontY} Q55 ${frontY - 6} 110 ${frontY + 2} T220 ${frontY} T330 ${frontY + 3} T460 ${frontY}`} className="wet-front" filter="url(#glow)" />}
          <text x="18" y={Math.min(frontY - 9, 420)} className="front-label">WETTING FRONT · {state.wettingFront.toFixed(1)} cm</text>
        </g>

        <g className="plant">
          <path d="M252 95 C245 62 258 35 254 6" className="stem" />
          <path d="M253 50 C222 51 207 34 207 18 C233 17 249 28 253 50Z" className="leaf" />
          <path d="M255 34 C276 34 291 20 294 6 C270 4 258 16 255 34Z" className="leaf light" />
          <path d="M248 73 C225 77 213 66 207 55 C226 48 241 56 248 73Z" className="leaf light" />
        </g>
        <g className="roots">{roots.map((d, i) => <path d={d} key={i} />)}</g>
        <line x1="80" x2="80" y1="92" y2={92 + config.rootDepth * 8} className="root-bracket" />
        <path d={`M73 92h14M73 ${92 + config.rootDepth * 8}h14`} className="root-bracket" />
        <text x="90" y={105 + config.rootDepth * 4} className="root-label">ROOT ZONE</text>
        <Sensor depth={SENSOR_DEPTHS.surface} label="S1 · SURFACE" moisture={state.sensors.surface} reached={state.arrivals.s1 !== null} />
        <Sensor depth={SENSOR_DEPTHS.middle} label="S2 · MIDDLE" moisture={state.sensors.middle} reached={state.arrivals.s2 !== null} />
        <Sensor depth={SENSOR_DEPTHS.root} label="S3 · ROOT" moisture={state.sensors.root} reached={state.arrivals.s3 !== null} />
        {state.pumpOn && <g className="irrigation" filter="url(#glow)">
          {[0,1,2,3,4,5].map(i => <path key={i} d={`M${178 + i * 30} 3 q-6 18 0 29 q6-11 0-29`} style={{ animationDelay: `${i * -.19}s` }} />)}
        </g>}
      </svg>
      <div className="soil-legend"><span><i className="legend-wet"/>Wetted zone</span><span><i className="legend-front"/>Front boundary</span><span><i className="legend-sensor"/>Activated sensor</span></div>
    </div>
    <div className="water-balance">
      <div><Droplets size={17}/><span>Applied<strong>{state.cumulativeIrrigation.toFixed(1)} mm</strong></span></div>
      <div><span>Infiltrated<strong>{state.cumulativeInfiltration.toFixed(1)} mm</strong></span></div>
      <div><span>Drainage / loss<strong>{state.cumulativeDrainage.toFixed(1)} mm</strong></span></div>
    </div>
  </section>
}
