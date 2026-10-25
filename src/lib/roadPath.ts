export const IMAGE_WIDTH = 2752
export const IMAGE_HEIGHT = 1536

export interface RoadPoint {
  x: number
  y: number
  percentX: number
  percentY: number
  scale: number
  angle: number
  roadWidth: number
}

interface ControlPoint {
  x: number
  y: number
  scale: number
  roadWidth: number
}

/**
 * Centerline sampled from the painted bricks in the original artwork.
 * Each point is in the source image's 2752 x 1536 coordinate space.
 * The points were checked against a warm-pixel centerline and then smoothed,
 * while the final point stays anchored to the Emerald City gate.
 */
export const ROAD_CONTROL_POINTS: ControlPoint[] = [
  { x: 1321, y: 1536, scale: 1.35, roadWidth: 1200 },
  { x: 1345, y: 1400, scale: 1.25, roadWidth: 950 },
  { x: 1388, y: 1250, scale: 1.1, roadWidth: 700 },
  { x: 1440, y: 1120, scale: 0.95, roadWidth: 500 },
  { x: 1450, y: 1040, scale: 0.85, roadWidth: 380 },
  { x: 1374, y: 990, scale: 0.78, roadWidth: 290 },
  { x: 1294, y: 960, scale: 0.72, roadWidth: 230 },
  { x: 1203, y: 930, scale: 0.65, roadWidth: 180 },
  { x: 1126, y: 900, scale: 0.58, roadWidth: 140 },
  { x: 1064, y: 870, scale: 0.52, roadWidth: 110 },
  { x: 1043, y: 840, scale: 0.47, roadWidth: 90 },
  { x: 1048, y: 810, scale: 0.43, roadWidth: 75 },
  { x: 1065, y: 780, scale: 0.4, roadWidth: 62 },
  { x: 1078, y: 750, scale: 0.37, roadWidth: 50 },
  { x: 1070, y: 720, scale: 0.34, roadWidth: 42 },
  { x: 1042, y: 690, scale: 0.31, roadWidth: 34 },
  { x: 999, y: 665, scale: 0.28, roadWidth: 28 },
  { x: 948, y: 645, scale: 0.26, roadWidth: 22 },
  { x: 901, y: 630, scale: 0.24, roadWidth: 18 },
  { x: 890, y: 610, scale: 0.22, roadWidth: 15 },
]

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const v0 = (p2 - p0) * 0.5
  const v1 = (p3 - p1) * 0.5
  const t2 = t * t
  const t3 = t2 * t
  return (
    (2 * p1 - 2 * p2 + v0 + v1) * t3 +
    (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
    v0 * t +
    p1
  )
}

function rawPoint(t: number) {
  const points = ROAD_CONTROL_POINTS
  const n = points.length - 1
  const scaled = Math.max(0, Math.min(1, t)) * n
  const index = Math.floor(scaled)
  const local = scaled - index
  const i1 = Math.min(index, n)
  const i0 = Math.max(0, i1 - 1)
  const i2 = Math.min(n, i1 + 1)
  const i3 = Math.min(n, i2 + 1)

  return {
    x: catmullRom(points[i0].x, points[i1].x, points[i2].x, points[i3].x, local),
    y: catmullRom(points[i0].y, points[i1].y, points[i2].y, points[i3].y, local),
    scale: catmullRom(
      points[i0].scale,
      points[i1].scale,
      points[i2].scale,
      points[i3].scale,
      local,
    ),
    roadWidth: catmullRom(
      points[i0].roadWidth,
      points[i1].roadWidth,
      points[i2].roadWidth,
      points[i3].roadWidth,
      local,
    ),
  }
}

export function getRoadPoint(t: number): RoadPoint {
  const clamped = Math.max(0, Math.min(1, t))
  const point = rawPoint(clamped)
  const delta = 0.004
  const before = rawPoint(Math.max(0, clamped - delta))
  const after = rawPoint(Math.min(1, clamped + delta))

  return {
    ...point,
    percentX: (point.x / IMAGE_WIDTH) * 100,
    percentY: (point.y / IMAGE_HEIGHT) * 100,
    scale: Math.max(0.2, point.scale),
    angle: Math.atan2(after.y - before.y, after.x - before.x),
  }
}

export function buildRoadPath(samples = 180) {
  return Array.from({ length: samples + 1 }, (_, index) => getRoadPoint(index / samples))
}

export function buildRoadSvgPath(samples = 180) {
  return buildRoadPath(samples)
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
}
