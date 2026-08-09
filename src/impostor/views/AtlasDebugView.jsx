import { useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useFrame } from "@react-three/fiber";
import { useImpostorDemo, DEMO_GRID_SIZE } from "../impostorDemoStore";

function buildGridPositions(stride) {
  const positions = [];

  for (let i = 0; i <= stride; i++) {
    const t = i / stride;
    // Row 0 is at the TOP of the atlas plane (matches canvas putImageData).
    positions.push(0, 1 - t, 0.002, 1, 1 - t, 0.002);
    positions.push(t, 0, 0.002, t, 1, 0.002);
  }

  return positions;
}

function getDominantFlatIndex(sample, stride) {
  const { indices, weights } = sample;
  if (Array.isArray(indices) && Array.isArray(weights) && indices.length > 0) {
    let best = 0;
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] > weights[best]) best = i;
    }
    return indices[best];
  }
  return Math.min(
    Math.max(sample.row, 0),
    stride - 1,
  ) *
    stride +
    Math.min(Math.max(sample.col, 0), stride - 1);
}

function cellRect(flatIndex, stride) {
  const vCol = flatIndex % stride;
  const vRow = Math.floor(flatIndex / stride);
  const cellW = 1 / stride;
  const cellH = 1 / stride;
  const x0 = vCol * cellW;
  const x1 = x0 + cellW;
  const yTop = 1 - vRow * cellH;
  const yBottom = yTop - cellH;
  return { x0, x1, yTop, yBottom, vCol, vRow };
}

function AtlasGridOverlay({ gridSize }) {
  const { activeSampleRef } = useImpostorDemo();
  const fillRef = useRef(null);
  const borderRef = useRef(null);
  const fillMatRef = useRef(null);
  const borderMatRef = useRef(null);
  const stride = gridSize + 1;

  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(buildGridPositions(stride), 3),
    );
    return geometry;
  }, [stride]);

  const borderGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(24), 3),
    );
    geometry.setDrawRange(0, 0);
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    const sample = activeSampleRef?.current;
    if (!sample || !fillRef.current) return;

    const flatIndex = getDominantFlatIndex(sample, stride);
    const { x0, x1, yTop, yBottom } = cellRect(flatIndex, stride);
    const cx = (x0 + x1) * 0.5;
    const cy = (yTop + yBottom) * 0.5;
    const w = x1 - x0;
    const h = yTop - yBottom;

    fillRef.current.position.set(cx, cy, 0.003);
    fillRef.current.scale.set(w * 0.98, h * 0.98, 1);
    fillRef.current.visible = true;

    const z = 0.005;
    const inset = 0.004;
    const bx0 = x0 + inset;
    const bx1 = x1 - inset;
    const by0 = yBottom + inset;
    const by1 = yTop - inset;
    const border = new Float32Array([
      bx0,
      by1,
      z,
      bx1,
      by1,
      z,
      bx1,
      by1,
      z,
      bx1,
      by0,
      z,
      bx1,
      by0,
      z,
      bx0,
      by0,
      z,
      bx0,
      by0,
      z,
      bx0,
      by1,
      z,
    ]);
    const attr = borderGeometry.getAttribute("position");
    attr.array.set(border);
    attr.needsUpdate = true;
    borderGeometry.setDrawRange(0, 8);

    const pulse = 0.55 + Math.sin(clock.elapsedTime * 5) * 0.25;
    if (fillMatRef.current) fillMatRef.current.opacity = pulse * 0.45;
    if (borderMatRef.current) borderMatRef.current.opacity = 0.85 + pulse * 0.15;
  });

  return (
    <group position={[0, 0, 0.01]}>
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.28} />
      </lineSegments>

      <mesh ref={fillRef} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={fillMatRef}
          color="#ffcc00"
          transparent
          opacity={0.35}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments ref={borderRef} geometry={borderGeometry}>
        <lineBasicMaterial
          ref={borderMatRef}
          color="#ffe566"
          transparent
          opacity={1}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

export default function AtlasDebugView() {
  const { atlas } = useImpostorDemo();
  const gridSize = atlas?.gridSize ?? DEMO_GRID_SIZE;

  if (!atlas?.texture) {
    return (
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
    );
  }

  return (
    <group position={[0.5, 0.5, 0]}>
      <mesh>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={atlas.texture} toneMapped={false} />
      </mesh>
      <group position={[-0.5, -0.5, 0]}>
        <AtlasGridOverlay gridSize={gridSize} />
      </group>
    </group>
  );
}
