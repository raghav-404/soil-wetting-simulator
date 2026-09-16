import { SENSOR_DEPTHS, SOILS } from '../data/config'
import type { Analysis, LogEntry, SimulationConfig, SimulationState } from '../types'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
const logistic = (x: number) => 1 / (1 + Math.exp(-x))

// Reproducible xorshift32 generator. The seed is stored inside the simulation state.
function random(seed: number): [number, number] {
  let x = seed | 0
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5
  return [(x >>> 0) / 4294967296, x >>> 0]
}

export function createInitialState(config: SimulationConfig, mode: SimulationState['pumpMode'] = 'manual'): SimulationState {
  const theta = config.initialMoisture
  return {
    time: 0, running: false, complete: false, pumpOn: false, pumpMode: mode,
    pumpRunSeconds: 0, lastPumpOffTime: -config.minOffTime * 60,
    cumulativeIrrigation: 0, cumulativeInfiltration: 0, cumulativeDrainage: 0,
    cumulativeEvaporation: 0, ponding: 0, wettingFront: 0, infiltrationRate: 0,
    sensors: { surface: theta, middle: theta, root: theta },
    sensorTruth: { surface: theta, middle: theta, root: theta },
    arrivals: { s1: null, s2: null, s3: null }, rootTrend: 0,
    seedState: config.seed || 1, log: [],
  }
}

/**
 * One deterministic physics step.
 *
 * Green–Ampt-inspired infiltration capacity:
 *   f_c = K_s [1 + (psi_f * Δθ) / F]
 * where K_s and f_c are mm h⁻¹, psi_f is mm, and F is cumulative mm.
 * The wetting depth is z_f = F / (10 Δθ m), in cm. m is a calibrated mobile
 * pore fraction: the profile behind a real front is not fully saturated.
 *
 * Sensor water content is a sigmoid observation of that moving front followed
 * by first-order hydraulic response. Gravity drainage acts above field capacity;
 * a small atmospheric loss responds to temperature and vapour-pressure demand.
 */
