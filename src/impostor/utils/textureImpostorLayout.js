function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a CPU sampler that maps world XZ → grayscale density (0–1).
 * Texture white = high density; black = empty.
 */
export function createTextureSampler(texture, areaSize, origin = [0, 0, 0]) {
  const img = texture?.image;
  if (!img) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const widthPx = img.width || img.videoWidth || 1;
  const heightPx = img.height || img.videoHeight || 1;
  canvas.width = widthPx;
  canvas.height = heightPx;
  ctx.drawImage(img, 0, 0, widthPx, heightPx);

  const { data } = ctx.getImageData(0, 0, widthPx, heightPx);
  const [areaW, areaD] = areaSize;
  const originX = origin[0] ?? 0;
  const originZ = origin[2] ?? 0;

  return (worldX, worldZ) => {
    const u = (worldX - originX) / areaW + 0.5;
    const v = (worldZ - originZ) / areaD + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;

    const pixelX = Math.min(widthPx - 1, Math.max(0, Math.floor(u * (widthPx - 1))));
    // Image Y grows downward; flip so +Z maps toward the top of the map.
    const pixelY = Math.min(
      heightPx - 1,
      Math.max(0, Math.floor((1 - v) * (heightPx - 1))),
    );
    return data[(pixelY * widthPx + pixelX) * 4] / 255;
  };
}

/**
 * Rejection-sample instance positions from a grayscale density map.
 * Returns { x, y, z, scale }[] — same shape as buildRadialLayout.
 *
 * intensity multiplies density before the roll (keep near 1 — high values
 * flatten soft vignettes into a hard rectangle).
 * contrast > 1 biases placement toward bright texels so the outer smoke
 * falloff stays soft instead of filling the whole spawn square.
 */
export function buildTextureLayout(
  count,
  {
    sampler,
    areaSize = [10, 10],
    origin = [0, 0, 0],
    y = 0,
    seed = 42,
    scaleVariance = 0,
    intensity = 1,
    contrast = 1,
    threshold = 0,
    avoidRadius = 0,
    maxAttemptsFactor = 32,
  } = {},
) {
  const n = Math.max(0, Math.floor(count));
  if (n <= 0 || !sampler) return [];

  const [areaW, areaD] = areaSize;
  const originX = origin[0] ?? 0;
  const originZ = origin[2] ?? 0;
  const rand = mulberry32(seed);
  const variance = Math.max(0, Math.min(1, scaleVariance));
  const power = Math.max(0.01, contrast);
  const gain = Math.max(0, intensity);
  const positions = [];
  const maxAttempts = Math.max(n * maxAttemptsFactor, n);

  const nextScale = () => {
    if (variance <= 0) return 1;
    return 1 + (rand() * 2 - 1) * variance;
  };

  let attempts = 0;
  while (positions.length < n && attempts < maxAttempts) {
    attempts += 1;

    const x = originX + (rand() - 0.5) * areaW;
    const z = originZ + (rand() - 0.5) * areaD;

    if (avoidRadius > 0 && Math.hypot(x - originX, z - originZ) < avoidRadius) {
      continue;
    }

    const density = sampler(x, z);
    if (density < threshold) continue;

    // Soft vignette stays probabilistic: do not hard-cap gain into a filled square.
    const probability = Math.min(1, Math.pow(density, power) * gain);
    if (rand() > probability) continue;

    positions.push({ x, y, z, scale: nextScale() });
  }

  return positions;
}
