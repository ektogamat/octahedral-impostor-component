# Octahedral Impostor Demo

Visual WebGPU demo explaining how **octahedral impostors** work in practice.

Built with React Three Fiber, Three.js TSL (`MeshStandardNodeMaterial`), and a dynamic atlas baker ported from the planpoint-webgpu implementation.

## What you see

- **Atlas (top-left)** — baked 6×6 hemisphere grid with live highlight of the active triangle and vertex weights
- **Capture rig (bottom-left)** — hemisphere wireframe + camera cones around the source mesh
- **Main view (right)** — real `coconut_tree.glb` in the center, with optional impostor billboards on each side

Use **Show Impostors** and **Wireframe** to demonstrate that the side trees are flat impostor quads sampling the atlas.

## Run locally

```bash
npm install
npm run dev
```

Requires a browser with WebGPU support.

## Reference

- [Octahedral Impostors — Shaderbits](https://shaderbits.com/blog/octahedral-impostors)

## Stack

- Vite + React 19
- `@react-three/fiber` + `@react-three/drei`
- Three.js WebGPU + TSL
- Atlas bake uses a temporary WebGL renderer for pixel readback
