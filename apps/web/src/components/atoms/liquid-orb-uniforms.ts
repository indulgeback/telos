export interface LiquidOrbParams {
  speed: number
  radius: number
  zoom: number
  warp: number
  ridgeAmt: number
  sharp: number
  shade: number
  sheen: number
  gloss: number
  shellMidAlpha: number
  shellEdgeAlpha: number
  exposure: number
  style: number
  edgeSoftness: number
  edgeGlow: number
  glassEnabled: boolean
  glassOpacity: number
  contourDeform: number
  bandDensity: number
  chromaticShift: number
  metalScale: number
  metalStretch: number
  metalAngle: number
  metalOffset: number
  metalPhase: number
  metalEvolution: number
  metalRoughness: number
  metalDepth: number
  colors: readonly string[]
}

const PALETTE_STOPS = [
  '#F7FBFF',
  '#EFF6FD',
  '#E0EEF9',
  '#D4E6F7',
  '#BBD5F3',
  '#A6C7F0',
  '#87B0EB',
  '#6F9EE8',
  '#6F9EE8',
  '#6F9EE8',
  '#6F9EE8',
  '#6F9EE8',
] as const

// Matches the shared "虹彩欧泊" URL supplied for the Telos thinking avatar.
export const TELOS_OPAL_ORB: LiquidOrbParams = {
  speed: 1.5,
  radius: 0.72,
  zoom: 0.3,
  warp: 2.8,
  ridgeAmt: 0.36,
  sharp: 2,
  shade: 0.1,
  sheen: 0.3,
  gloss: 0.26,
  shellMidAlpha: 0.15,
  shellEdgeAlpha: 0.15,
  exposure: 1.12,
  style: 13,
  edgeSoftness: 0.005,
  edgeGlow: 0,
  glassEnabled: true,
  glassOpacity: 0.54,
  contourDeform: 0,
  bandDensity: 2,
  chromaticShift: 0.42,
  metalScale: 0.77,
  metalStretch: 0.23,
  metalAngle: 65,
  metalOffset: 0,
  metalPhase: 0,
  metalEvolution: 1,
  metalRoughness: 0.22,
  metalDepth: 0.25,
  colors: [
    '#FFF6E8',
    '#6EF2CF',
    '#FF91D8',
    '#756BFF',
    '#FFFFFF',
    '#FFFFFF',
    '#CDE5FF',
    '#D9C8FF',
    '#EAF4FF',
    '#DCEAFF',
    '#07080D',
    '#9E8CFF',
  ],
}

function rgba(hex: string): [number, number, number, number] {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
    1,
  ]
}

export function writeLiquidOrbUniforms(
  target: Float32Array,
  width: number,
  height: number,
  time: number,
  params: LiquidOrbParams = TELOS_OPAL_ORB
) {
  target.fill(0)
  target[0] = width
  target[1] = height
  target[2] = time
  target.set(
    [
      params.speed,
      params.radius,
      params.zoom,
      params.warp,
      params.ridgeAmt,
      params.sharp,
      params.shade,
      params.sheen,
      params.gloss,
      params.shellMidAlpha,
      params.shellEdgeAlpha,
      params.exposure,
      params.style,
      params.edgeSoftness,
      params.edgeGlow,
      0,
      params.glassEnabled ? 1 : 0,
      params.glassOpacity,
      params.contourDeform,
      params.bandDensity,
      params.chromaticShift,
      params.metalScale,
      params.metalStretch,
      params.metalAngle,
      params.metalOffset,
      params.metalPhase,
      params.metalEvolution,
      params.metalRoughness,
      params.metalDepth,
    ],
    3
  )

  ;[...params.colors, ...PALETTE_STOPS].forEach((color, index) => {
    target.set(rgba(color), 32 + index * 4)
  })
}
