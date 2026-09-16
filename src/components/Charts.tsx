import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LogEntry } from '../types'

const axis = { stroke: '#70817b', fontSize: 11 }
const tip = { background: '#0f1c19', border: '1px solid #30423d', borderRadius: 10, fontSize: 12 }

export function MoistureChart({ data }: { data: LogEntry[] }) {
  return <div className="chart-card panel">
    <div className="chart-heading"><div><span className="eyebrow">Volumetric water content</span><h3>Sensor response</h3></div><span className="chart-unit">MOISTURE · %</span></div>
    <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
      <CartesianGrid stroke="#25342f" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" tickFormatter={v => `${Math.round(v/60)}`} {...axis}/><YAxis domain={[0, 55]} {...axis}/>
      <Tooltip contentStyle={tip} labelFormatter={v => `${(Number(v)/60).toFixed(1)} min`} formatter={v => [`${Number(v ?? 0).toFixed(1)}%`]}/>
      <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 5 }}/>
      <Line name="S1 Surface" type="monotone" dataKey="surface_moisture" stroke="#51d7c7" dot={false} strokeWidth={2}/>
      <Line name="S2 Middle" type="monotone" dataKey="middle_moisture" stroke="#e2b35b" dot={false} strokeWidth={2}/>
      <Line name="S3 Root" type="monotone" dataKey="root_moisture" stroke="#a8d573" dot={false} strokeWidth={2.2}/>
    </LineChart></ResponsiveContainer></div><span className="x-label">SIMULATION TIME · MINUTES</span>
  </div>
}

export function FrontChart({ data }: { data: LogEntry[] }) {
  return <div className="chart-card panel">
    <div className="chart-heading"><div><span className="eyebrow">Hydraulic progression</span><h3>Wetting-front depth</h3></div><span className="chart-unit">DEPTH · CM</span></div>
    <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
      <defs><linearGradient id="frontFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#44c7d4" stopOpacity=".34"/><stop offset="1" stopColor="#44c7d4" stopOpacity=".02"/></linearGradient></defs>
      <CartesianGrid stroke="#25342f" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" tickFormatter={v => `${Math.round(v/60)}`} {...axis}/><YAxis domain={[42, 0]} reversed {...axis}/>
      <Tooltip contentStyle={tip} labelFormatter={v => `${(Number(v)/60).toFixed(1)} min`} formatter={v => [`${Number(v ?? 0).toFixed(1)} cm`, 'Front']}/>
      <Area type="monotone" dataKey="wetting_front_depth" stroke="#44c7d4" fill="url(#frontFill)" strokeWidth={2.2}/>
    </AreaChart></ResponsiveContainer></div><span className="x-label">SIMULATION TIME · MINUTES</span>
  </div>
}
