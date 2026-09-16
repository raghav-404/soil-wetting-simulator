export type SoilType = 'Sandy' | 'Loamy' | 'Clay' | 'Compacted'
export type ScenarioName = 'Normal infiltration' | 'Slow infiltration' | 'Poor penetration' | 'Root zone not reached' | 'Excess irrigation'
export type PumpMode = 'automatic' | 'manual'
export type InfiltrationClass = 'Normal' | 'Slow' | 'Poor penetration' | 'Root not reached' | 'Excess irrigation'
export type StressClass = 'Normal' | 'Mild' | 'High' | 'Critical'

export interface SoilParameters {
  ks: number
  suctionHead: number
  thetaS: number
  fieldCapacity: number
  wiltingPoint: number
  drainageCoefficient: number
  responseRate: number
  mobileFraction: number
  color: string
  description: string
}

export interface SimulationConfig {
  soilType: SoilType
  scenario: ScenarioName
  initialMoisture: number
  irrigationRate: number
  irrigationDuration: number
  temperature: number
  humidity: number
  rootDepth: number
  seed: number
  timeStep: number
  totalDuration: number
  stressLow: number
  stressTarget: number
  maxPumpDuration: number
  minOffTime: number
}

export interface SensorReadings { surface: number; middle: number; root: number }
export interface ArrivalTimes { s1: number | null; s2: number | null; s3: number | null }

export interface LogEntry {
  time: number
  surface_moisture: number
  middle_moisture: number
  root_moisture: number
  wetting_front_depth: number
  temperature: number
  humidity: number
  irrigation_rate: number
  infiltration_rate: number
  cumulative_infiltration: number
  cumulative_irrigation: number
  drainage: number
  pump_state: string
  soil_type: SoilType
  scenario: ScenarioName
}

export interface SimulationState {
  time: number
  running: boolean
  complete: boolean
  pumpOn: boolean
  pumpMode: PumpMode
  pumpRunSeconds: number
  lastPumpOffTime: number
  cumulativeIrrigation: number
  cumulativeInfiltration: number
  cumulativeDrainage: number
  cumulativeEvaporation: number
  ponding: number
  wettingFront: number
  infiltrationRate: number
  sensors: SensorReadings
  sensorTruth: SensorReadings
  arrivals: ArrivalTimes
  rootTrend: number
  seedState: number
  log: LogEntry[]
}

export interface Analysis {
  infiltrationClass: InfiltrationClass
  stressClass: StressClass
  recommendation: string
  reason: string
  delay12: number | null
  delay23: number | null
  velocity: number | null
  rootReached: boolean
}

export interface ExperimentResult {
  id: number
  soilType: SoilType
  irrigationDuration: number
  initialLabel: string
  initialMoisture: number
  rootArrival: number | null
  finalRootMoisture: number
  velocity: number | null
  infiltration: number
  infiltrationClass: InfiltrationClass
  stressClass: StressClass
  waterUsed: number
  drainage: number
}
