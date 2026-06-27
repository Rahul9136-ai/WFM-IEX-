// Erlang C staffing engine — the math heart of contact-center WFM.
// All the staffing numbers in this app come from here, not from faked values.

// Offered load (Erlangs) for an interval.
//   volume   = contacts arriving in the interval
//   aht      = average handle time, seconds
//   interval = interval length, seconds (1800 = 30 min)
export function trafficIntensity(volume, aht, interval = 1800) {
  if (interval <= 0) return 0
  return (volume * aht) / interval
}

// Erlang B via the numerically-stable recursion (avoids overflow of A^n / n!).
//   B(0) = 1 ;  B(n) = (A·B(n-1)) / (n + A·B(n-1))
function erlangB(agents, intensity) {
  let b = 1
  for (let n = 1; n <= agents; n++) {
    b = (intensity * b) / (n + intensity * b)
  }
  return b
}

// Erlang C — probability an arriving contact has to wait (all agents busy).
export function erlangC(agents, intensity) {
  if (agents <= intensity) return 1 // unstable: offered load >= staff
  const rho = intensity / agents
  const b = erlangB(agents, intensity)
  return b / (1 - rho * (1 - b))
}

// Service level: P(answered within targetTime seconds).
export function serviceLevel(agents, intensity, aht, targetTime = 20) {
  if (agents <= intensity) return 0
  const c = erlangC(agents, intensity)
  return Math.max(0, 1 - c * Math.exp(-((agents - intensity) * targetTime) / aht))
}

// Average speed of answer (seconds).
export function asa(agents, intensity, aht) {
  if (agents <= intensity) return Infinity
  const c = erlangC(agents, intensity)
  return (c * aht) / (agents - intensity)
}

// Agent occupancy (fraction of time agents are on contacts).
export function occupancy(agents, intensity) {
  if (agents <= 0) return 0
  return Math.min(1, intensity / agents)
}

// Smallest agent count meeting a service-level target (e.g. 0.8 in 20s = "80/20").
export function requiredAgents(volume, aht, { interval = 1800, slTarget = 0.8, targetTime = 20, maxOccupancy = 0.95 } = {}) {
  const intensity = trafficIntensity(volume, aht, interval)
  if (intensity <= 0) return 0
  let agents = Math.max(1, Math.floor(intensity) + 1)
  // grow until both the SL target and an occupancy cap are satisfied
  for (let i = 0; i < 1000; i++) {
    const sl = serviceLevel(agents, intensity, aht, targetTime)
    const occ = occupancy(agents, intensity)
    if (sl >= slTarget && occ <= maxOccupancy) break
    agents++
  }
  return agents
}

// Full per-interval staffing summary, before shrinkage.
export function intervalStaffing(volume, aht, opts = {}) {
  const interval = opts.interval ?? 1800
  const intensity = trafficIntensity(volume, aht, interval)
  const req = requiredAgents(volume, aht, opts)
  return {
    intensity,
    required: req,
    serviceLevel: serviceLevel(req, intensity, aht, opts.targetTime ?? 20),
    asa: asa(req, intensity, aht),
    occupancy: occupancy(req, intensity),
  }
}

// Gross up required (productive) staff for shrinkage (breaks, training, absence).
//   shrinkage is a fraction, e.g. 0.30 = 30%
export function applyShrinkage(required, shrinkage = 0.3) {
  if (shrinkage >= 1) return required
  return Math.ceil(required / (1 - shrinkage))
}
