# Octahedral Impostor Demo

Visual WebGPU demo of **octahedral impostors** — bake a mesh into a direction atlas, then draw cheap billboard cards that pick and blend the right atlas cells as the camera moves.

Built with React Three Fiber, Three.js WebGPU + TSL (`MeshBasicNodeMaterial`), and a dynamic atlas baker inspired by the [Shaderbits octahedral impostors](https://shaderbits.com/blog/octahedral-impostors) approach (bake path adapted from planpoint-webgpu).

Live demo: https://webgpu-octahedral-impostor.vercel.app/

> This repo is a **runnable demo**, not an npm package. The reusable pieces live under `src/impostor/` — copy them into your project or import from source.

## Requirements

- Node.js 18+
- A browser with **WebGPU** enabled (Chrome / Edge recommended)

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

```bash
npm run build    # production build → dist/
npm run preview  # preview the build
```

## What you see

| Panel | Role |
| --- | --- |
| **Atlas (top-left)** | Baked hemisphere grid (`8` / `16` / `32` cells, selectable) with live highlight of the active triangle and barycentric weights |
| **Capture rig (bottom-left)** | Hemisphere wireframe + camera cones around the source mesh |
| **Main view (right)** | Real GLB in the center + optional radial field of impostor / billboard cards |

### Demo controls

- **Model** — switch between coconut tree and low-poly fox (rebakes the atlas)
- **Impostor** — view-dependent atlas sampling (octahedral)
- **Billboard** — same layout, one fixed horizon frame (look from above to see the classic “lying forest”)
- **Wireframe** — shows the flat quads
- **Impostors** — field count (2–1000); scale variance is fixed in the demo
- **Grid** — atlas resolution `8` / `16` / `32` (atlas texture stays `4096`)
- **Stats** — triangles, draw calls, model tris, cost if drawn as mesh, tris avoided

## How it works (short)

1. **Bake** — `useOctahedralAtlas` renders the source mesh from each hemisphere direction into an atlas texture (temporary WebGL renderer for pixel readback).
2. **Sample** — each frame, view direction → octahedral UV → grid cell → three neighboring frames + barycentric weights (`sampleOctahedralDirection`).
3. **Draw** — TSL material blends those three atlas cells on a camera-facing plane (`createImpostorAtlasMaterial` / `OctahedralImpostor` / `ImpostorField`).

Unlit sources (e.g. tree `MeshBasic`) bake as albedo. PBR sources (e.g. fox `MeshStandard`) bake with scene-like lights so the impostor matches the lit mesh more closely. Tone-mapping is applied at runtime (ACES), not during bake.

## Using the octahedral pieces in your app

Core files (copy or import from this repo):

| Path | Purpose |
| --- | --- |
| `src/impostor/hooks/useOctahedralAtlas.js` | Bake atlas from a mesh |
| `src/impostor/OctahedralImpostor.jsx` | Single impostor card (standalone) |
| `src/impostor/utils/createImpostorAtlasMaterial.js` | TSL atlas blend material |
| `src/impostor/utils/octahedralHelper.js` | `OCT_TYPE`, `buildOctahedralMesh` |
| `src/impostor/utils/octahedralImpostorMath.js` | Sampling cache + direction → indices/weights |
| `src/impostor/CoconutTreeMesh.js` | `useImpostorSourceMesh` — load/normalize GLB |

`ImpostorField.jsx` is the demo’s instanced field and currently reads `useImpostorDemo()` context. For a single reusable card, start with `OctahedralImpostor`.

### Minimal usage sketch

Needs a WebGPU R3F canvas (`three/webgpu` renderer), the source mesh inside the Canvas tree, and a shared sample ref updated from the camera.

```jsx
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useOctahedralAtlas } from "./impostor/hooks/useOctahedralAtlas";
import { useImpostorSourceMesh } from "./impostor/CoconutTreeMesh";
import { getSamplingCache, sampleOctahedralDirection } from "./impostor/utils/octahedralImpostorMath";
import { OCT_TYPE } from "./impostor/utils/octahedralHelper";
import OctahedralImpostor from "./impostor/OctahedralImpostor";
import * as THREE from "three/webgpu";

const GRID = 8;
const ATLAS = 2048;

function ImpostorExample() {
  const { meshGroup, center, height } = useImpostorSourceMesh("/coconut_tree.glb");
  const activeSampleRef = useRef(null);
  const indicesTarget = useRef(new THREE.Vector3());
  const weightsTarget = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const { atlas } = useOctahedralAtlas({
    mesh: meshGroup,
    gridSize: GRID,
    atlasSize: ATLAS,
    octType: OCT_TYPE.HEMI,
  });

  const samplingCache = getSamplingCache(OCT_TYPE.HEMI, GRID);
  const faceCenter = new THREE.Vector3(center.x, height * 0.5, center.z);

  useFrame(() => {
    if (!samplingCache || !atlas) return;
    const direction = camera.position.clone().sub(faceCenter).normalize();
    if (direction.y < 0.001) {
      direction.y = 0.001;
      direction.normalize();
    }
    activeSampleRef.current = sampleOctahedralDirection({
      direction,
      cache: samplingCache,
      indicesTarget: indicesTarget.current,
      weightsTarget: weightsTarget.current,
    });
  });

  return (
    <OctahedralImpostor
      atlasPayload={atlas}
      activeSampleRef={activeSampleRef}
      faceCenter={faceCenter}
      gridSize={GRID}
      position={[0, height * 0.5, 0]}
      geometryArgs={[2, 2]}
    />
  );
}
```

### `useOctahedralAtlas` options

| Option | Default | Notes |
| --- | --- | --- |
| `mesh` | `null` | Root `Object3D` to bake (must set `userData.__impostorSourceId` for caching — `useImpostorSourceMesh` does this) |
| `gridSize` | `16` | Demo offers `8` / `16` / `32` |
| `atlasSize` | `2048` | Demo uses `4096` |
| `octType` | `OCT_TYPE.HEMI` | `HEMI` (0) or `FULL` (1) |
| `enabled` | `true` | |

Returns `{ atlas, error, isGenerating, octahedralData }`.

`atlas` shape: `{ texture, litBake, gridSize, octType, octahedralData }`.

### `OctahedralImpostor` props

| Prop | Default | Notes |
| --- | --- | --- |
| `atlasPayload` | `null` | From `useOctahedralAtlas` |
| `activeSampleRef` | `null` | `{ indices, weights }` each frame |
| `faceCenter` | `null` | Sampling / facing origin (prefer subject center, not card position) |
| `position` / `scale` | `[0,0,0]` / `[1,1,1]` | |
| `gridSize` | `8` | Must match bake |
| `geometryArgs` | `[2, 2]` | `PlaneGeometry` size |
| `alphaTest` | `0.25` | Cutout |
| `wireframe` | `false` | |
| `visible` | `true` | |

### Tips

- Prefer **hemi** grids for ground props (trees, characters standing on a plane).
- Higher `gridSize` / `atlasSize` = sharper angles, slower bake and more VRAM.
- Put GLBs in `public/` and pass absolute paths (`/my_model.glb`).
- Sanitize opaque GLTF materials that ship as alpha-blend (`sanitizeSourceMaterial` in `CoconutTreeMesh.js`).
- Bake runs once per cache key; changing model / grid / atlas size triggers a rebake.

## Project layout

```
src/
  app/                 Demo UI (overlay, info panel, CSS)
  canvas/              WebGPU R3F canvas + renderer factory
  scenes/              Three-panel demo scene + context
  impostor/            Atlas bake, sampling, materials, field, debug views
  impostor/hooks/      useOctahedralAtlas
  impostor/utils/      Math, TSL material, radial layout
  impostor/views/      Atlas / capture-rig / main comparison panels
public/
  coconut_tree.glb
  low_poly_fox.glb
  hdri/studio_small_09_1k.hdr
```

## Stack

- Vite + React 19
- `@react-three/fiber` + `@react-three/drei`
- Three.js WebGPU + TSL
- Atlas bake: temporary WebGL renderer for `readPixels`

## Reference

- [Octahedral Impostors — Shaderbits](https://shaderbits.com/blog/octahedral-impostors)

## License

MIT © Anderson Mancini
