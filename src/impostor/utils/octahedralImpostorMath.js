import { buildOctahedralMesh, OCT_TYPE } from "./octahedralHelper";

const samplingCache = new Map();

/** Clear cached triangle tables when grid packing changes. */
export function clearSamplingCache() {
  samplingCache.clear();
}

/**
 * Maps a view direction to atlas UV.
 * HEMI must invert octHemi() from octahedralHelper:
 *   x = ox - oy, z = ox + oy - 1  =>  ox = (x+z+1)/2, oy = (-x+z+1)/2
 * The previous full-oct encoder (u=(x+1)/2, v=(z+1)/2) only agrees near the
 * zenith and diverges badly on the horizon — causing impostor wobble.
 */
export function encodeDirectionToOctUV(direction, octType = OCT_TYPE.HEMI) {
  const { x, y, z } = direction;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);
  const invSum = 1 / (absX + absY + absZ + 1e-9);

  let nx = x * invSum;
  let ny = y * invSum;
  let nz = z * invSum;

  if (octType === OCT_TYPE.HEMI) {
    if (ny < 0) {
      const horiz = Math.abs(nx) + Math.abs(nz) + 1e-9;
      nx /= horiz;
      nz /= horiz;
      ny = 0;
    }
    return {
      u: (nx + nz + 1) * 0.5,
      v: (-nx + nz + 1) * 0.5,
    };
  }

  if (ny < 0) {
    const signX = nx >= 0 ? 1 : -1;
    const signZ = nz >= 0 ? 1 : -1;
    const newX = (1 - Math.abs(nz)) * signX;
    const newZ = (1 - Math.abs(nx)) * signZ;
    nx = newX;
    nz = newZ;
  }

  return {
    u: nx * 0.5 + 0.5,
    v: nz * 0.5 + 0.5,
  };
}

function computeBarycentric2D(px, py, triangleUV, target) {
  const ax = triangleUV[0][0];
  const ay = triangleUV[0][1];
  const bx = triangleUV[1][0];
  const by = triangleUV[1][1];
  const cx = triangleUV[2][0];
  const cy = triangleUV[2][1];

  const v0x = bx - ax;
  const v0y = by - ay;
  const v1x = cx - ax;
  const v1y = cy - ay;
  const v2x = px - ax;
  const v2y = py - ay;

  const denom = v0x * v1y - v1x * v0y;

  if (Math.abs(denom) < 1e-9) {
    target.set(1 / 3, 1 / 3, 1 / 3);
    return target;
  }

  const invDenom = 1 / denom;
  const v = (v2x * v1y - v1x * v2y) * invDenom;
  const w = (v0x * v2y - v2x * v0y) * invDenom;
  const u = 1 - v - w;

  const clampedU = Math.max(u, 0);
  const clampedV = Math.max(v, 0);
  const clampedW = Math.max(w, 0);
  const sum = clampedU + clampedV + clampedW;

  if (sum <= 0) {
    target.set(1 / 3, 1 / 3, 1 / 3);
  } else {
    target.set(clampedU / sum, clampedV / sum, clampedW / sum);
  }

  return target;
}

function buildSamplingCache(octType, gridSize) {
  const key = `${octType}_${gridSize}`;
  if (samplingCache.has(key)) {
    return samplingCache.get(key);
  }

  const octahedralData = buildOctahedralMesh(octType, gridSize);
  const geometry = octahedralData.geometry;
  const indexAttr = geometry.getIndex();

  if (!indexAttr) {
    samplingCache.set(key, null);
    return null;
  }

  const indexArray = indexAttr.array;
  const stride = gridSize + 1;
  const cells = new Array(gridSize * gridSize);
  let cursor = 0;

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const tri1 = [
        indexArray[cursor],
        indexArray[cursor + 1],
        indexArray[cursor + 2],
      ];
      const tri2 = [
        indexArray[cursor + 3],
        indexArray[cursor + 4],
        indexArray[cursor + 5],
      ];
      cursor += 6;

      const isBackslash =
        tri1[1] - tri1[0] === stride && tri1[2] - tri1[1] === 1;

      const triangles = isBackslash
        ? [
            {
              indices: tri1,
              uv: [
                [0, 0],
                [0, 1],
                [1, 1],
              ],
            },
            {
              indices: tri2,
              uv: [
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            },
          ]
        : [
            {
              indices: tri1,
              uv: [
                [1, 0],
                [0, 0],
                [0, 1],
              ],
            },
            {
              indices: tri2,
              uv: [
                [0, 1],
                [1, 1],
                [1, 0],
              ],
            },
          ];

      cells[row * gridSize + col] = {
        isBackslash,
        triangles,
      };
    }
  }

  geometry.dispose();

  const cache = { gridSize, octType, cells };
  samplingCache.set(key, cache);
  return cache;
}

export function getSamplingCache(octType, gridSize) {
  return buildSamplingCache(octType, gridSize);
}

export function sampleOctahedralDirection({
  direction,
  cache,
  indicesTarget,
  weightsTarget,
}) {
  if (!cache) return null;

  const uv = encodeDirectionToOctUV(direction, cache.octType);
  const gridSize = cache.gridSize;

  const scaledU = uv.u * gridSize;
  const scaledV = uv.v * gridSize;

  const col = Math.min(Math.max(Math.floor(scaledU), 0), gridSize - 1);
  const row = Math.min(Math.max(Math.floor(scaledV), 0), gridSize - 1);

  const localU = Math.min(Math.max(scaledU - col, 0), 0.999999);
  const localV = Math.min(Math.max(scaledV - row, 0), 0.999999);

  const cell = cache.cells[row * gridSize + col];
  if (!cell) return null;

  const triangle =
    cell.isBackslash && localU > localV
      ? cell.triangles[1]
      : !cell.isBackslash && localU + localV > 1
        ? cell.triangles[1]
        : cell.triangles[0];

  computeBarycentric2D(localU, localV, triangle.uv, weightsTarget);

  indicesTarget.set(
    triangle.indices[0],
    triangle.indices[1],
    triangle.indices[2],
  );

  return {
    uv,
    col,
    row,
    localU,
    localV,
    indices: [
      triangle.indices[0],
      triangle.indices[1],
      triangle.indices[2],
    ],
    weights: [weightsTarget.x, weightsTarget.y, weightsTarget.z],
    isBackslash: cell.isBackslash,
  };
}