export function stepSimulation(previous: SimulationState, config: SimulationConfig, forcedPump?: boolean): SimulationState {
  const soil = SOILS[config.soilType]
  const dt = config.timeStep
  const hours = dt / 3600
  const time = previous.time + dt
  let pumpOn = forcedPump ?? previous.pumpOn
  let pumpRunSeconds = previous.pumpRunSeconds
  let lastPumpOffTime = previous.lastPumpOffTime

  if (previous.pumpMode === 'automatic' && forcedPump === undefined) {
    const canRestart = previous.time - previous.lastPumpOffTime >= config.minOffTime * 60
    const maxed = previous.pumpRunSeconds >= config.maxPumpDuration * 60
    const excess = previous.sensorTruth.root >= config.stressTarget || previous.cumulativeDrainage > 16
    if (pumpOn && (excess || maxed)) { pumpOn = false; lastPumpOffTime = previous.time }
    else if (!pumpOn && canRestart && !maxed && previous.sensorTruth.root < config.stressLow) pumpOn = true
  }
  if (previous.pumpMode === 'manual' && pumpOn && time > config.irrigationDuration * 60) pumpOn = false
  if (pumpOn) pumpRunSeconds += dt

  const inputRate = pumpOn ? config.irrigationRate : 0
  const irrigation = inputRate * hours
  const available = irrigation + previous.ponding
  const deltaTheta = Math.max(0.035, soil.thetaS - config.initialMoisture)
  const suctionMm = soil.suctionHead * 10
  const capacity = soil.ks * (1 + (suctionMm * deltaTheta) / Math.max(previous.cumulativeInfiltration, 1.2))
  const infiltration = Math.min(available, capacity * hours)
  const ponding = clamp(available - infiltration, 0, 8)
  const runoff = Math.max(0, available - infiltration - ponding)
  const cumulativeInfiltration = previous.cumulativeInfiltration + infiltration
  const rawFront = cumulativeInfiltration / (10 * deltaTheta * soil.mobileFraction)
  const wettingFront = clamp(Math.max(previous.wettingFront, rawFront), 0, 42)
  const infiltrationRate = infiltration / Math.max(hours, 1e-9)

  const vpdFactor = clamp((1 - config.humidity / 100) * (1 + (config.temperature - 20) * 0.035), 0.08, 1.5)
  const evapMm = (0.17 + 0.20 * vpdFactor) * hours
  const wetTarget = Math.min(soil.thetaS - 0.015, soil.fieldCapacity + Math.min(0.10, inputRate / 1000))

  let seed = previous.seedState
  const updateSensor = (key: keyof typeof SENSOR_DEPTHS) => {
    const depth = SENSOR_DEPTHS[key]
    const activation = logistic((wettingFront - depth) / 1.35)
    const target = config.initialMoisture + (wetTarget - config.initialMoisture) * activation
    const old = previous.sensorTruth[key]
    const response = 1 - Math.exp(-soil.responseRate * dt / 60)
    const drainage = Math.max(0, old - soil.fieldCapacity) * soil.drainageCoefficient * hours
    const rootUptake = key === 'root' ? evapMm / 120 : evapMm / 220
    return clamp(old + (target - old) * response - drainage - rootUptake, soil.wiltingPoint * 0.72, soil.thetaS)
  }
  const truth = { surface: updateSensor('surface'), middle: updateSensor('middle'), root: updateSensor('root') }
  const noisy = (value: number) => {
    let u1, u2
    ;[u1, seed] = random(seed); [u2, seed] = random(seed)
    const gaussian = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-8))) * Math.cos(2 * Math.PI * u2)
    return clamp(value + gaussian * 0.0018, 0, soil.thetaS)
  }
  const sensors = { surface: noisy(truth.surface), middle: noisy(truth.middle), root: noisy(truth.root) }

  const profileExcess = Object.values(truth).reduce((sum, theta) => sum + Math.max(0, theta - soil.fieldCapacity), 0)
  const drainageMm = profileExcess * soil.drainageCoefficient * 10 * hours + runoff * 0.35
  const arrivals = { ...previous.arrivals }
  if (arrivals.s1 === null && wettingFront >= SENSOR_DEPTHS.surface && truth.surface >= config.initialMoisture + 0.018) arrivals.s1 = time
  if (arrivals.s2 === null && wettingFront >= SENSOR_DEPTHS.middle && truth.middle >= config.initialMoisture + 0.018) arrivals.s2 = time
  if (arrivals.s3 === null && wettingFront >= SENSOR_DEPTHS.root && truth.root >= config.initialMoisture + 0.014) arrivals.s3 = time

  const next: SimulationState = {
    ...previous, time, pumpOn, pumpRunSeconds, lastPumpOffTime, ponding,
    cumulativeIrrigation: previous.cumulativeIrrigation + irrigation,
    cumulativeInfiltration, cumulativeDrainage: previous.cumulativeDrainage + drainageMm,
    cumulativeEvaporation: previous.cumulativeEvaporation + evapMm,
    wettingFront, infiltrationRate, sensors, sensorTruth: truth, arrivals,
    rootTrend: (truth.root - previous.sensorTruth.root) / (dt / 60), seedState: seed,
    complete: time >= config.totalDuration * 60,
  }
  if (next.complete) { next.running = false; next.pumpOn = false }
  return next
}

