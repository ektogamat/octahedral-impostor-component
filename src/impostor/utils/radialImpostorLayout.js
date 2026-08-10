function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Fills a disk (not a single ring) with a golden-angle spiral + jitter.
 * At count=2, keeps left/right placement.
 * scaleVariance in [0, 1] spreads per-instance scale around 1.
 */
export function buildRadialLayout(
  count,
  {
    radius = 1,
    y = 0,
    seed = 42,
    minRadiusFactor = 0.08,
    scaleVariance = 0,
  } = {},
) {
  const n = Math.max(2, Math.floor(count));
  const rand = mulberry32(seed);
  const positions = [];
  const variance = Math.max(0, Math.min(1, scaleVariance));

  // Tight at low counts; expand hard with count so 1000 fills a wide disk.
  // n=2 → ~1×, n≈50 → ~3.4×, n=1000 → ~18×.
  const spreadScale = 1 + Math.pow(Math.max(n - 2, 0), 0.62) * 0.28;
  const maxRadius = radius * spreadScale;
  const minRadius = maxRadius * minRadiusFactor;

  const nextScale = () => {
    if (variance <= 0) return 1;
    return 1 + (rand() * 2 - 1) * variance;
  };

  if (n === 2) {
    const side = radius * 0.72;
    positions.push({ x: -side, y, z: 0, scale: nextScale() });
    positions.push({ x: side, y, z: 0, scale: nextScale() });
    return positions;
  }

  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const diskR = minRadius + (maxRadius - minRadius) * Math.sqrt(t);
    const angle = i * GOLDEN_ANGLE + (rand() - 0.5) * 0.55;
    const rJitter = diskR * (0.82 + rand() * 0.36);

    positions.push({
      x: Math.sin(angle) * rJitter,
      y,
      z: Math.cos(angle) * rJitter,
      scale: nextScale(),
    });
  }

  return positions;
}
