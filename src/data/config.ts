import type { ScenarioName, SimulationConfig, SoilParameters, SoilType } from '../types'

export const SOILS: Record<SoilType, SoilParameters> = {
  Sandy: { ks: 92, suctionHead: 7.5, thetaS: 0.41, fieldCapacity: 0.22, wiltingPoint: 0.08, drainageCoefficient: 0.58, responseRate: 0.24, mobileFraction: 0.54, color: '#ba8c55', description: 'Rapid intake and drainage; low storage.' },
  Loamy: { ks: 42, suctionHead: 11, thetaS: 0.46, fieldCapacity: 0.31, wiltingPoint: 0.13, drainageCoefficient: 0.25, responseRate: 0.17, mobileFraction: 0.58, color: '#815b3b', description: 'Balanced intake, storage, and redistribution.' },
  Clay: { ks: 14, suctionHead: 19, thetaS: 0.52, fieldCapacity: 0.41, wiltingPoint: 0.22, drainageCoefficient: 0.09, responseRate: 0.09, mobileFraction: 0.68, color: '#654137', description: 'Slow intake with high water storage.' },
  Compacted: { ks: 6.5, suctionHead: 8, thetaS: 0.43, fieldCapacity: 0.34, wiltingPoint: 0.18, drainageCoefficient: 0.045, responseRate: 0.055, mobileFraction: 0.78, color: '#574940', description: 'Restricted pore connectivity and penetration.' },
}

export const DEFAULT_CONFIG: SimulationConfig = {
  soilType: 'Loamy', scenario: 'Normal infiltration', initialMoisture: 0.18,
  irrigationRate: 96, irrigationDuration: 32, temperature: 28,
  humidity: 58, rootDepth: 30, seed: 42017, timeStep: 5,
  totalDuration: 55, stressLow: 0.20, stressTarget: 0.29,
  maxPumpDuration: 40, minOffTime: 3,
}

export const SCENARIO_CONFIGS: Record<ScenarioName, Partial<SimulationConfig>> = {
  'Normal infiltration': { soilType: 'Loamy', initialMoisture: 0.18, irrigationRate: 96, irrigationDuration: 32, totalDuration: 55 },
  'Slow infiltration': { soilType: 'Clay', initialMoisture: 0.23, irrigationRate: 48, irrigationDuration: 38, totalDuration: 70 },
  'Poor penetration': { soilType: 'Compacted', initialMoisture: 0.19, irrigationRate: 72, irrigationDuration: 25, totalDuration: 60 },
  'Root zone not reached': { soilType: 'Loamy', initialMoisture: 0.17, irrigationRate: 55, irrigationDuration: 12, totalDuration: 45 },
  'Excess irrigation': { soilType: 'Sandy', initialMoisture: 0.20, irrigationRate: 150, irrigationDuration: 45, totalDuration: 65 },
}

export const SENSOR_DEPTHS = { surface: 10, middle: 20, root: 30 } as const
export const SOIL_NAMES = Object.keys(SOILS) as SoilType[]
export const SCENARIO_NAMES = Object.keys(SCENARIO_CONFIGS) as ScenarioName[]