export function analyze(state: SimulationState, config: SimulationConfig): Analysis {
  const soil = SOILS[config.soilType]
  const { s1, s2, s3 } = state.arrivals
  const delay12 = s1 !== null && s2 !== null ? (s2 - s1) / 60 : null
  const delay23 = s2 !== null && s3 !== null ? (s3 - s2) / 60 : null
  const velocity = s1 !== null && s3 !== null && s3 > s1 ? 20 / ((s3 - s1) / 60) : null
  let infiltrationClass: Analysis['infiltrationClass'] = 'Normal'
  if (state.cumulativeDrainage > 4 || (state.cumulativeIrrigation > 80 && state.wettingFront >= 35) || state.sensorTruth.root > soil.fieldCapacity + 0.075) infiltrationClass = 'Excess irrigation'
  else if (s3 === null && state.time >= Math.min(config.totalDuration * 0.65, config.irrigationDuration + 8) * 60) {
    if (config.soilType === 'Compacted' && (s1 !== null || state.sensorTruth.surface > config.initialMoisture + 0.02)) infiltrationClass = 'Poor penetration'
    else if (config.soilType === 'Clay' && s1 !== null) infiltrationClass = 'Slow'
    else infiltrationClass = state.sensorTruth.surface > config.initialMoisture + 0.07 && state.wettingFront < 24 ? 'Poor penetration' : 'Root not reached'
  } else if ((delay12 !== null && delay12 > 15) || (velocity !== null && velocity < 0.72) || config.soilType === 'Clay') infiltrationClass = 'Slow'

  const stressIndex = state.sensorTruth.root + clamp(state.rootTrend, -0.02, 0.02) * 1.8
  let stressClass: Analysis['stressClass'] = 'Normal'
  if (stressIndex < soil.wiltingPoint * 1.02) stressClass = 'Critical'
  else if (stressIndex < config.stressLow - 0.035) stressClass = 'High'
  else if (stressIndex < config.stressTarget) stressClass = 'Mild'

  let recommendation = 'No action'
  let reason = 'Root-zone moisture is within the configured target band.'
  if (infiltrationClass === 'Excess irrigation') { recommendation = 'Stop irrigation'; reason = 'Root-zone storage or drainage exceeds the configured protection limit.' }
  else if (infiltrationClass === 'Poor penetration') { recommendation = 'Inspect soil for poor infiltration'; reason = 'S1 is wet while the front and deeper sensors remain delayed.' }
  else if (stressClass === 'Critical' || stressClass === 'High') { recommendation = state.pumpMode === 'automatic' ? 'Automatic irrigation required' : 'Extend irrigation'; reason = 'Root-zone moisture remains below the configurable low-moisture threshold.' }
  else if (infiltrationClass === 'Root not reached') { recommendation = 'Increase irrigation duration'; reason = 'The irrigation pulse ended before a measurable S3 response.' }
  else if (infiltrationClass === 'Slow') { recommendation = 'Continue slowly and monitor'; reason = 'Arrival delays indicate low hydraulic response; a high rate may cause ponding.' }
  else if (state.pumpOn && state.sensorTruth.root >= config.stressTarget) { recommendation = 'Stop irrigation'; reason = 'The root-zone target has been reached.' }

  return { infiltrationClass, stressClass, recommendation, reason, delay12, delay23, velocity, rootReached: s3 !== null }
}

export function makeLogEntry(state: SimulationState, config: SimulationConfig): LogEntry {
  return {
    time: state.time, surface_moisture: state.sensors.surface * 100,
    middle_moisture: state.sensors.middle * 100, root_moisture: state.sensors.root * 100,
    wetting_front_depth: state.wettingFront, temperature: config.temperature,
    humidity: config.humidity, irrigation_rate: state.pumpOn ? config.irrigationRate : 0,
    infiltration_rate: state.infiltrationRate, cumulative_infiltration: state.cumulativeInfiltration,
    cumulative_irrigation: state.cumulativeIrrigation, drainage: state.cumulativeDrainage,
    pump_state: state.pumpOn ? 'ON' : 'OFF', soil_type: config.soilType, scenario: config.scenario,
  }
}

export function runToEnd(config: SimulationConfig): SimulationState {
  let state = createInitialState(config)
  state.pumpOn = true
  while (!state.complete) {
    state = stepSimulation(state, config)
    if (Math.round(state.time) % 60 === 0) state.log.push(makeLogEntry(state, config))
  }
  return state
}
