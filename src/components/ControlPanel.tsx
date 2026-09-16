import { ChevronDown, Gauge, Pause, Play, Power, RotateCcw } from 'lucide-react'
import { SCENARIO_NAMES, SOIL_NAMES, SOILS } from '../data/config'
import type { ScenarioName, SimulationConfig, SimulationState, SoilType } from '../types'

interface Props {
  config: SimulationConfig; state: SimulationState; speed: number
  onConfig: (patch: Partial<SimulationConfig>) => void
  onScenario: (name: ScenarioName) => void
  onStart: () => void; onPause: () => void; onReset: () => void
  onPump: () => void; onMode: (mode: SimulationState['pumpMode']) => void
  onSpeed: (speed: number) => void
}

function Range({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (n: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return <label className="range-field"><span>{label}<strong>{value}{unit}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--range': `${pct}%` } as React.CSSProperties}/></label>
}

export function ControlPanel(props: Props) {
  const { config, state } = props
  return <aside className="control-panel panel">
    <div className="panel-heading"><div><span className="eyebrow">Experiment control</span><h2>Simulation setup</h2></div><Gauge size={20}/></div>
    <div className="control-scroll">
      <label className="select-field"><span>Scenario preset</span><div><select value={config.scenario} onChange={e => props.onScenario(e.target.value as ScenarioName)}>{SCENARIO_NAMES.map(x => <option key={x}>{x}</option>)}</select><ChevronDown/></div></label>
      <div className="segmented"><button className={state.pumpMode === 'automatic' ? 'active' : ''} onClick={() => props.onMode('automatic')}>Automatic</button><button className={state.pumpMode === 'manual' ? 'active' : ''} onClick={() => props.onMode('manual')}>Manual</button></div>
      <button className={`pump-button ${state.pumpOn ? 'on' : ''}`} onClick={props.onPump}><Power size={18}/><span>Pump {state.pumpOn ? 'ON' : 'OFF'}</span><small>{state.pumpMode === 'automatic' ? 'controller managed' : 'manual override'}</small></button>
      <div className="divider" />
      <label className="select-field"><span>Soil texture</span><div><select value={config.soilType} onChange={e => props.onConfig({ soilType: e.target.value as SoilType })}>{SOIL_NAMES.map(x => <option key={x}>{x}</option>)}</select><ChevronDown/></div><small>{SOILS[config.soilType].description}</small></label>
      <Range label="Initial moisture" value={Math.round(config.initialMoisture * 100)} min={8} max={35} step={1} unit="%" onChange={n => props.onConfig({ initialMoisture: n / 100 })}/>
      <Range label="Irrigation rate" value={config.irrigationRate} min={10} max={180} step={2} unit=" mm/h" onChange={n => props.onConfig({ irrigationRate: n })}/>
      <Range label="Irrigation duration" value={config.irrigationDuration} min={5} max={50} step={1} unit=" min" onChange={n => props.onConfig({ irrigationDuration: n })}/>
      <Range label="Temperature" value={config.temperature} min={12} max={44} step={1} unit="°C" onChange={n => props.onConfig({ temperature: n })}/>
      <Range label="Relative humidity" value={config.humidity} min={20} max={95} step={1} unit="%" onChange={n => props.onConfig({ humidity: n })}/>
      <Range label="Root depth" value={config.rootDepth} min={22} max={36} step={1} unit=" cm" onChange={n => props.onConfig({ rootDepth: n })}/>
      <label className="number-field"><span>Random seed</span><input type="number" value={config.seed} onChange={e => props.onConfig({ seed: Number(e.target.value) })}/></label>
    </div>
    <div className="playback">
      <div className="transport"><button className="primary" onClick={props.onStart}>{state.running ? <Pause/> : <Play/>}{state.running ? 'Pause' : state.time > 0 && !state.complete ? 'Resume' : 'Start'}</button><button title="Reset simulation" onClick={props.onReset}><RotateCcw/></button></div>
      <div className="speed-row"><span>Speed</span>{[1,2,5,10].map(x => <button className={props.speed === x ? 'active' : ''} onClick={() => props.onSpeed(x)} key={x}>{x}×</button>)}</div>
    </div>
  </aside>
}
