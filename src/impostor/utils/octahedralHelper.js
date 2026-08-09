import * as THREE from "three";

export const OCT_TYPE = {
  HEMI: 0,
  FULL: 1,
};

function createGrid(xCells = 6, yCells = 6, width = 1, height = 1, useCenter = true) {
  const xInc = width / xCells;
  const yInc = height / yCells;
  let ox = 0;
  let oz = 0;

  if (useCenter) {
    ox = -width * 0.5;
    oz = -height * 0.5;
  }

  const out = [];
  for (let yi = 0; yi <= yCells; yi++) {
    const z = yi * yInc;
    for (let xi = 0; xi <= xCells; xi++) {
      const x = xi * xInc;
      out.push(x + ox, 0, z + oz);
    }
  }

  return out;
}

function toSphereNormal(ary) {
  const rtn = new Array(ary.length);

  for (let i = 0; i < ary.length; i += 3) {
    const x = ary[i + 0];
    const y = ary[i + 1];
    const z = ary[i + 2];

    const m = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
    rtn[i + 0] = x / m;
    rtn[i + 1] = y / m;
    rtn[i + 2] = z / m;
  }

  return rtn;
}

function octPlaneIndices(isFull = 0, xCells = 6, yCells = 6) {
  const out = [];
  const xLen = xCells + 1;
  const xHalf = Math.floor(xCells * 0.5);
  const yHalf = Math.floor(yCells * 0.5);

  for (let y = 0; y < yCells; y++) {
    const r0 = xLen * y;
    const r1 = xLen * (y + 1);

    for (let x = 0; x < xCells; x++) {
      const a = r0 + x;
      const b = r1 + x;
      const c = r1 + x + 1;
      const d = r0 + x + 1;
      const alt = (Math.floor(x / xHalf) + Math.floor(y / yHalf)) % 2;

      if (alt === isFull) {
        out.push(a, b, c, c, d, a);
      } else {
        out.push(d, a, b, b, c, d);
      }
    }
  }

  return out;
}

function octHemi(ary) {
  const radius = 0.5;

  for (let i = 0; i < ary.length; i += 3) {
    const ox = ary[i + 0] + 0.5;
    const oy = ary[i + 2] + 0.5;

    let x = ox - oy;
    let z = -1 + ox + oy;
    let y = 1 - Math.abs(x) - Math.abs(z);

    const m = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
    ary[i + 0] = (x / m) * radius;
    ary[i + 1] = (y / m) * radius;
    ary[i + 2] = (z / m) * radius;
  }
}

function octFull(ary) {
  const radius = 0.5;

  for (let i = 0; i < ary.length; i += 3) {
    const u = ary[i + 0] * 2.0;
    const v = ary[i + 2] * 2.0;

    let x = u;
    let z = v;
    let y = 1 - Math.abs(x) - Math.abs(z);

    if (y < 0) {
      const ox = x;
      const oz = z;
      x = Math.sign(ox) * (1.0 - Math.abs(oz));
      z = Math.sign(oz) * (1.0 - Math.abs(ox));
      y = 1 - Math.abs(x) - Math.abs(z);
    }

    const m = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
    ary[i + 0] = (x / m) * radius;
    ary[i + 1] = (y / m) * radius;
    ary[i + 2] = (z / m) * radius;
  }
}

export function buildOctahedralMesh(octType, gridSize) {
  const pntPlane = createGrid(gridSize, gridSize);
  const indices = octPlaneIndices(octType, gridSize, gridSize);

  const pntOct = pntPlane.slice();
  switch (octType) {
    case OCT_TYPE.HEMI:
      octHemi(pntOct);
      break;
    case OCT_TYPE.FULL:
      octFull(pntOct);
      break;
    default:
      throw new Error(`Unknown octahedron type: ${octType}`);
  }

  const normals = toSphereNormal(pntOct);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(pntOct), 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(normals), 3),
  );
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return {
    pntPlane,
    pntOct,
    indices,
    geometry,
  };
}

export function flatIndexToCoords(flatIndex, gridSize) {
  const stride = gridSize + 1;
  const row = Math.floor(flatIndex / stride);
  const col = flatIndex - row * stride;
  return { row, col };
}

export function coordsToFlatIndex(row, col, gridSize) {
  return row * (gridSize + 1) + col;
}

export function getViewDirections(octahedralData) {
  const { pntOct } = octahedralData;
  const directions = [];
  const stride = Math.sqrt(pntOct.length / 3);

  for (let i = 0; i < pntOct.length; i += 3) {
    directions.push({
      index: i / 3,
      x: pntOct[i],
      y: pntOct[i + 1],
      z: pntOct[i + 2],
    });
  }

  return { directions, vertexCount: stride };
}
